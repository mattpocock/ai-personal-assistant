import { DB } from "@/lib/persistence-layer";
import { MyMessage } from "./api/chat/route";

export const messagePartsToText = (parts: MyMessage["parts"]): string => {
  return parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
    })
    .filter((s) => typeof s === "string")
    .join("\n");
};

export const messageToText = (message: MyMessage): string => {
  return `${message.role}: ${messagePartsToText(message.parts)}`;
};

export const messageHistoryToQuery = (messages: MyMessage[]): string => {
  const mostRecentMessage = messages[messages.length - 1];
  const query = [...messages, mostRecentMessage].map(messageToText).join("\n");
  return query;
};

export const chatToText = (chat: DB.Chat): string => {
  const frontmatter = [`Title: ${chat.title}`];

  // ADDED: Include LLM summary if it exists
  const summary = chat.llmSummary
    ? [
        `Summary: ${chat.llmSummary.summary}`,
        `What Worked Well: ${chat.llmSummary.whatWorkedWell}`,
        `What To Avoid: ${chat.llmSummary.whatToAvoid}`,
        `Tags: ${chat.llmSummary.tags.join(", ")}`,
      ]
    : [];

  // ADDED: Convert all messages to text format
  const messages = chat.messages.map(messageToText).join("\n");

  return [...frontmatter, ...summary, messages].join("\n");
};
