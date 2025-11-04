import path from "path";
import crypto from "crypto";
import fs from "fs/promises";

const CACHE_DIR = path.join(process.cwd(), "data", "embeddings");

const CACHE_KEY = "google-text-embedding-004";

const getEmbeddingFilePath = (content: string) => {
  const hash = crypto
    .createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, 10);

  return path.join(CACHE_DIR, `${CACHE_KEY}-${hash}.json`);
};

export const ensureEmbeddingsCacheDirectory = async () => {
  await fs.mkdir(CACHE_DIR, { recursive: true });
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

export const writeEmbeddingToCache = async (
  content: string,
  embedding: number[]
) => {
  const filePath = getEmbeddingFilePath(content);
  await fs.writeFile(filePath, JSON.stringify(embedding));
};
