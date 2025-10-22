import { google } from "@ai-sdk/google";
import { convertToModelMessages, generateText, UIMessage } from "ai";

export async function generateTitleForChat(
  messages: UIMessage[]
): Promise<string> {
  const result = await generateText({
    model: google("gemini-2.5-flash-lite"),
    messages: convertToModelMessages(messages),
    system: `
      You are a helpful assistant that can generate titles for conversations. The title will be used for organizing conversations in a chat application.
      
      Find the most concise title that captures the essence of the conversation.
      Titles should be at most 30 characters.
      Titles should be formatted in sentence case, with capital letters at the start of each word. Do not provide a period at the end.
      Use no punctuation or emojis.
      If there are acronyms used in the conversation, use them in the title.
      Use formal language in the title, like 'troubleshooting', 'discussion', 'support', 'options', 'research', etc.
      Since all items in the list are conversations, do not use the word 'chat', 'conversation' or 'discussion' in the title - it's implied by the UI.
      
      Generate a title for the conversation.
      Return only the title.
    `,
  });

  return result.text;
}
