-- prisma/migrations/<timestamp>-add-pgvector/migration.sql
-- Migration to add pgvector extension and lyrics_embeddings table
-- This migration creates the lyrics_embeddings table with proper relationship to lyrics

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing lyrics_embeddings table if it exists (in case of re-run)
DROP TABLE IF EXISTS "lyrics_embeddings";

-- Create lyrics_embeddings table with foreign key to lyrics
CREATE TABLE "lyrics_embeddings" (
  lyrics_id TEXT PRIMARY KEY,
  embedding VECTOR(768), -- Google text-embedding-004 produces 768-dimensional vectors
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint to lyrics table
  CONSTRAINT "lyrics_embeddings_lyrics_id_fkey"
    FOREIGN KEY (lyrics_id)
    REFERENCES lyrics(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Create index on lyrics_id for faster lookups
CREATE INDEX "lyrics_embeddings_lyrics_id_idx" ON "lyrics_embeddings"(lyrics_id);

-- Optional: Create index for vector similarity searches (speeds up <=> operations)
-- Uncomment if you want to use HNSW indexing (requires more setup)
-- CREATE INDEX "lyrics_embeddings_embedding_idx" ON "lyrics_embeddings"
-- USING hnsw (embedding vector_cosine_ops);
