-- prisma/sql/getEmbedding.sql
-- @param {String} $1:lyricsId

SELECT lyrics_id as id, embedding::text as embedding
FROM "lyrics_embeddings"
WHERE lyrics_id = $1;
