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
  safeValidateUIMessages,
  streamText,
  UIMessage,
} from "ai";
import { generateTitle } from "./generate-title";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const body: {
    messages: UIMessage[];
    id: string;
  } = await req.json();

  const chatId = body.id;

  const validatedMessagesResult = await safeValidateUIMessages({
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

  const result = streamText({
    model: anthropic("claude-3-5-haiku-latest"),
    messages: convertToModelMessages(messages),
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
    onFinish: async ({ responseMessage }) => {
      await appendToChatMessages(chatId, [responseMessage]);
      await generateTitlePromise;
    },
  });
}
