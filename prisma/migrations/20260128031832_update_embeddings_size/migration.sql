TRUNCATE TABLE lyrics_embeddings;
ALTER TABLE lyrics_embeddings
ALTER COLUMN embedding
TYPE vector(3072);