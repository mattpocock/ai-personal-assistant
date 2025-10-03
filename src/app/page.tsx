import { TopBar } from "@/components/top-bar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DB, getChat, loadChats, loadMemories } from "@/lib/persistence-layer";
import { BrainIcon, MessageSquareIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Chat } from "./chat";
import { MemoryList } from "./memory-list";

const CHAT_LIMIT = 10;

const ChatBotDemo = async (props: {
  searchParams: Promise<{ chatId?: string }>;
}) => {
  const searchParams = await props.searchParams;
  const chatIdFromSearchParams = searchParams.chatId;

  let chat: DB.Chat | null = null;
  if (chatIdFromSearchParams) {
    chat = await getChat(chatIdFromSearchParams);
  }

  const allChats = await loadChats();
  const chats = allChats.slice(0, CHAT_LIMIT);

  const memories = await loadMemories();

  return (
    <>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>
              <MessageSquareIcon className="mr-2" />
              Chats
            </SidebarGroupLabel>
            <SidebarGroupAction asChild>
              <Link href="/">
                <PlusIcon />
                <span className="sr-only">New Chat</span>
              </Link>
            </SidebarGroupAction>
            <SidebarGroupContent className="max-h-[300px] overflow-y-auto">
              {chats.length === 0 ? (
                <div className="px-2 py-4 text-xs text-sidebar-foreground/50 text-center">
                  No chats yet. Start a new conversation!
                </div>
              ) : (
                <SidebarMenu>
                  {chats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={chatIdFromSearchParams === chat.id}
                        className="truncate"
                      >
                        <Link href={`/?chatId=${chat.id}`}>{chat.title}</Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>
              <BrainIcon className="mr-2" />
              Memories
            </SidebarGroupLabel>
            <SidebarGroupAction asChild>
              <button type="button">
                <PlusIcon />
                <span className="sr-only">Add Memory</span>
              </button>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <MemoryList memories={memories} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="h-screen flex flex-col w-full">
        <TopBar />
        <Chat chat={chat} />
      </div>
    </>
  );
};

export default ChatBotDemo;
