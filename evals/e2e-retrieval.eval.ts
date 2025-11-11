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
    // Multi-hop queries
    {
      input: createUIMessageFixture<MyMessage>(
        "What price reduction did I negotiate on the Chorlton house after the survey, and who recommended asking for it?"
      ),
      expected:
        "You negotiated a £5,500 price reduction. Jennifer Lawson recommended requesting £6,000 based on the survey report showing damp issues requiring £7,000-£8,000 in treatment.",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "Who is Tom Richardson and what day rate did I quote him?"
      ),
      expected:
        "Tom Richardson is a Senior Product Manager at Hartley & Co. You quoted him a day rate of £1,250 for a 3-week design systems consulting engagement.",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "What photography equipment advice did Martin Hughes offer for my New Zealand trip?"
      ),
      expected:
        "Martin Hughes recommended upgrading your lens for the New Zealand trip. He mentioned he did a NZ trip 3 years ago and offered to bring location recommendations to a coffee meetup.",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "What was the final purchase price of my house at 42 Victoria Grove?"
      ),
      expected:
        "The final purchase price was £437,500 after a £5,500 reduction from the original asking price.",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "What climbing locations did Chris Dalton suggest for my progression to 5.11, and what specific areas?"
      ),
      expected:
        "Chris Dalton suggested gritstone routes near Stanage Edge, specifically the Plantation and Upper Tier areas with technical 5.11a routes.",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "Who is Katie Zhang and why did I want to connect with her during New Zealand trip planning?"
      ),
      expected:
        "Katie Zhang is your old colleague who moved to Auckland, New Zealand. You wanted to connect with her to get local insider recommendations for climbing and photography spots.",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "Tell me about Tom from my consulting emails"
      ),
      expected:
        "Tom Richardson from Hartley & Co contacted you about design systems consulting work. You quoted him £1,250/day for a 3-week engagement totaling £18,750.",
    },
    {
      input: createUIMessageFixture<MyMessage>("Tell me about Emma"),
      expected:
        "There are multiple people named Emma in your emails: Emma Chen (Lead Product Designer at Hartley & Co), and others in your wedding planning and photography contexts. Could you be more specific about which Emma you're asking about?",
    },
    // Filtering queries
    {
      input: createUIMessageFixture<MyMessage>(
        "How many emails did I receive from David Xu between June 1-15, 2024?"
      ),
      expected: "You received 5 emails from David Xu between June 1-15, 2024.",
    },
    {
      input: createUIMessageFixture<MyMessage>(
        "How many emails did I exchange with Alex about the New Zealand trip in phase 1?"
      ),
      expected:
        "You exchanged 1 email from Alex about the New Zealand trip in phase 1.",
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
