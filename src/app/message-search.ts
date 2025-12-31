import { MyMessage } from "./api/chat/route";
import { searchWithEmbeddings } from "./search";
import { messageHistoryToQuery, messageToText } from "./utils";

export const searchMessages = async (opts: {
  recentMessages: MyMessage[];
  olderMessages: MyMessage[];
}) => {
  const { recentMessages, olderMessages } = opts;
  if (olderMessages.length === 0) {
    return [];
  }

  const query = messageHistoryToQuery(recentMessages);

  const embeddingsRanking = await searchWithEmbeddings(
    query,
    olderMessages,
    messageToText
  );

  return embeddingsRanking;
};
