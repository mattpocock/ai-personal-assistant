import BM25 from "okapibm25";
import { embed, cosineSimilarity } from "ai";
import { google } from "@ai-sdk/google";
import { getAllEmbeddings } from "./generated/prisma/sql";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { TrackWithLyrics } from "./track-search/page";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 100,
  separators: ["\n\n", "\n", " ", ""],
});

/* export const chunkEmails = async (emails: Email[]) => {
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
}; */

/* export async function loadEmails(): Promise<Email[]> {
  const filePath = path.join(process.cwd(), "data", "emails.json");
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
} */

export async function searchWithBM25<T, K>(
  keywords: string[],
  items: K[],
  toTtype: (incorrectType: K) => T,
  toText: (item: T) => string
): Promise<{ item: T; score: number }[]> {
  const newItems = items.map((item) => toTtype(item));
  const corpus = newItems.flatMap((item) => toText(item));
  const scores: number[] = (BM25 as any)(corpus, keywords);

  return scores
    .map((score, index) => ({ item: newItems[index], score }))
    .sort((a, b) => b.score - a.score);
}

/* export const emailChunkToText = (email: EmailChunk): string => {
  return `${email.subject} ${email.chunk}`;
}; */

export async function searchWithEmbeddings<
  T,
  K extends { embedding: string | null },
>(
  query: string,
  items: K[],
  toTtype: (incorrectType: K) => T
): Promise<{ item: T; score: number }[]> {
  const { embedding: queryEmbedding } = await embed({
    model: google.textEmbeddingModel("text-embedding-004"),
    value: query,
  });
  const results = items.map((item) => {
    const transformedEmbedding = item.embedding
      ? item.embedding
          .replace(/[\[\]\s]/g, "")
          .split(",")
          .map(Number)
      : null;
    const score =
      transformedEmbedding && transformedEmbedding.length > 0
        ? cosineSimilarity(queryEmbedding, transformedEmbedding)
        : 0;
    const track = toTtype(item);
    return { item: track, score };
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

/* export const emailChunkToId = (email: EmailChunk): string => {
  return `${email.id}-${email.index}`;
}; */

export const toTrackType = (
  incorrectType: getAllEmbeddings.Result
): TrackWithLyrics => {
  return {
    id: incorrectType.track_id!,
    createdAt: incorrectType.track_created_at!,
    updatedAt: incorrectType.track_created_at!,
    spotifyTrackUri: incorrectType.spotify_track_uri!,
    trackName: incorrectType.track_name!,
    artistName: incorrectType.artist_name!,
    albumName: incorrectType.album_name!,
    genre: null,
    lyrics: incorrectType.lyrics_id
      ? {
          id: incorrectType.lyrics_id,
          trackId: incorrectType.track_id!,
          lyricsBody: incorrectType.lyrics_body!,
          createdAt: incorrectType.lyrics_created_at!,
          lyricsLanguage: incorrectType.lyrics_language!,
          updatedAt: incorrectType.lyrics_updated_at!,
        }
      : null,
  };
};

export const searchLyricsWithRRF = async (
  query: string,
  tracks: getAllEmbeddings.Result[]
) => {
  const bm25Ranking = await searchWithBM25<
    TrackWithLyrics,
    getAllEmbeddings.Result
  >(
    query.toLowerCase().split(" "),
    tracks,
    toTrackType,
    (track) =>
      `${track.trackName} ${track.artistName} ${track.albumName}: \n${track.lyrics?.lyricsBody || ""}`
  );
  const embeddingsRanking = await searchWithEmbeddings<
    TrackWithLyrics,
    getAllEmbeddings.Result
  >(query, tracks, toTrackType);
  const rrfRanking = reciprocalRankFusion(
    [bm25Ranking, embeddingsRanking],
    (track) => track.id
  );
  return rrfRanking;
};
