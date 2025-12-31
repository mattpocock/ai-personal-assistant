import {
  chunkEmails,
  loadEmails,
  emailChunkToText,
  emailChunkToId,
  reciprocalRankFusion,
  searchWithBM25,
  searchWithEmbeddings,
} from "@/app/search";
import { rerankEmails } from "@/app/rerank";
import { tool, UIMessage, convertToModelMessages } from "ai";
import { z } from "zod";

const NUMBER_PASSED_TO_RERANKER = 30;

export const searchTool = (messages: UIMessage[]) =>
  tool({
    name: "search_emails",
    description:
      "Search emails using both keyword and semantic search. Returns metadata with snippets only - use getEmails tool to fetch full content of specific emails.",
    inputSchema: z.object({
      keywords: z
        .array(z.string())
        .optional()
        .describe(
          "Exact keywords for BM25 search (names, amounts, specific terms)"
        ),
      searchQuery: z
        .string()
        .optional()
        .describe(
          "Natural language query for semantic search (broader concepts)"
        ),
    }),
    execute: async ({ keywords = [], searchQuery = "" }) => {
      console.log("Keywords:", keywords);
      console.log("Search Query:", searchQuery);

      const allEmails = await loadEmails();
      const emailChunks = await chunkEmails(allEmails);

      const bm25Results = keywords.length
        ? await searchWithBM25(keywords, emailChunks, emailChunkToText)
        : [];
      const embeddingResults = searchQuery
        ? await searchWithEmbeddings(searchQuery, emailChunks, emailChunkToText)
        : [];

      const rrfResults = reciprocalRankFusion([
        bm25Results.slice(0, NUMBER_PASSED_TO_RERANKER),
        embeddingResults.slice(0, NUMBER_PASSED_TO_RERANKER),
      ], emailChunkToId);
      const conversationHistory = convertToModelMessages(messages).filter(
        (m) => m.role == "user" || m.role == "assistant"
      );
      const query = [keywords?.join(" "), searchQuery]
        .filter(Boolean)
        .join(" ");
      const rerankedResults = await rerankEmails(
        rrfResults.slice(0, NUMBER_PASSED_TO_RERANKER).map(r => ({
          email: r.item,
          score: r.score,
        })),
        query,
        conversationHistory
      );
      const topEmails = rerankedResults.map((r) => {
        // Get full email to extract threadId
        const fullEmail = allEmails.find((e) => e.id === r.email.id);
        const snippet =
          r.email.chunk.slice(0, 150).trim() +
          (r.email.chunk.length > 150 ? "..." : "");

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

      console.log("Top Emails:", topEmails.length);

      return {
        emails: topEmails,
      };
    },
  });
