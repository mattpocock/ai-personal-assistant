SELECT
  t.id                     AS track_id,
  t.spotify_track_uri,
  t.track_name,
  t.artist_name,
  t.album_name,
  t.genre,
  t.created_at             AS track_created_at,

  l.id                     AS lyrics_id,
  l.lyrics_body,
  l.lyrics_language,
  l.created_at             AS lyrics_created_at,
  l.updated_at             AS lyrics_updated_at,

  le.embedding,
  le.created_at            AS embedding_created_at
FROM tracks t
LEFT JOIN lyrics l
  ON l.track_id = t.id
LEFT JOIN lyrics_embeddings le
  ON le.lyrics_id = l.id;

