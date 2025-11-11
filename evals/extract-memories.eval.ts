import { extractMemoriesInner } from "@/app/api/chat/extract-memories";
import { MyMessage } from "@/app/api/chat/route";
import { google } from "@ai-sdk/google";
import { evalite } from "evalite";
import { createUIMessageFixture } from "./create-ui-message-fixture";
import { answerSimilarity } from "evalite/scorers";

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
      expected: "User is a software engineer at Google",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "I need to email Michelle about the project deadline."
      ),
      expected: null,
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "I work as a product manager at Microsoft. I love rock climbing and playing guitar. My primary programming language is TypeScript."
      ),
      expected:
        "User works as a product manager at Google. User loves rock climbing and playing guitar. User's primary programming language is TypeScript.",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "Can you help me with a bug I'm having? I'm feeling tired today. By the way, I have a golden retriever named Max and I prefer dark mode in all my applications."
      ),
      expected:
        "User has a golden retriever named Max. User prefers dark mode in all their applications.",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "Hi, I need help with my React project.",
        "Sure, I'd be happy to help! What's the issue?",
        "I'm building a dashboard. I work remotely from Portland, Oregon.",
        "That's great! What kind of dashboard are you building?",
        "It's for tracking fitness goals. I'm really into marathon running and I train 5 days a week. I also follow a vegetarian diet.",
        "Sounds like a great project! What technology stack are you using?",
        "I'm using Next.js and TypeScript. I've been a full-stack developer for 8 years now."
      ),
      expected:
        "User is building a dashboard for tracking fitness goals. User works remotely from Portland, Oregon. User is a full-stack developer for 8 years now. User is into marathon running and trains 5 days a week. User follows a vegetarian diet.",
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
      name: "Addition Similarity",
      description: "How similar are the additions to the expected additions?",
      scorer: ({ input, output, expected }) => {
        // If no expected additions are provided, check if no additions were made
        if (expected === null) {
          return output.additions.length === 0 ? 1 : 0;
        }

        return answerSimilarity({
          answer: output.additions
            .map((addition) => addition.title + ": " + addition.content)
            .join("\n"),
          reference: expected,
          embeddingModel: google.textEmbeddingModel("text-embedding-004"),
        });
      },
    },
  ],
});
