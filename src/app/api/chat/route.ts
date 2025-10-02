import {
  streamText,
  UIMessage,
  convertToModelMessages,
  safeValidateUIMessages,
} from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    model,
    webSearch,
  }: {
    messages: UIMessage[];
    model: string;
    webSearch: boolean;
  } = await req.json();

  const validatedMessagesResult = await safeValidateUIMessages({
    messages,
  });

  if (!validatedMessagesResult.success) {
    return new Response(validatedMessagesResult.error.message, { status: 400 });
  }

  const result = streamText({
    model: webSearch ? "perplexity/sonar" : model,
    messages: convertToModelMessages(validatedMessagesResult.data),
    system:
      "You are a helpful assistant that can answer questions and help with tasks",
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}
