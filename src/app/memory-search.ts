import { DB, loadMemories } from "@/lib/persistence-layer";
import { MyMessage } from "./api/chat/route";
import { searchWithEmbeddings } from "./search";
import { messageHistoryToQuery } from "./utils";

export const memoryToText = (memory: DB.Memory) =>
  `${memory.title}: ${memory.content}`;

export const searchMemoriesInner = async (
  messageHistory: MyMessage[],
  memories: DB.Memory[]
) => {
  const query = messageHistoryToQuery(messageHistory);

  const embeddingsRanking = await searchWithEmbeddings(
    query,
    memories,
    memoryToText
  );

  return embeddingsRanking;
};

export const searchMemories = async (opts: { messages: MyMessage[] }) => {
  const memories = await loadMemories();

  return searchMemoriesInner(opts.messages, memories);
};
