import {
  chunkEmails,
  loadEmails,
  reciprocalRankFusion,
  searchWithBM25,
  searchWithEmbeddings,
} from "@/app/search";
import { rerankEmails } from "@/app/rerank";
import { convertToModelMessages, tool, UIMessage } from "ai";
import { z } from "zod";

const NUMBER_PASSED_TO_RERANKER = 30;

export const searchTool = (messages: UIMessage[]) =>
  tool({
    description:
      "Search emails using both keyword and semantic search. Returns metadata with snippets only - use getEmails tool to fetch full content of specific emails.",
    inputSchema: z.object({
      keywords: z
        .array(z.string())
        .describe(
          "Exact keywords for BM25 search (names, amounts, specific terms)"
        )
        .optional(),
      searchQuery: z
        .string()
        .describe(
          "Natural language query for semantic search (broader concepts)"
        )
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

      // Get conversation history without the tool calls
      const conversationHistory = convertToModelMessages(messages).filter(
        (m) => m.role === "user" || m.role === "assistant"
      );

      // Rerank results using LLM
      const query = [keywords?.join(" "), searchQuery]
        .filter(Boolean)
        .join(" ");
      const rerankedResults = await rerankEmails(
        rrfResults.slice(0, NUMBER_PASSED_TO_RERANKER),
        query,
        conversationHistory
      );

      // Return metadata with snippets only
      const topEmails = rerankedResults.map((r) => {
        // Get full email to extract threadId
        const fullEmail = emails.find((e) => e.id === r.email.id);
        const snippet = r.email.chunk.slice(0, 150).trim() + (r.email.chunk.length > 150 ? "..." : "");

        return {
          id: r.email.id,
          threadId: fullEmail?.threadId ?? "",
          subject: r.email.subject,
          from: r.email.from,
          to: r.email.to,
          timestamp: r.email.timestamp,
          score: r.score,
          snippet,
        };
      });

      console.log("Top emails:", topEmails.length);

      return {
        emails: topEmails,
      };
    },
  });
