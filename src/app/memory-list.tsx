"use client";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deleteMemoryAction } from "./actions/memories";
import { useRouter } from "next/navigation";

type Memory = {
  id: string;
  title: string;
  content: string;
};

export function MemoryList({ memories }: { memories: Memory[] }) {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [memoryModalContents, setMemoryModalContents] = useState<Memory | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleOpenMemory = (memory: Memory) => {
    setMemoryModalContents(memory);
    setSelectedMemory(memory);
  };

  const handleCloseMemory = () => {
    setSelectedMemory(null);
    // Delay to allow animation to finish
    setTimeout(() => setMemoryModalContents(null), 200);
  };

  const handleDelete = () => {
    if (!selectedMemory) return;

    startTransition(async () => {
      await deleteMemoryAction({ memoryId: selectedMemory.id });
      handleCloseMemory();
      router.refresh();
    });
  };

  if (memories.length === 0) {
    return (
      <div className="px-2 mt-1 text-xs text-sidebar-foreground/50">
        No memories yet. Add one to get started!
      </div>
    );
  }

  return (
    <>
      <SidebarMenuSub>
        {memories.map((memory) => (
          <SidebarMenuItem key={memory.id}>
            <SidebarMenuButton
              className="truncate"
              onClick={() => handleOpenMemory(memory)}
            >
              {memory.title}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenuSub>

      <Dialog
        open={!!selectedMemory}
        onOpenChange={(open) => {
          setSelectedMemory(null);
          if (!open) {
            // Delay to allow animation to finish
            setTimeout(() => setMemoryModalContents(null), 200);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{memoryModalContents?.title}</DialogTitle>
            <DialogDescription>Memory details</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <p className="text-sm">{memoryModalContents?.content}</p>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              <TrashIcon className="size-4" />
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
