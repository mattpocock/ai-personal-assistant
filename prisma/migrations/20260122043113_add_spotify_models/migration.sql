/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropTable
DROP TABLE "Post";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "spotify_track_uri" TEXT NOT NULL,
    "track_name" TEXT NOT NULL,
    "artist_name" TEXT NOT NULL,
    "album_name" TEXT NOT NULL,
    "genre" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spotify_streaming_history" (
    "id" TEXT NOT NULL,
    "track_id" TEXT,
    "ts" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL,
    "ms_played" INTEGER NOT NULL,
    "conn_country" TEXT NOT NULL,
    "ip_addr" TEXT,
    "reason_start" TEXT NOT NULL,
    "reason_end" TEXT NOT NULL,
    "shuffle" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "offline_timestamp" TIMESTAMP(3),
    "incognito_mode" BOOLEAN NOT NULL DEFAULT false,
    "episode_name" TEXT,
    "episode_show_name" TEXT,
    "spotify_episode_uri" TEXT,
    "audiobook_title" TEXT,
    "audiobook_uri" TEXT,
    "audiobook_chapter_uri" TEXT,
    "audiobook_chapter_title" TEXT,

    CONSTRAINT "spotify_streaming_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lyrics" (
    "id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "lyrics_body" TEXT NOT NULL,
    "lyrics_language" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lyrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tracks_spotify_track_uri_key" ON "tracks"("spotify_track_uri");

-- CreateIndex
CREATE INDEX "tracks_artist_name_idx" ON "tracks"("artist_name");

-- CreateIndex
CREATE INDEX "tracks_genre_idx" ON "tracks"("genre");

-- CreateIndex
CREATE INDEX "spotify_streaming_history_ts_idx" ON "spotify_streaming_history"("ts");

-- CreateIndex
CREATE INDEX "spotify_streaming_history_track_id_idx" ON "spotify_streaming_history"("track_id");

-- CreateIndex
CREATE INDEX "spotify_streaming_history_conn_country_ts_idx" ON "spotify_streaming_history"("conn_country", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "lyrics_track_id_key" ON "lyrics"("track_id");

-- AddForeignKey
ALTER TABLE "spotify_streaming_history" ADD CONSTRAINT "spotify_streaming_history_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lyrics" ADD CONSTRAINT "lyrics_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
