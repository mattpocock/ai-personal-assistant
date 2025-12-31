import { DB, loadMemories } from "@/lib/persistence-layer";
import { MyMessage } from "./api/chat/route";
import { messageHistoryToQuery } from "./utils";
import { searchWithEmbeddings } from "./search";

export const memoryToText = (memory: DB.Memory): string =>
  `${memory.title}: ${memory.content}`;

export const searchMemories = async (opts: { messages: MyMessage[] }) => {
  const memories = await loadMemories();
  const query = messageHistoryToQuery(opts.messages);

  const embeddingsRanking = await searchWithEmbeddings(
    query,
    memories,
    memoryToText
  );

  return embeddingsRanking;
};
