import { MyMessage } from "@/app/api/chat/route";
import type { UIMessage } from "ai";
import { promises as fs } from "fs";
import { join } from "path";

export namespace DB {
  // Types for our persistence layer
  export interface Chat {
    id: string;
    title: string;
    messages: MyMessage[];
    llmSummary?: ChatLLMSummary;
    createdAt: string;
    updatedAt: string;
  }

  export interface ChatLLMSummary {
    /**
     * 2-4 keywords that would help identify similar future conversations
     */
    tags: string[];
    /**
     * One sentence describing what the conversation accomplished
     */
    summary: string;
    /**
     * Most effective approach or strategy used in this conversation
     */
    whatWorkedWell: string;
    /**
     * Most important pitfall or ineffective approach to avoid
     */
    whatToAvoid: string;
  }

  export interface Memory {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface PersistenceData {
    chats: DB.Chat[];
    memories: DB.Memory[];
  }
}

// File path for storing the data
const DATA_FILE_PATH = join(process.cwd(), "data", "db.local.json");

/**
 * Ensure the data directory exists
 */
async function ensureDataDirectory(): Promise<void> {
  const dataDir = join(process.cwd(), "data");
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * Load all chats from the JSON file
 */
export async function loadChats(): Promise<DB.Chat[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(DATA_FILE_PATH, "utf-8");
    const parsed: DB.PersistenceData = JSON.parse(data);
    return (parsed.chats || []).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    // If file doesn't exist or is invalid, return empty array
    return [];
  }
}

/**
 * Save all chats to the JSON file
 */
export async function saveChats(chats: DB.Chat[]): Promise<void> {
  await ensureDataDirectory();
  const memories = await loadMemories();
  const data: DB.PersistenceData = { chats, memories };
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Create a new chat
 */
export async function createChat(opts: {
  id: string;
  title: string;
  initialMessages: MyMessage[];
}): Promise<DB.Chat> {
  const chats = await loadChats();
  const now = new Date().toISOString();

  const newChat: DB.Chat = {
    id: opts.id,
    title: opts.title,
    messages: opts.initialMessages,
    createdAt: now,
    updatedAt: now,
  };

  chats.push(newChat);
  await saveChats(chats);

  return newChat;
}

/**
 * Get a chat by ID
 */
export async function getChat(chatId: string): Promise<DB.Chat | null> {
  const chats = await loadChats();
  return chats.find((chat) => chat.id === chatId) || null;
}

/**
 * Update a chat's messages
 */
export async function appendToChatMessages(
  chatId: string,
  messages: MyMessage[]
): Promise<DB.Chat | null> {
  const chats = await loadChats();
  const chatIndex = chats.findIndex((chat) => chat.id === chatId);

  if (chatIndex === -1) {
    return null;
  }

  chats[chatIndex]!.messages = [...chats[chatIndex]!.messages, ...messages];
  chats[chatIndex]!.updatedAt = new Date().toISOString();

  await saveChats(chats);
  return chats[chatIndex]!;
}

/**
 * Delete a chat
 */
export async function deleteChat(chatId: string): Promise<boolean> {
  const chats = await loadChats();
  const initialLength = chats.length;
  const filteredChats = chats.filter((chat) => chat.id !== chatId);

  if (filteredChats.length === initialLength) {
    return false; // Chat not found
  }

  await saveChats(filteredChats);
  return true;
}

export async function updateChatTitle(
  chatId: string,
  title: string
): Promise<DB.Chat | null> {
  const chats = await loadChats();
  const chatIndex = chats.findIndex((chat) => chat.id === chatId);

  if (chatIndex === -1) {
    return null;
  }

  chats[chatIndex]!.title = title;
  chats[chatIndex]!.updatedAt = new Date().toISOString();

  await saveChats(chats);
  return chats[chatIndex]!;
}

export async function updateChatLLMSummary(
  chatId: string,
  llmSummary: DB.Chat["llmSummary"]
): Promise<DB.Chat | null> {
  const chats = await loadChats();
  const chatIndex = chats.findIndex((chat) => chat.id === chatId);
  if (chatIndex === -1) {
    return null;
  }
  chats[chatIndex]!.llmSummary = llmSummary;
  chats[chatIndex]!.updatedAt = new Date().toISOString();
  await saveChats(chats);
  return chats[chatIndex]!;
}

/**
 * Load all memories from the JSON file
 */
export async function loadMemories(): Promise<DB.Memory[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(DATA_FILE_PATH, "utf-8");
    const parsed: DB.PersistenceData = JSON.parse(data);
    return (parsed.memories || []).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    // If file doesn't exist or is invalid, return empty array
    return [];
  }
}

/**
 * Save all memories to the JSON file
 */
async function saveMemories(memories: DB.Memory[]): Promise<void> {
  await ensureDataDirectory();
  const chats = await loadChats();
  const data: DB.PersistenceData = { chats, memories };
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Get a memory by ID
 */
export async function getMemory(memoryId: string): Promise<DB.Memory | null> {
  const memories = await loadMemories();
  return memories.find((memory) => memory.id === memoryId) || null;
}

/**
 * Create a new memory
 */
export async function createMemory(opts: {
  id: string;
  title: string;
  content: string;
}): Promise<DB.Memory> {
  const memories = await loadMemories();
  const now = new Date().toISOString();

  const newMemory: DB.Memory = {
    id: opts.id,
    title: opts.title,
    content: opts.content,
    createdAt: now,
    updatedAt: now,
  };

  memories.push(newMemory);
  await saveMemories(memories);

  return newMemory;
}

/**
 * Update an existing memory
 */
export async function updateMemory(
  memoryId: string,
  opts: {
    title: string;
    content: string;
  }
): Promise<DB.Memory | null> {
  const memories = await loadMemories();
  const memoryIndex = memories.findIndex((m) => m.id === memoryId);

  if (memoryIndex === -1) {
    return null;
  }

  memories[memoryIndex]!.title = opts.title;
  memories[memoryIndex]!.content = opts.content;
  memories[memoryIndex]!.updatedAt = new Date().toISOString();

  await saveMemories(memories);
  return memories[memoryIndex]!;
}

/**
 * Delete a memory
 */
export async function deleteMemory(memoryId: string): Promise<boolean> {
  const memories = await loadMemories();
  const initialLength = memories.length;
  const filteredMemories = memories.filter((memory) => memory.id !== memoryId);

  if (filteredMemories.length === initialLength) {
    return false; // Memory not found
  }

  await saveMemories(filteredMemories);
  return true;
}
