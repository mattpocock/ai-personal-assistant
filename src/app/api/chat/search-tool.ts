import {
  chunkEmails,
  loadEmails,
  reciprocalRankFusion,
  searchWithBM25,
  searchWithEmbeddings,
} from "@/app/search";
import { rerankEmails } from "@/app/rerank";
import { tool } from "ai";
import { z } from "zod";

const NUMBER_PASSED_TO_RERANKER = 30;

export const searchTool = tool({
  description:
    "Search emails using both keyword and semantic search. Returns most relevant emails ranked by reciprocal rank fusion.",
  inputSchema: z.object({
    keywords: z
      .array(z.string())
      .describe(
        "Exact keywords for BM25 search (names, amounts, specific terms)"
      )
      .optional(),
    searchQuery: z
      .string()
      .describe("Natural language query for semantic search (broader concepts)")
      .optional(),
  }),
  execute: async ({ keywords, searchQuery }) => {
    console.log("Keywords:", keywords);
    console.log("Search query:", searchQuery);

    const emails = await loadEmails();
    const emailChunks = await chunkEmails(emails);

    // Use search algorithm from lesson 2.2
    const bm25Results = keywords
      ? await searchWithBM25(keywords, emailChunks)
      : [];
    const embeddingResults = searchQuery
      ? await searchWithEmbeddings(searchQuery, emailChunks)
      : [];
    const rrfResults = reciprocalRankFusion([
      // Only take the top NUMBER_PASSED_TO_RERANKER results from each search
      bm25Results.slice(0, NUMBER_PASSED_TO_RERANKER),
      embeddingResults.slice(0, NUMBER_PASSED_TO_RERANKER),
    ]);

    // Rerank results using LLM
    const query = [keywords?.join(" "), searchQuery].filter(Boolean).join(" ");
    const rerankedResults = await rerankEmails(
      rrfResults.slice(0, NUMBER_PASSED_TO_RERANKER),
      query
    );

    // Return full email objects
    const topEmails = rerankedResults.map((r) => ({
      id: r.email.id,
      subject: r.email.subject,
      body: r.email.chunk,
      score: r.score,
    }));

    console.log("Top emails:", topEmails.length);

    return {
      emails: topEmails,
    };
  },
});
