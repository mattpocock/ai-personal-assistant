import {
  appendToChatMessages,
  createChat,
  DB,
  getChat,
  updateChatTitle,
} from "@/lib/persistence-layer";
import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  stepCountIs,
  streamText,
  UIMessage,
} from "ai";
import { generateTitleForChat } from "./generate-title";
import { searchTool } from "./search-tool";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export type MyMessage = UIMessage<
  never,
  {
    "frontend-action": "refresh-sidebar";
  }
>;

export async function POST(req: Request) {
  const body: {
    messages: UIMessage[];
    id: string;
  } = await req.json();

  const chatId = body.id;

  const validatedMessagesResult = await safeValidateUIMessages<MyMessage>({
    messages: body.messages,
  });

  if (!validatedMessagesResult.success) {
    return new Response(validatedMessagesResult.error.message, { status: 400 });
  }

  const messages = validatedMessagesResult.data;

  let chat = await getChat(chatId);
  const mostRecentMessage = messages[messages.length - 1];

  if (!mostRecentMessage) {
    return new Response("No messages provided", { status: 400 });
  }

  if (mostRecentMessage.role !== "user") {
    return new Response("Last message must be from the user", {
      status: 400,
    });
  }

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

      const result = streamText({
        model: google("gemini-2.5-flash-lite"),
        messages: convertToModelMessages(messages),
        system: `
<task-context>
You are an email assistant that helps users find and understand information from their emails.
</task-context>

<rules>
- You MUST use the search tool for ANY question about emails, people, amounts, dates, or specific information
- NEVER answer from your training data - always search the actual emails first
- If the first search doesn't find enough information, try different keywords or search queries
- Use both semantic (searchQuery) and keyword (keywords) search parameters together for best results
- Only after searching should you formulate your answer based on the search results
</rules>

<the-ask>
Here is the user's question. Search their emails first, then provide your answer based on what you find.
</the-ask>
        `,
        tools: {
          search: searchTool,
        },
        stopWhen: [stepCountIs(10)],
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
    },
  });

  // send sources and reasoning back to the client
  return createUIMessageStreamResponse({
    stream,
  });
}
