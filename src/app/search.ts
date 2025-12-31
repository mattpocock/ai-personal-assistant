import BM25 from "okapibm25";
import path from "path";
import fs from "fs/promises";
import { embed, cosineSimilarity, embedMany } from "ai";
import { google } from "@ai-sdk/google";
import {
  ensureEmbeddingsCacheDirectory,
  getCachedEmbedding,
  writeEmbeddingToCache,
} from "./embeddings";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

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
        id: email.id,
        subject: email.subject,
        chunk,
        index: chunkIndex,
        totalChunks: chunks.length,
        from: email.from,
        to: email.to,
        timestamp: email.timestamp,
      });
    });
  }
  return emailsWithChunks;
};

export async function loadEmails(): Promise<Email[]> {
  const filePath = path.join(process.cwd(), "data", "emails.json");
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
}

export async function searchWithBM25<T>(
  keywords: string[],
  items: T[],
  toText: (item: T) => string
) {
  const corpus = items.flatMap((item) => toText(item));
  const scores: number[] = (BM25 as any)(corpus, keywords);

  return scores
    .map((score, index) => ({ item: items[index], score }))
    .sort((a, b) => b.score - a.score);
}

export const emailChunkToText = (email: EmailChunk): string => {
  return `${email.subject} ${email.chunk}`;
};

export async function loadOrGenerateEmbeddings<T>(
  items: T[],
  toText: (item: T) => string
): Promise<{ item: T; embedding: number[] }[]> {
  await ensureEmbeddingsCacheDirectory();
  const results: { item: T; embedding: number[] }[] = [];
  const uncachedItems: T[] = [];
  for (const item of items) {
    const cachedEmbedding = await getCachedEmbedding(toText(item));
    if (cachedEmbedding) {
      results.push({ item, embedding: cachedEmbedding });
    } else {
      uncachedItems.push(item);
    }
  }
  const BATCH_SIZE = 99;
  for (let i = 0; i < uncachedItems.length; i += BATCH_SIZE) {
    const batch = uncachedItems.slice(i, i + BATCH_SIZE);
    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        uncachedItems.length / BATCH_SIZE
      )}`
    );
    const { embeddings } = await embedMany({
      model: google.textEmbeddingModel("text-embedding-004"),
      values: batch.map((e) => toText(e)),
    });
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const embedding = embeddings[j];

      await writeEmbeddingToCache(toText(item), embedding);

      results.push({ item, embedding });
    }
  }
  return results;
}

export async function searchWithEmbeddings<T>(
  query: string,
  items: T[],
  toText: (item: T) => string
): Promise<{ item: T; score: number }[]> {
  const embeddings = await loadOrGenerateEmbeddings<T>(items, toText);
  const { embedding: queryEmbedding } = await embed({
    model: google.textEmbeddingModel("text-embedding-004"),
    value: query,
  });
  const results = embeddings.map(({ item, embedding }) => {
    const score = cosineSimilarity(queryEmbedding, embedding);
    return { item, score };
  });
  return results.sort((a, b) => b.score - a.score);
}

const RRF_K = 60;

export function reciprocalRankFusion<T>(
  rankings: { item: T; score: number }[][],
  toId: (item: T) => string
): { item: T; score: number }[] {
  const rrfScores = new Map<string, number>();
  const itemMap = new Map<string, T>();

  rankings.forEach((ranking) => {
    ranking.forEach((item, rank) => {
      const itemId = toId(item.item);
      const currentScore = rrfScores.get(itemId) || 0;

      // Position-based scoring: 1/(k+rank)
      const contribution = 1 / (RRF_K + rank);
      rrfScores.set(itemId, currentScore + contribution);
      itemMap.set(itemId, item.item);
    });
  });
  // Sort by combined RRF score descending
  return Array.from(rrfScores.entries())
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([itemId, score]) => ({
      score,
      item: itemMap.get(itemId)!,
    }));
}

export const emailChunkToId = (email: EmailChunk): string => {
  return `${email.id}-${email.index}`;
};

export const searchEmailsWithRRF = async (query: string, emails: Email[]) => {
  const emailChunks = await chunkEmails(emails);
  const bm25Ranking = await searchWithBM25(
    query.toLowerCase().split(" "),
    emailChunks,
    emailChunkToText
  );
  const embeddingsRanking = await searchWithEmbeddings(
    query,
    emailChunks,
    emailChunkToText
  );
  const rrfRanking = reciprocalRankFusion(
    [bm25Ranking, embeddingsRanking],
    emailChunkToId
  );
  return rrfRanking;
};
