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
  InferUITools,
  safeValidateUIMessages,
  stepCountIs,
  streamText,
  UIMessage,
} from "ai";
import { generateTitleForChat } from "./generate-title";
import { searchTool } from "./search-tool";
import { filterEmailsTool } from "./filter-tool";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export type MyMessage = UIMessage<
  never,
  {
    "frontend-action": "refresh-sidebar";
  },
  InferUITools<ReturnType<typeof getTools>>
>;

const getTools = (messages: UIMessage[]) => ({
  search: searchTool(messages),
  filterEmails: filterEmailsTool,
});

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
        model: google("gemini-2.5-flash"),
        messages: convertToModelMessages(messages),
        system: `
<task-context>
You are an email assistant that helps users find and understand information from their emails.
</task-context>

<rules>
- You have TWO tools available: 'search' and 'filterEmails'
- Choose the appropriate tool based on the query type:

  USE 'filterEmails' when the user wants to:
  - Find emails from/to specific people (e.g., "emails from John", "emails to sarah@example.com")
  - Filter by date ranges (e.g., "emails before January 2024", "emails after last week")
  - Find emails containing exact text (e.g., "emails containing 'invoice'")
  - Any combination of precise filtering criteria

  USE 'search' when the user wants to:
  - Find information semantically (e.g., "emails about the project deadline")
  - Search by concepts or topics (e.g., "discussions about budget")
  - Find answers to questions (e.g., "what did John say about the meeting?")
  - Any query requiring understanding of meaning/context
  - Find people by name or description (e.g., "Mike's biggest client")

- NEVER answer from your training data - always use tools first
- If the first query doesn't find enough information, try different approaches or tools
- Only after using tools should you formulate your answer based on the results
</rules>

<the-ask>
Here is the user's question. Use the appropriate tool(s) first, then provide your answer based on what you find.
</the-ask>
        `,
        tools: getTools(messages),
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
