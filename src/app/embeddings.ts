import prisma from "../../lib/prisma";
import {
  getEmbedding,
  upsertEmbedding,
  semanticSearch,
} from "../app/generated/prisma/sql";

import path from "path";
import crypto from "crypto";
import fs from "fs/promises";

const CACHE_DIR = path.join(process.cwd(), "data", "embeddings");
const CACHE_KEY = "google-text-embedding-004";

export const ensureEmbeddingsCacheDirectory = async () => {
  await fs.mkdir(CACHE_DIR, { recursive: true });
};

/**
 * TODO: The following functions need to be updated to use the database instead of filesystem
 * This are only used for the email embeddings caching currently.
 */

const getEmbeddingFilePath = (content: string) => {
  const hash = crypto
    .createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, 10);
  return path.join(CACHE_DIR, `${CACHE_KEY}-${hash}.json`);
};

export const getCachedEmbedding = async (
  content: string
): Promise<number[] | null> => {
  const filePath = getEmbeddingFilePath(content);
  try {
    const cached = await fs.readFile(filePath, "utf-8");
    return JSON.parse(cached);
  } catch {
    return null;
  }
};

export const writeEmbeddingToCache = async (content: string, embedding: number[]): Promise<void> => {
  const filePath = getEmbeddingFilePath(content);
  await fs.writeFile(filePath, JSON.stringify(embedding), "utf-8");
}

/**
 * Get a cached embedding for a lyrics record by ID
 * @param lyricsId - The ID of the lyrics record (CUID string)
 * @returns The embedding vector or null if not found
 */
export const getLyricsEmbedding = async (
  lyricsId: string
): Promise<number[] | null> => {
  try {
    // Query the database for the embedding
    const result = await prisma.$queryRawTyped(getEmbedding(lyricsId));

    if (result.length === 0) {
      return null;
    }

    // Parse the vector string to array of numbers
    // pgvector returns vectors as strings like "[0.1, 0.2, 0.3]"
    const embeddingStr = result[0].embedding;
    const embedding = embeddingStr ? JSON.parse(embeddingStr) : null;

    return embedding;
  } catch (error) {
    console.error(
      `Error getting cached embedding for lyrics ${lyricsId}:`,
      error
    );
    return null;
  }
};

/**
 * Write an embedding to the database for a lyrics record
 * @param lyricsId - The ID of the lyrics record (CUID string)
 * @param embedding - The embedding vector to store
 */
export const writeLyricsEmbedding = async (
  lyricsId: string,
  embedding: number[]
): Promise<void> => {
  try {
    // Convert embedding array to pgvector format string
    const embeddingStr = `[${embedding.join(",")}]`;

    // Upsert the embedding using raw SQL
    await prisma.$queryRawTyped(upsertEmbedding(lyricsId, embeddingStr));
  } catch (error) {
    console.error(`Error writing embedding for lyrics ${lyricsId}:`, error);
    throw error;
  }
};

/**
 * Semantic search for similar lyrics using vector similarity
 * @param queryEmbedding - The embedding vector to search for
 * @returns Array of lyrics IDs (CUID strings) ordered by similarity
 */
export const semanticSearchEmbeddings = async (
  queryEmbedding: number[]
): Promise<string[]> => {
  try {
    // Convert embedding array to pgvector format string
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Query for similar embeddings using cosine distance operator (<=>)
    const results = await prisma.$queryRawTyped(semanticSearch(embeddingStr));

    return results.map((r: { id: string }) => r.id);
  } catch (error) {
    console.error("Error performing semantic search:", error);
    throw error;
  }
};
