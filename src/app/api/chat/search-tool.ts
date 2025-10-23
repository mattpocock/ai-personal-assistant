import {
  loadEmails,
  reciprocalRankFusion,
  searchWithBM25,
  searchWithEmbeddings,
} from "@/app/search";
import { tool } from "ai";
import { z } from "zod";

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

    // Use search algorithm from lesson 2.2
    const bm25Results = keywords ? await searchWithBM25(keywords, emails) : [];
    const embeddingResults = searchQuery
      ? await searchWithEmbeddings(searchQuery, emails)
      : [];
    const rrfResults = reciprocalRankFusion([
      bm25Results.slice(0, 30), // Only take the top 30 results from each search
      embeddingResults.slice(0, 30), // Only take the top 30 results from each search
    ]);

    // Return top 10 full email objects
    const topEmails = rrfResults
      .slice(0, 10)
      .filter((r) => r.score > 0) // Only return emails with a score greater than 0
      .map((r) => ({
        id: r.email.id,
        from: r.email.from,
        to: r.email.to,
        subject: r.email.subject,
        body: r.email.body,
        timestamp: r.email.timestamp,
        score: r.score,
      }));

    return {
      emails: topEmails,
    };
  },
});
