import BM25 from "okapibm25";
import fs from "fs/promises";
import path from "path";
import { embed, embedMany, cosineSimilarity } from "ai";
import { google } from "@ai-sdk/google";
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

export async function searchWithBM25(keywords: string[], emails: Email[]) {
  // Combine subject + body for richer text corpus
  const corpus = emails.map((email) => emailToText(email));

  // BM25 returns score array matching corpus order
  const scores: number[] = (BM25 as any)(corpus, keywords);

  // Map scores to emails, sort descending
  return scores
    .map((score, idx) => ({ score, email: emails[idx] }))
    .sort((a, b) => b.score - a.score);
}

export async function loadEmails(): Promise<Email[]> {
  const filePath = path.join(process.cwd(), "data", "emails.json");
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
}

// Converts the email to a text string for indexing
export const emailToText = (email: Email) => `${email.subject} ${email.body}`;

export async function loadOrGenerateEmbeddings(
  emails: Email[]
): Promise<{ id: string; embedding: number[] }[]> {
  // Ensure cache directory exists
  await ensureEmbeddingsCacheDirectory();

  const results: { id: string; embedding: number[] }[] = [];
  const uncachedEmails: Email[] = [];

  // Check cache for each email
  for (const email of emails) {
    const cachedEmbedding = await getCachedEmbedding(emailToText(email));
    if (cachedEmbedding) {
      results.push({ id: email.id, embedding: cachedEmbedding });
    } else {
      // Cache miss - need to generate
      uncachedEmails.push(email);
    }
  }

  // Generate embeddings for uncached emails in batches of 99
  if (uncachedEmails.length > 0) {
    console.log(`Generating embeddings for ${uncachedEmails.length} emails`);

    const BATCH_SIZE = 99;
    for (let i = 0; i < uncachedEmails.length; i += BATCH_SIZE) {
      const batch = uncachedEmails.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          uncachedEmails.length / BATCH_SIZE
        )}`
      );

      const { embeddings } = await embedMany({
        model: google.textEmbeddingModel("text-embedding-004"),
        values: batch.map((e) => emailToText(e)),
      });

      // Write batch to cache
      for (let j = 0; j < batch.length; j++) {
        const email = batch[j];
        const embedding = embeddings[j];

        await writeEmbeddingToCache(emailToText(email), embedding);

        results.push({ id: email.id, embedding });
      }
    }
  }

  return results;
}

export async function searchWithEmbeddings(query: string, emails: Email[]) {
  // Load cached embeddings
  const emailEmbeddings = await loadOrGenerateEmbeddings(emails);

  // Generate query embedding
  const { embedding: queryEmbedding } = await embed({
    model: google.textEmbeddingModel("text-embedding-004"),
    value: query,
  });

  // Calculate similarity scores
  const results = emailEmbeddings.map(({ id, embedding }) => {
    const email = emails.find((e) => e.id === id)!;
    const score = cosineSimilarity(queryEmbedding, embedding);
    return { score, email };
  });

  // Sort by similarity descending
  return results.sort((a, b) => b.score - a.score);
}

const RRF_K = 60;

export function reciprocalRankFusion(
  rankings: { email: Email; score: number }[][]
): { email: Email; score: number }[] {
  const rrfScores = new Map<string, number>();
  const emailMap = new Map<string, Email>();

  // Process each ranking list (BM25 and embeddings)
  rankings.forEach((ranking) => {
    ranking.forEach((item, rank) => {
      const currentScore = rrfScores.get(item.email.id) || 0;

      // Position-based scoring: 1/(k+rank)
      const contribution = 1 / (RRF_K + rank);
      rrfScores.set(item.email.id, currentScore + contribution);

      emailMap.set(item.email.id, item.email);
    });
  });

  // Sort by combined RRF score descending
  return Array.from(rrfScores.entries())
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([emailId, score]) => ({
      score,
      email: emailMap.get(emailId)!,
    }));
}

export const searchWithRRF = async (query: string, emails: Email[]) => {
  const bm25Ranking = await searchWithBM25(
    query.toLowerCase().split(" "),
    emails
  );
  const embeddingsRanking = await searchWithEmbeddings(query, emails);
  const rrfRanking = reciprocalRankFusion([bm25Ranking, embeddingsRanking]);
  return rrfRanking;
};
