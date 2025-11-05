import { MyMessage } from "./api/chat/route";
import { searchWithEmbeddings } from "./search";
import { messageHistoryToQuery, messageToText } from "./utils";

export const searchMessages = async (opts: {
  recentMessages: MyMessage[];
  olderMessages: MyMessage[];
}) => {
  if (opts.olderMessages.length === 0) {
    return [];
  }

  const query = messageHistoryToQuery(opts.recentMessages);

  const embeddingsRanking = await searchWithEmbeddings(
    query,
    opts.olderMessages,
    messageToText
  );

  return embeddingsRanking;
};
