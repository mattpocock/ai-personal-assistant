"use server";

import {
  loadMemories,
  getMemory,
  createMemory,
  deleteMemory,
  DB,
} from "@/lib/persistence-layer";

/**
 * Server action to fetch all memories
 */
export async function getMemoriesAction(): Promise<DB.Memory[]> {
  return await loadMemories();
}

/**
 * Server action to fetch a single memory by ID
 */
export async function getMemoryAction(opts: {
  memoryId: string;
}): Promise<DB.Memory | null> {
  return await getMemory(opts.memoryId);
}

/**
 * Server action to create a new memory
 */
export async function createMemoryAction(opts: {
  title: string;
  content: string;
}): Promise<DB.Memory> {
  const memory = await createMemory({
    id: crypto.randomUUID(),
    title: opts.title,
    content: opts.content,
  });

  return memory;
}

/**
 * Server action to delete a memory
 */
export async function deleteMemoryAction(opts: {
  memoryId: string;
}): Promise<boolean> {
  const result = await deleteMemory(opts.memoryId);

  return result;
}
