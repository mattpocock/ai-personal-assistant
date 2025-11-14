import { searchMemories } from "@/app/memory-search";
import { searchMessages } from "@/app/message-search";
import { reflectOnChat } from "@/app/reflect-on-chat";
import { searchForRelatedChats } from "@/app/search-for-related-chats";
import {
  appendToChatMessages,
  createChat,
  getChat,
  updateChatTitle,
} from "@/lib/persistence-layer";
import { google } from "@ai-sdk/google";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  InferUITools,
  safeValidateUIMessages,
  stepCountIs,
  UIMessage,
} from "ai";
import { createAgent, getTools } from "./agent";
import { extractAndUpdateMemories } from "./extract-memories";
import { generateTitleForChat } from "./generate-title";
import {
  annotateMessageHistory as annotateHITLMessageHistory,
  executeHITLDecisions,
  findDecisionsToProcess,
  ToolApprovalDataParts,
} from "./hitl";
import { getMCPTools } from "./mcp";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const MEMORIES_TO_USE = 3;
const MESSAGE_HISTORY_LENGTH = 10;
const OLD_MESSAGES_TO_USE = 10;

export type MyMessage = UIMessage<
  never,
  {
    "frontend-action": "refresh-sidebar";
    "app-tag": { appId: string };
  } & ToolApprovalDataParts,
  InferUITools<ReturnType<typeof getTools>>
>;

export async function POST(req: Request) {
  const body: {
    message: MyMessage;
    id: string;
  } = await req.json();

  const chatId = body.id;

  let chat = await getChat(chatId);

  const recentMessages = [...(chat?.messages ?? []), body.message].slice(
    -MESSAGE_HISTORY_LENGTH
  );

  const olderMessages = chat?.messages.slice(0, -MESSAGE_HISTORY_LENGTH);

  const validatedMessagesResult = await safeValidateUIMessages<MyMessage>({
    messages: recentMessages,
  });

  if (!validatedMessagesResult.success) {
    return new Response(validatedMessagesResult.error.message, { status: 400 });
  }

  const messages = validatedMessagesResult.data;

  const mostRecentMessage = messages[messages.length - 1];

  if (!mostRecentMessage) {
    return new Response("No messages provided", { status: 400 });
  }

  if (mostRecentMessage.role !== "user") {
    return new Response("Last message must be from the user", {
      status: 400,
    });
  }

  const mostRecentAssistantMessage = messages.findLast(
    (message) => message.role === "assistant"
  );

  const hitlResult = findDecisionsToProcess({
    mostRecentUserMessage: mostRecentMessage,
    mostRecentAssistantMessage,
  });

  if ("status" in hitlResult) {
    return new Response(hitlResult.message, {
      status: hitlResult.status,
    });
  }

  const allMemories = await searchMemories({ messages });

  const memories = allMemories.slice(0, MEMORIES_TO_USE);

  const oldMessagesToUse = await searchMessages({
    recentMessages: messages,
    olderMessages: olderMessages ?? [],
  }).then((results) =>
    results
      .slice(0, OLD_MESSAGES_TO_USE)
      .sort((a, b) => b.score - a.score)
      .map((result) => result.item)
  );

  console.log("oldMessagesToUse", oldMessagesToUse.length);

  const messageHistoryForLLM = [...oldMessagesToUse, ...messages];

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      let generateTitlePromise: Promise<void> | undefined = undefined;

      if (!chat) {
        const newChat = await createChat({
          id: chatId,
          title: "Generating title...",
          initialMessages: messages,
        });
        chat = newChat;

        writer.write({
          type: "data-frontend-action",
          data: "refresh-sidebar",
          transient: true,
        });

        generateTitlePromise = generateTitleForChat(messages)
          .then((title) => {
            return updateChatTitle(chatId, title);
          })
          .then(() => {
            writer.write({
              type: "data-frontend-action",
              data: "refresh-sidebar",
              transient: true,
            });
          });
      } else {
        await appendToChatMessages(chatId, [mostRecentMessage]);
      }

      const relatedChats = await searchForRelatedChats(chatId, messages);

      const mcpTools = await getMCPTools();

      const messagesWithToolResults = await executeHITLDecisions({
        decisions: hitlResult,
        mcpTools,
        writer,
        messages: messageHistoryForLLM,
      });

      const agent = createAgent({
        memories: memories.map((memory) => memory.item),
        relatedChats: relatedChats.map((chat) => chat.item),
        messages: messagesWithToolResults,
        model: google("gemini-2.5-flash"),
        stopWhen: stepCountIs(10),
        mcpTools,
        writer,
      });

      const result = agent.stream({
        messages: annotateHITLMessageHistory(messagesWithToolResults),
      });

      writer.merge(
        result.toUIMessageStream({
          sendSources: true,
          sendReasoning: true,
        })
      );

      await generateTitlePromise;
    },
    generateId: () => crypto.randomUUID(),
    onFinish: async ({ responseMessage }) => {
      await appendToChatMessages(chatId, [responseMessage]);
      await extractAndUpdateMemories({
        messages: [...messages, responseMessage],
        memories: memories.map((memory) => memory.item),
      });
      await reflectOnChat(chatId);
    },
  });

  // send sources and reasoning back to the client
  return createUIMessageStreamResponse({
    stream,
  });
}
