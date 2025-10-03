import {
  appendToChatMessages,
  createChat,
  DB,
  getChat,
  updateChatTitle,
} from "@/lib/persistence-layer";
import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  UIMessage,
} from "ai";
import { generateTitle } from "./generate-title";

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

  let generateTitlePromise: Promise<DB.Chat | null> | undefined = undefined;

  if (!chat) {
    const newChat = await createChat({
      id: chatId,
      title: "Generating title...",
      initialMessages: messages,
    });
    chat = newChat;

    generateTitlePromise = generateTitle(messages).then((title) => {
      return updateChatTitle(chatId, title);
    });
  } else {
    await appendToChatMessages(chatId, [mostRecentMessage]);
  }

  const stream = createUIMessageStream<MyMessage>({
    execute: async ({ writer }) => {
      const result = streamText({
        model: anthropic("claude-3-5-haiku-latest"),
        messages: convertToModelMessages(messages),
      });

      writer.merge(
        result.toUIMessageStream({
          sendSources: true,
          sendReasoning: true,
        })
      );

      // If we've generated a new chat, alert the frontend
      // that it should update the sidebar
      if (generateTitlePromise) {
        await generateTitlePromise;
        writer.write({
          type: "data-frontend-action",
          data: "refresh-sidebar",
          transient: true,
        });
      }
    },
    onFinish: async ({ responseMessage }) => {
      await appendToChatMessages(chatId, [responseMessage]);
    },
  });

  // send sources and reasoning back to the client
  return createUIMessageStreamResponse({
    stream,
  });
}
