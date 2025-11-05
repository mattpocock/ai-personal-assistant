import { DB, getChat, updateChatLLMSummary } from "@/lib/persistence-layer";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { chatToText } from "./utils";

// Inspired by: https://github.com/ALucek/agentic-memory/blob/main/langgraph/agentic_memory_langgraph.ipynb
const SYSTEM_PROMPT = `
You are analyzing conversations to create summaries that will help guide future interactions. Your task is to extract key elements that would be most helpful when encountering similar conversations in the future.

Review the conversation and create a memory reflection following these rules:

1. For any field where you don't have enough information or the field isn't relevant, use "N/A"
2. Be extremely concise - each string should be one clear, actionable sentence
3. Focus only on information that would be useful for handling similar future conversations
4. contextTags should be specific enough to match similar situations but general enough to be reusable

Examples:
- Good contextTags: ["transformer_architecture", "attention_mechanism", "methodology_comparison"]
- Bad contextTags: ["machine_learning", "paper_discussion", "questions"]

- Good summary: "Explained how the attention mechanism in the BERT paper differs from traditional transformer architectures"
- Bad summary: "Discussed a machine learning paper"

- Good whatWorkedWell: "Using analogies from matrix multiplication to explain attention score calculations"
- Bad whatWorkedWell: "Explained the technical concepts well"

- Good whatToAvoid: "Diving into mathematical formulas before establishing user's familiarity with linear algebra fundamentals"
- Bad whatToAvoid: "Used complicated language"

Additional examples for different research scenarios:

Context tags examples:
- ["experimental_design", "control_groups", "methodology_critique"]
- ["statistical_significance", "p_value_interpretation", "sample_size"]
- ["research_limitations", "future_work", "methodology_gaps"]

Conversation summary examples:
- "Clarified why the paper's cross-validation approach was more robust than traditional hold-out methods"
- "Helped identify potential confounding variables in the study's experimental design"

What worked examples:
- "Breaking down complex statistical concepts using visual analogies and real-world examples"
- "Connecting the paper's methodology to similar approaches in related seminal papers"

What to avoid examples:
- "Assuming familiarity with domain-specific jargon without first checking understanding"
- "Over-focusing on mathematical proofs when the user needed intuitive understanding"

Do not include any text outside the JSON object in your response.
`;

export const reflectOnChat = async (chatId: string) => {
  const chat = await getChat(chatId);

  if (!chat) {
    throw new Error(`Chat with ID ${chatId} not found`);
  }

  const result = await generateObject({
    model: google("gemini-2.5-flash-lite"),
    schema: z.object({
      tags: z
        .array(z.string())
        .describe(
          "2-4 keywords that would help identify similar future conversations. Use field-specific terms like 'deep_learning', 'methodology_question', 'results_interpretation'"
        ),
      summary: z
        .string()
        .describe("One sentence describing what the conversation accomplished"),
      whatWorkedWell: z
        .string()
        .describe(
          "Most effective approach or strategy used in this conversation"
        ),
      whatToAvoid: z
        .string()
        .describe("Most important pitfall or ineffective approach to avoid"),
    }),
    system: SYSTEM_PROMPT,
    prompt: chatToText(chat),
  });

  console.log("Reflect on chat result:", result.object);

  await updateChatLLMSummary(chat.id, result.object);
};
