import { createAgent } from "@/app/api/chat/agent";
import { MyMessage } from "@/app/api/chat/route";
import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs } from "ai";
import { evalite } from "evalite";
import { createUIMessageFixture } from "./create-ui-message-fixture";
import { messageToText } from "@/app/utils";
import { answerCorrectness } from "evalite/scorers";

evalite.each([
  {
    name: "Gemini 2.5 Flash",
    input: google("gemini-2.5-flash"),
  },
])("Search for information", {
  data: [
    {
      input: createUIMessageFixture<MyMessage>(
        "Which house did I buy? What is its address?"
      ),
      expected:
        "You bought a house at 42 Victoria Grove, Chorlton, Manchester M21 9EH.",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "What was the name of the person I was mentoring, and what was I mentoring them about?"
      ),
      expected: "You were mentoring Elena Kovac on the subject of climbing.",
    },
    {
      input: createUIMessageFixture<MyMessage>("Am I married? If so, who to?"),
      expected: "You are not married. Your partner is Alex Chen.",
    },
  ],
  task: async (input, model) => {
    const agent = createAgent({
      memories: [],
      messages: input,
      model: model,
      stopWhen: stepCountIs(10),
      relatedChats: [],
    });

    const result = await agent.generate({
      messages: convertToModelMessages(input),
    });

    return {
      text: result.text,
      toolCalls: result.steps.flatMap((step) => step.toolCalls),
    };
  },
  columns: ({ input, output, expected }) => [
    {
      label: "Input",
      value: input,
    },
    {
      label: "Summary",
      value: output.text,
    },
    {
      label: "Tool Calls",
      value: output.toolCalls,
    },
    {
      label: "Expected",
      value: expected,
    },
  ],
  scorers: [
    {
      scorer: ({ output, expected, input }) => {
        return answerCorrectness({
          question: input.map(messageToText).join("\n"),
          answer: output.text,
          reference: expected,
          embeddingModel: google.textEmbeddingModel("text-embedding-004"),
          model: google("gemini-2.5-flash-lite"),
        });
      },
    },
  ],
});
