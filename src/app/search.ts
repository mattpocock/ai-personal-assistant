import { google } from "@ai-sdk/google";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { cosineSimilarity, embed, embedMany } from "ai";
import fs from "fs/promises";
import BM25 from "okapibm25";
import path from "path";
import {
  ensureEmbeddingsCacheDirectory,
  getCachedEmbedding,
  writeEmbeddingToCache,
} from "./embeddings";

export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string | string[];
  cc?: string[];
  subject: string;
  body: string;
  timestamp: string;
  inReplyTo?: string;
  references?: string[];
  labels?: string[];
  arcId?: string;
  phaseId?: number;
}

export type EmailChunk = {
  id: string;
  subject: string;
  chunk: string;
  index: number;
  totalChunks: number;
  from: string;
  to: string | string[];
  timestamp: string;
};

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 100,
  separators: ["\n\n", "\n", " ", ""],
});

export const chunkEmails = async (emails: Email[]) => {
  const emailsWithChunks: EmailChunk[] = [];
  for (const email of emails) {
    const chunks = await textSplitter.splitText(email.body);

    chunks.forEach((chunk, chunkIndex) => {
      emailsWithChunks.push({
        id: `${email.id}-${chunkIndex}`,
        index: chunkIndex,
        subject: email.subject,
        chunk,
        from: email.from,
        to: email.to,
        timestamp: email.timestamp,
        totalChunks: chunks.length,
      });
    });
  }
  return emailsWithChunks;
};

export async function searchWithBM25(
  keywords: string[],
  emailChunks: EmailChunk[]
) {
  // Combine subject + chunks for richer text corpus
  const corpus = emailChunks.flatMap((emailChunk) =>
    emailChunkToText(emailChunk)
  );

  // BM25 returns score array matching corpus order
  const scores: number[] = (BM25 as any)(corpus, keywords);

  // Map scores to emails, sort descending
  return scores
    .map((score, idx) => ({ score, email: emailChunks[idx] }))
    .sort((a, b) => b.score - a.score);
}

export async function loadEmails(): Promise<Email[]> {
  const filePath = path.join(process.cwd(), "data", "emails.json");
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
}

// Converts the email to a text string for indexing
export const emailChunkToText = (email: EmailChunk) =>
  `${email.subject} ${email.chunk}`;

export async function loadOrGenerateEmbeddings(
  emailChunks: EmailChunk[]
): Promise<{ id: string; embedding: number[] }[]> {
  // Ensure cache directory exists
  await ensureEmbeddingsCacheDirectory();

  const results: { id: string; embedding: number[] }[] = [];
  const uncachedEmailChunks: EmailChunk[] = [];

  // Check cache for each email
  for (const emailChunk of emailChunks) {
    const cachedEmbedding = await getCachedEmbedding(
      emailChunkToText(emailChunk)
    );
    if (cachedEmbedding) {
      results.push({ id: emailChunk.id, embedding: cachedEmbedding });
    } else {
      // Cache miss - need to generate
      uncachedEmailChunks.push(emailChunk);
    }
  }

  // Generate embeddings for uncached emails in batches of 99
  if (uncachedEmailChunks.length > 0) {
    console.log(
      `Generating embeddings for ${uncachedEmailChunks.length} emails`
    );

    const BATCH_SIZE = 99;
    for (let i = 0; i < uncachedEmailChunks.length; i += BATCH_SIZE) {
      const batch = uncachedEmailChunks.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          uncachedEmailChunks.length / BATCH_SIZE
        )}`
      );

      const { embeddings } = await embedMany({
        model: google.textEmbeddingModel("text-embedding-004"),
        values: batch.map((e) => emailChunkToText(e)),
      });

      // Write batch to cache
      for (let j = 0; j < batch.length; j++) {
        const email = batch[j];
        const embedding = embeddings[j];

        await writeEmbeddingToCache(emailChunkToText(email), embedding);

        results.push({ id: email.id, embedding });
      }
    }
  }

  return results;
}

export async function searchWithEmbeddings(
  query: string,
  emailChunks: EmailChunk[]
) {
  // Load cached embeddings
  const emailEmbeddings = await loadOrGenerateEmbeddings(emailChunks);

  // Generate query embedding
  const { embedding: queryEmbedding } = await embed({
    model: google.textEmbeddingModel("text-embedding-004"),
    value: query,
  });

  // Calculate similarity scores
  const results = emailEmbeddings.map(({ id, embedding }) => {
    const email = emailChunks.find((e) => e.id === id)!;
    const score = cosineSimilarity(queryEmbedding, embedding);
    return { score, email };
  });

  // Sort by similarity descending
  return results.sort((a, b) => b.score - a.score);
}

const RRF_K = 60;

export function reciprocalRankFusion(
  rankings: { email: EmailChunk; score: number }[][]
): { email: EmailChunk; score: number }[] {
  const rrfScores = new Map<string, number>();
  const emailMap = new Map<string, EmailChunk>();

  // Process each ranking list (BM25 and embeddings)
  rankings.forEach((ranking) => {
    ranking.forEach((item, rank) => {
      const emailChunkId = `${item.email.id}-${item.email.index}`;

      const currentScore = rrfScores.get(emailChunkId) || 0;

      // Position-based scoring: 1/(k+rank)
      const contribution = 1 / (RRF_K + rank);
      rrfScores.set(emailChunkId, currentScore + contribution);

      emailMap.set(emailChunkId, item.email);
    });
  });

  // Sort by combined RRF score descending
  return Array.from(rrfScores.entries())
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([emailChunkId, score]) => ({
      score,
      email: emailMap.get(emailChunkId)!,
    }));
}

export const searchWithRRF = async (query: string, emails: Email[]) => {
  const emailChunks = await chunkEmails(emails);
  const bm25Ranking = await searchWithBM25(
    query.toLowerCase().split(" "),
    emailChunks
  );
  const embeddingsRanking = await searchWithEmbeddings(query, emailChunks);
  const rrfRanking = reciprocalRankFusion([bm25Ranking, embeddingsRanking]);
  return rrfRanking;
};
