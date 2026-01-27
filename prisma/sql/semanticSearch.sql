-- prisma/sql/semanticSearch.sql
-- @param {String} $1:queryVector

SELECT lyrics_id as id
FROM "lyrics_embeddings"
ORDER BY embedding <=> $1::vector
LIMIT 5;
