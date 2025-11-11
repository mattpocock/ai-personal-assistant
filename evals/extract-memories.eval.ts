import { extractMemoriesInner } from "@/app/api/chat/extract-memories";
import { MyMessage } from "@/app/api/chat/route";
import { google } from "@ai-sdk/google";
import { evalite } from "evalite";
import { createUIMessageFixture } from "./create-ui-message-fixture";

evalite.each([
  {
    name: "Gemini 2.5 Flash",
    input: google("gemini-2.5-flash"),
  },
  {
    name: "Gemini 2.5 Flash Lite",
    input: google("gemini-2.5-flash-lite"),
  },
])("Extract When Memories Are Empty", {
  data: [
    {
      input: createUIMessageFixture<MyMessage>(
        "I'm a software engineer at Google."
      ),
    },
  ],
  task: async (input, model) => {
    const { updates, deletions, additions } = await extractMemoriesInner({
      messages: input,
      memories: [],
      model: model,
    });
    return {
      updates,
      deletions,
      additions,
    };
  },
  scorers: [
    {
      name: "Updates",
      description: "The number of updates should be 0",
      scorer: ({ output }) => {
        return output.updates.length === 0 ? 1 : 0;
      },
    },
    {
      name: "Deletions",
      description: "The number of deletions should be 0",
      scorer: ({ output }) => {
        return output.deletions.length === 0 ? 1 : 0;
      },
    },
    {
      name: "Additions",
      description: "The number of additions should be 1",
      scorer: ({ output }) => {
        return output.additions.length === 1 ? 1 : 0;
      },
    },
  ],
});
