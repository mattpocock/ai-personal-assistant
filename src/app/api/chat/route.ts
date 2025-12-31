import {
  appendToChatMessages,
  createChat,
  getChat,
  updateChatTitle,
} from "@/lib/persistence-layer";
import { searchMemories } from "@/app/memory-search";
import { extractAndUpdateMemories } from "./extract-memories";
import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  UIMessage,
  stepCountIs,
  InferUITools,
  ToolSet,
} from "ai";
import { filterToolsByApps, parseAppIdsFromMessage } from "./apps-config";
import { generateTitleForChat } from "./generate-title";
import { searchMessages } from "@/app/message-search";
import { searchForRelatedChats } from "@/app/search-for-related-chats";
import { reflectOnChat } from "@/app/reflect-on-chat";
import { createAgent, getTools } from "./agent";
import { getMCPTools } from "./mcp";
import {
  annotateMessageHistory as annotateHITLMessageHistory,
  executeHITLDecisions,
  findDecisionsToProcess,
  ToolApprovalDataParts,
} from "./hitl";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const MEMORIES_TO_USE = 5;
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

  const allMemories = await searchMemories({ messages });
  const memories = allMemories.slice(0, MEMORIES_TO_USE);

  const oldMessagesToUse = await searchMessages({
    recentMessages: messages,
    olderMessages: olderMessages ?? [],
  }).then((results) =>
    results
      .slice(0, OLD_MESSAGES_TO_USE)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item)
  );
  console.log("oldMessagesToUse:", oldMessagesToUse);
  const messageHistoryforLLM = [...oldMessagesToUse, ...messages];

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

      const taggedAppIds = parseAppIdsFromMessage(body.message);

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

      const allMcpTools = await getMCPTools();
      // ADDED: Filter tools to only those matching tagged app IDs
      const mcpTools = filterToolsByApps(allMcpTools, taggedAppIds);

      const messagesWithToolResults = await executeHITLDecisions({
        decisions: hitlResult,
        mcpTools: allMcpTools,
        writer,
        messages: messageHistoryforLLM,
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
        messages: convertToModelMessages(messagesWithToolResults),
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
        memories: memories.map((m) => m.item),
      });
      await reflectOnChat(chatId);
    },
  });

  // send sources and reasoning back to the client
  return createUIMessageStreamResponse({
    stream,
  });
}
