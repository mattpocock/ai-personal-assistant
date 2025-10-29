import { google } from "@ai-sdk/google";
import { generateObject, ModelMessage } from "ai";
import { z } from "zod";

type ResultWithEmail = {
  email: {
    id: string;
    subject: string;
    chunk: string;
  };
  score: number;
};

export const rerankEmails = async (
  results: ResultWithEmail[],
  query: string,
  conversationHistory: ModelMessage[]
): Promise<ResultWithEmail[]> => {
  const resultsWithId = results.map((result, index) => ({
    ...result,
    id: index,
  }));

  const resultsAsMap = new Map(
    resultsWithId.map((result) => [result.id, result])
  );
  // Call reranker LLM
  const rerankedResults = await generateObject({
    model: google("gemini-2.5-flash-lite"),
    system: `You are a search result reranker. Your job is to analyze a list of email chunks and return only the IDs of the most relevant chunks for answering the user's question.

Given a list of chunks with their IDs and content, you should:
1. Evaluate how relevant each chunk is to the user's search query
2. Return only the IDs of the most relevant chunks

You should be selective and only include chunks that are genuinely helpful for answering the question. If a chunk is only tangentially related or not relevant, exclude its ID.

Return the IDs as a simple array of numbers.`,
    schema: z.object({
      resultIds: z
        .array(z.number())
        .describe("Array of IDs for the most relevant chunks"),
    }),
    messages: [
      ...conversationHistory,
      {
        role: "user",
        content: `
          Search query:
          ${query}

          Available chunks:
          ${resultsWithId
            .map((resultWithId) =>
              [
                `## ID: ${resultWithId.id}`,
                `Subject: ${resultWithId.email.subject}`,
                `<content>`,
                resultWithId.email.chunk,
                `</content>`,
              ].join("\n\n")
            )
            .join("\n\n")}

          Return only the IDs of the most relevant chunks for the user's search query.
        `,
      },
    ],
  });

  console.log("Reranked results:", rerankedResults.object.resultIds);

  return rerankedResults.object.resultIds
    .map((id) => resultsAsMap.get(id))
    .filter((r) => r !== undefined);
};
