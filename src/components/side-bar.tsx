"use client";
import { AddMemoryButton } from "@/app/add-memory-button";
import { MemoryList } from "@/app/memory-list";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import { DB } from "@/lib/persistence-layer";
import {
  BrainIcon,
  DatabaseIcon,
  MessageSquareIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";

export function SideBar({
  chats,
  memories,
  chatIdFromSearchParams,
}: {
  chats: DB.Chat[];
  memories: DB.Memory[];
  chatIdFromSearchParams: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pathname = usePathname();
  return (
    <Sidebar>
      <SidebarHeader className="h-16 border-b p-0 flex">
        <div
          className="h-full"
          // onMouseOver={() => videoRef.current?.play()}
          // onMouseLeave={() => videoRef.current?.pause()}
        >
          <Link href="/" className="flex items-center px-0 h-full gap-0 ">
            <video
              loop
              muted
              autoPlay
              className="size-15 brightness-[0.95] dark:block hidden"
            >
              <source
                src="https://res.cloudinary.com/total-typescript/video/upload/v1759841358/orb-sidebar.mov"
                type="video/mp4"
              />
            </video>
            <video loop muted autoPlay className="size-15 dark:hidden block">
              <source
                src="https://res.cloudinary.com/total-typescript/video/upload/v1759841358/orb-sidebar-light.mov"
                type="video/mp4"
              />
            </video>
            <span className="text-sm font-semibold">MarkDown Assistant</span>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <MessageSquareIcon className="mr-2" />
            <Link href="/">Chats</Link>
          </SidebarGroupLabel>
          <SidebarGroupAction asChild>
            <Link href="/">
              <PlusIcon />
              <span className="sr-only">New Chat</span>
            </Link>
          </SidebarGroupAction>
          <SidebarGroupContent className="max-h-[300px] overflow-y-auto">
            {chats.length === 0 ? (
              <div className="px-2 mt-1 text-xs text-sidebar-foreground/50">
                No chats yet! Start by sending a message.
              </div>
            ) : (
              <SidebarMenuSub>
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
              </SidebarMenuSub>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>
            <BrainIcon className="mr-2" />
            Memories
          </SidebarGroupLabel>
          <SidebarGroupAction asChild>
            <AddMemoryButton />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <MemoryList memories={memories} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={pathname === "/search"} asChild>
                  <Link href="/search">
                    <DatabaseIcon />
                    Data
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
