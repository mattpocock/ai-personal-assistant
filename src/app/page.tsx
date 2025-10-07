import { TopBar } from "@/components/top-bar";

import { DB, getChat, loadChats, loadMemories } from "@/lib/persistence-layer";
import { Chat } from "./chat";
import { SideBar } from "@/components/side-bar";

export const CHAT_LIMIT = 10;

const ChatBotDemo = async (props: {
  searchParams: Promise<{ chatId?: string }>;
}) => {
  const searchParams = await props.searchParams;
  const chatIdFromSearchParams = searchParams.chatId ?? "";

  let chat: DB.Chat | null = null;
  if (chatIdFromSearchParams) {
    chat = await getChat(chatIdFromSearchParams);
  }

  const allChats = await loadChats();
  const chats = allChats.slice(0, CHAT_LIMIT);

  const memories = await loadMemories();

  return (
    <>
      <SideBar
        chats={chats}
        memories={memories}
        chatIdFromSearchParams={chatIdFromSearchParams}
      />
      <div className="h-screen flex flex-col w-full">
        <TopBar showSidebar title={chat?.title ?? "New Chat"} />
        <Chat chat={chat} />
      </div>
    </>
  );
};

export default ChatBotDemo;
