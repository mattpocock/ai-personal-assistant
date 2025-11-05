import { DB, loadChats } from "@/lib/persistence-layer";
import { searchWithEmbeddings } from "./search";
import { chatToText, messageHistoryToQuery } from "./utils";
import { MyMessage } from "./api/chat/route";

const CHATS_TO_SEARCH = 3;

export const searchForRelatedChats = async (
  currentChatId: string,
  messages: MyMessage[]
) => {
  const allOtherChats = await loadChats().then((chats) =>
    chats.filter((c) => c.id !== currentChatId)
  );

  const query = messageHistoryToQuery(messages);

  const relatedChats = await searchWithEmbeddings(
    query,
    allOtherChats,
    chatToText
  );

  return relatedChats.slice(0, CHATS_TO_SEARCH);
};
