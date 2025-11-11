import { createAgent } from "@/app/api/chat/agent";
import { MyMessage } from "@/app/api/chat/route";
import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs } from "ai";
import { evalite } from "evalite";
import { createUIMessageFixture } from "./create-ui-message-fixture";

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
});
