import { MyMessage } from "./api/chat/route";

export const messagePartsToText = (parts: MyMessage["parts"]) => {
  return parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
    })
    .filter((s) => typeof s === "string")
    .join("\n");
};

export const messageToText = (message: MyMessage) => {
  return `${message.role}: ${messagePartsToText(message.parts)}`;
};

/**
 * Takes the message history and returns a query that can be
 * used as a semantic search query.
 *
 * Includes the most recent message _twice_ to overweight
 * it in the search results.
 */
export const messageHistoryToQuery = (messages: MyMessage[]) => {
  const mostRecentMessage = messages[messages.length - 1];

  const query = [...messages, mostRecentMessage].map(messageToText).join("\n");

  return query;
};
