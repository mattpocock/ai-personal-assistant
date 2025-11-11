import { memoryToText } from "@/app/memory-search";
import {
  createMemory,
  DB,
  deleteMemory,
  updateMemory,
} from "@/lib/persistence-layer";
import { google } from "@ai-sdk/google";
import { convertToModelMessages, generateObject, LanguageModel } from "ai";
import { z } from "zod";
import { MyMessage } from "./route";

export const extractMemoriesInner = async (opts: {
  messages: MyMessage[];
  memories: DB.Memory[];
  model: LanguageModel;
}) => {
  // Only include user and assistant messages, not tool calls
  // This is a cost-saving measure
  const filteredMessages = opts.messages.filter(
    (message) => message.role === "user" || message.role === "assistant"
  );

  const memoriesResult = await generateObject({
    model: opts.model,
    schema: z.object({
      updates: z
        .array(
          z.object({
            id: z.string().describe("The ID of the existing memory to update"),
            title: z.string().describe("The updated memory title"),
            content: z.string().describe("The updated memory content"),
          })
        )
        .describe("Memories to update"),
      deletions: z.array(z.string()).describe("Array of memory IDs to delete"),
      additions: z
        .array(
          z.object({
            title: z.string().describe("The memory title"),
            content: z.string().describe("The memory content"),
          })
        )
        .describe("New memories to add"),
    }),
    system: `You are a memory management agent that extracts and maintains permanent information about the user from conversations.

<existing-memories>
${opts.memories
  .map((memory) => `<memory id="${memory.id}">${memoryToText(memory)}</memory>`)
  .join("\n\n")}
</existing-memories>

Your job is to:
1. Analyze the conversation history
2. Extract NEW permanent facts worth remembering
3. Update existing memories if they should be modified
4. Delete memories that are no longer relevant or accurate

Only store PERMANENT information that:
- Is unlikely to change over time (preferences, traits, characteristics)
- Will be relevant for weeks, months, or years
- Helps personalize future interactions
- Represents lasting facts about the user

Examples of what TO store:
- "User prefers dark mode in applications"
- "User works as a software engineer at Acme Corp"
- "User's primary programming language is TypeScript"
- "User has a cat named Whiskers"

Examples of what NOT to store:
- "User asked about the weather today"
- "User said hello"
- "User is working on a project" (too temporary)
- "User mentioned they're hungry" (temporary state)

For each operation:
- UPDATES: Provide the existing memory ID, new title, and new content
- DELETIONS: Provide memory IDs that are no longer relevant
- ADDITIONS: Provide title and content for brand new memories

Be conservative - only add memories that will genuinely help personalize future conversations.`,
    messages: convertToModelMessages(filteredMessages),
  });

  const { updates, deletions, additions } = memoriesResult.object;

  return { updates, deletions, additions };
};

export async function extractAndUpdateMemories(opts: {
  messages: MyMessage[];
  memories: DB.Memory[];
}) {
  const { updates, deletions, additions } = await extractMemoriesInner({
    messages: opts.messages,
    memories: opts.memories,
    model: google("gemini-2.5-flash"),
  });

  // Filter out deletions that are also being updated
  const filteredDeletions = deletions.filter(
    (deletion) => !updates.some((update) => update.id === deletion)
  );

  // Process updates
  await Promise.all(
    updates.map((update) =>
      updateMemory(update.id, {
        title: update.title,
        content: update.content,
      })
    )
  );

  // Process deletions
  await Promise.all(
    filteredDeletions.map((deletion) => deleteMemory(deletion))
  );

  // Process additions
  await Promise.all(
    additions.map((addition) =>
      createMemory({
        id: crypto.randomUUID(),
        title: addition.title,
        content: addition.content,
      })
    )
  );
}
