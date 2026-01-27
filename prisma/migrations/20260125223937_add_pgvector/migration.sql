-- prisma/migrations/<timestamp>-add-pgvector/migration.sql

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "lyrics_embeddings" (
  id SERIAL PRIMARY KEY,
  embedding VECTOR(1536)
);
