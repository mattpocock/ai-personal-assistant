-- prisma/sql/upsertEmbedding.sql
-- @param {String} $1:lyricsId
-- @param {String} $2:embeddingVector

INSERT INTO "lyrics_embeddings" (lyrics_id, embedding)
VALUES ($1, $2::vector)
ON CONFLICT (lyrics_id)
DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW();
