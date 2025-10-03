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
import { DB, getChat, loadChats } from "@/lib/persistence-layer";
import { MessageSquareIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Chat } from "./chat";

const ChatBotDemo = async (props: {
  searchParams: Promise<{ chatId?: string }>;
}) => {
  const searchParams = await props.searchParams;
  const chatIdFromSearchParams = searchParams.chatId;

  let chat: DB.Chat | null = null;
  if (chatIdFromSearchParams) {
    chat = await getChat(chatIdFromSearchParams);
  }

  const chats = await loadChats();

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
            <SidebarGroupContent>
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
