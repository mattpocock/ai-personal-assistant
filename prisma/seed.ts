// Phase 3: Complete Pipeline - Track Extraction + Lyrics Fetching + Database Seeding

import "dotenv/config";
import { readFile, writeFile, readdir } from "fs/promises";
import path from "path";
import prisma from "../lib/prisma.js";

// Types
interface SpotifyStreamingRecord {
  ts: string;
  platform: string;
  ms_played: number;
  conn_country: string;
  ip_addr: string | null;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string | null;
  episode_name: string | null;
  episode_show_name: string | null;
  spotify_episode_uri: string | null;
  audiobook_title: string | null;
  audiobook_uri: string | null;
  audiobook_chapter_uri: string | null;
  audiobook_chapter_title: string | null;
  reason_start: string;
  reason_end: string;
  shuffle: boolean;
  skipped: boolean;
  offline: boolean;
  offline_timestamp: string | null;
  incognito_mode: boolean;
}

interface UniqueTrack {
  spotifyTrackUri: string;
  trackName: string;
  artistName: string;
  albumName: string;
}

interface LyricsResponse {
  lyricsBody: string;
  lyricsLanguage: string;
}

interface TrackWithLyrics extends UniqueTrack {
  lyrics?: LyricsResponse;
  lyricsError?: string;
}

/**
 * Load all Spotify JSON files from /data directory
 */
async function loadSpotifyJsonFiles(): Promise<SpotifyStreamingRecord[]> {
  console.log("Loading Spotify JSON files from /data directory...");
  const dataDir = path.join(process.cwd(), "data");
  const files = await readdir(dataDir);

  // Filter for Spotify JSON files (files containing 'spotify' in the name)
  const spotifyFiles = files.filter(
    (f) => f.toLowerCase().includes("spotify") && f.endsWith(".json")
  );

  console.log(`Found ${spotifyFiles.length} Spotify JSON file(s)`);

  const allRecords: SpotifyStreamingRecord[] = [];

  for (const file of spotifyFiles) {
    const filePath = path.join(dataDir, file);
    const fileContent = await readFile(filePath, "utf-8");
    const data = JSON.parse(fileContent);

    // Handle both single object and array of objects
    const records: SpotifyStreamingRecord[] = Array.isArray(data)
      ? data
      : [data];
    allRecords.push(...records);

    console.log(`  - Loaded ${records.length} records from ${file}`);
  }

  console.log(`Total records loaded: ${allRecords.length}`);
  return allRecords;
}

/**
 * Extract unique tracks from streaming records
 */
function extractUniqueTracks(records: SpotifyStreamingRecord[]): UniqueTrack[] {
  console.log("\nExtracting unique tracks...");

  const trackMap = new Map<string, UniqueTrack>();

  for (const record of records) {
    // Only process music tracks (not episodes or audiobooks)
    if (
      record.spotify_track_uri &&
      record.master_metadata_track_name &&
      record.master_metadata_album_artist_name &&
      record.master_metadata_album_album_name
    ) {
      if (!trackMap.has(record.spotify_track_uri)) {
        trackMap.set(record.spotify_track_uri, {
          spotifyTrackUri: record.spotify_track_uri,
          trackName: record.master_metadata_track_name,
          artistName: record.master_metadata_album_artist_name,
          albumName: record.master_metadata_album_album_name,
        });
      }
    }
  }

  const uniqueTracks = Array.from(trackMap.values());
  console.log(`  Found ${uniqueTracks.length} unique tracks`);

  return uniqueTracks;
}

/**
 * Fetch lyrics for a track from the API
 * @param track - The track to fetch lyrics for
 * @returns Promise with lyrics data or error
 */
async function fetchLyricsForTrack(
  track: UniqueTrack
): Promise<LyricsResponse | null> {
  const LYRICS_API_URL = `${process.env.LYRICS_URL}?apikey=${process.env.LYRICS_API_KEY}`;

  try {
    const params = new URLSearchParams({
      q_artist: track.artistName,
      q_track: track.trackName,
    });
    const response = await fetch(`${LYRICS_API_URL}&${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Parse Musixmatch API response format
    const lyrics = data.message?.body?.lyrics;

    if (!lyrics || !lyrics.lyrics_body) {
      throw new Error("No lyrics found in API response");
    }

    return {
      lyricsBody: lyrics.lyrics_body,
      lyricsLanguage: lyrics.lyrics_language || "en",
    };
  } catch (error) {
    console.error(
      `  ✗ Failed to fetch lyrics for "${track.trackName}" by ${track.artistName}:`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Fetch lyrics for all unique tracks
 * @param tracks - Array of unique tracks
 * @returns Array of tracks with lyrics data
 */
async function fetchAllLyrics(
  tracks: UniqueTrack[]
): Promise<TrackWithLyrics[]> {
  console.log(`\n=== Fetching Lyrics for ${tracks.length} Tracks ===`);

  const tracksWithLyrics: TrackWithLyrics[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    console.log(
      `[${i + 1}/${tracks.length}] Fetching lyrics for "${track.trackName}" by ${track.artistName}...`
    );

    const lyrics = await fetchLyricsForTrack(track);

    if (lyrics) {
      tracksWithLyrics.push({
        ...track,
        lyrics,
      });
      successCount++;
      console.log(`  ✓ Success`);
    } else {
      tracksWithLyrics.push({
        ...track,
        lyricsError: "Failed to fetch lyrics",
      });
      failCount++;
    }

    // Add a small delay to avoid rate limiting
    if (i < tracks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`\n=== Lyrics Fetching Complete ===`);
  console.log(`  ✓ Success: ${successCount}`);
  console.log(`  ✗ Failed: ${failCount}`);

  return tracksWithLyrics;
}

// ============================================================================
// Database Insertion Functions
// ============================================================================

/**
 * Map UniqueTrack to Prisma Track input format
 */
function mapToTrackInput(track: UniqueTrack) {
  return {
    spotifyTrackUri: track.spotifyTrackUri,
    trackName: track.trackName,
    artistName: track.artistName,
    albumName: track.albumName,
    genre: null,
  };
}

/**
 * Map SpotifyStreamingRecord to Prisma SpotifyStreamingHistory input
 */
function mapToStreamingHistoryInput(
  record: SpotifyStreamingRecord,
  trackIdMap: Map<string, string>
) {
  return {
    trackId: record.spotify_track_uri
      ? (trackIdMap.get(record.spotify_track_uri) ?? null)
      : null,
    ts: new Date(record.ts),
    platform: record.platform,
    msPlayed: record.ms_played,
    connCountry: record.conn_country,
    ipAddr: record.ip_addr,
    reasonStart: record.reason_start,
    reasonEnd: record.reason_end,
    shuffle: record.shuffle,
    skipped: record.skipped,
    offline: record.offline,
    offlineTimestamp: record.offline_timestamp
      ? new Date(record.offline_timestamp)
      : null,
    incognitoMode: record.incognito_mode,
    episodeName: record.episode_name,
    episodeShowName: record.episode_show_name,
    spotifyEpisodeUri: record.spotify_episode_uri,
    audiobookTitle: record.audiobook_title,
    audiobookUri: record.audiobook_uri,
    audiobookChapterUri: record.audiobook_chapter_uri,
    audiobookChapterTitle: record.audiobook_chapter_title,
  };
}

/**
 * Insert tracks into database using upsert
 * Returns a map of spotifyTrackUri -> trackId for foreign key relationships
 */
async function insertTracks(
  tracks: TrackWithLyrics[],
  tx: any
): Promise<Map<string, string>> {
  console.log(`\n=== Inserting ${tracks.length} Tracks ===`);

  const trackIdMap = new Map<string, string>();
  let insertedCount = 0;
  let updatedCount = 0;

  for (const track of tracks) {
    const result = await tx.track.upsert({
      where: { spotifyTrackUri: track.spotifyTrackUri },
      update: {
        trackName: track.trackName,
        artistName: track.artistName,
        albumName: track.albumName,
      },
      create: mapToTrackInput(track),
    });

    trackIdMap.set(track.spotifyTrackUri, result.id);

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      insertedCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(`  ✓ Inserted: ${insertedCount}, Updated: ${updatedCount}`);
  return trackIdMap;
}

/**
 * Insert lyrics for tracks that have them
 */
async function insertLyrics(
  tracks: TrackWithLyrics[],
  trackIdMap: Map<string, string>,
  tx: any
): Promise<void> {
  console.log(`\n=== Inserting Lyrics ===`);

  const tracksWithLyrics = tracks.filter((t) => t.lyrics);
  console.log(`  Found ${tracksWithLyrics.length} tracks with lyrics`);

  let successCount = 0;
  let skipCount = 0;

  for (const track of tracksWithLyrics) {
    const trackId = trackIdMap.get(track.spotifyTrackUri);
    if (!trackId) {
      console.warn(`  ⚠ No trackId found for ${track.spotifyTrackUri}`);
      skipCount++;
      continue;
    }

    try {
      await tx.lyrics.upsert({
        where: { trackId },
        update: {
          lyricsBody: track.lyrics!.lyricsBody,
          lyricsLanguage: track.lyrics!.lyricsLanguage,
        },
        create: {
          trackId,
          lyricsBody: track.lyrics!.lyricsBody,
          lyricsLanguage: track.lyrics!.lyricsLanguage,
        },
      });
      successCount++;
    } catch (error) {
      console.error(
        `  ✗ Failed to insert lyrics for ${track.trackName}:`,
        error
      );
      skipCount++;
    }
  }

  console.log(`  ✓ Inserted: ${successCount}, Skipped: ${skipCount}`);
}

/**
 * Insert streaming history records in batches
 */
async function insertStreamingHistory(
  records: SpotifyStreamingRecord[],
  trackIdMap: Map<string, string>,
  tx: any
): Promise<void> {
  console.log(
    `\n=== Inserting ${records.length} Streaming History Records ===`
  );

  const historyInputs = records.map((record) =>
    mapToStreamingHistoryInput(record, trackIdMap)
  );

  const BATCH_SIZE = 1000;
  let totalInserted = 0;

  for (let i = 0; i < historyInputs.length; i += BATCH_SIZE) {
    const batch = historyInputs.slice(i, i + BATCH_SIZE);
    const result = await tx.spotifyStreamingHistory.createMany({
      data: batch,
      skipDuplicates: false,
    });

    totalInserted += result.count;
    console.log(
      `  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: Inserted ${result.count} records`
    );
  }

  console.log(`  ✓ Total inserted: ${totalInserted}`);
}

/**
 * Main database seeding function - wraps all insertions in a transaction
 */
async function seedDatabase(
  records: SpotifyStreamingRecord[],
  tracksWithLyrics: TrackWithLyrics[]
): Promise<void> {
  console.log("\n=== Phase 3: Database Insertion ===");

  try {
    await prisma.$transaction(
      async (tx) => {
        // Step 1: Insert/Update tracks and get ID mapping
        const trackIdMap = await insertTracks(tracksWithLyrics, tx);

        // Step 2: Insert lyrics for tracks that have them
        await insertLyrics(tracksWithLyrics, trackIdMap, tx);

        // Step 3: Insert streaming history records
        await insertStreamingHistory(records, trackIdMap, tx);
      },
      {
        maxWait: 20000, // Maximum time to wait for transaction to start (20 seconds)
        timeout: 60000, // Maximum time for transaction to complete (60 seconds)
      }
    );

    console.log("\n✓ Database seeding completed successfully!");
  } catch (error) {
    console.error("\n✗ Database seeding failed:");
    console.error(error);
    throw error;
  }
}

/**
 * Verify database seeding results
 */
async function verifySeeding(): Promise<void> {
  console.log("\n=== Verifying Database Seeding ===");

  const trackCount = await prisma.track.count();
  const lyricsCount = await prisma.lyrics.count();
  const historyCount = await prisma.spotifyStreamingHistory.count();

  console.log(`  Tracks: ${trackCount}`);
  console.log(`  Lyrics: ${lyricsCount}`);
  console.log(`  Streaming History: ${historyCount}`);

  const tracksWithLyrics = await prisma.track.count({
    where: { lyrics: { isNot: null } },
  });
  console.log(`  Tracks with lyrics: ${tracksWithLyrics}`);

  const historyWithTracks = await prisma.spotifyStreamingHistory.count({
    where: { trackId: { not: null } },
  });
  console.log(`  History records linked to tracks: ${historyWithTracks}`);
}

// Main Function

export async function main() {
  console.log(
    "=== Spotify Data Loading Script - Phase 3: Complete Pipeline ===\n"
  );

  try {
    // Phase 1: Load all Spotify JSON files
    const records = await loadSpotifyJsonFiles();

    // Phase 2: Extract unique tracks
    const uniqueTracks = extractUniqueTracks(records);

    // Output results to console
    console.log("\n=== Unique Tracks Extracted ===");
    console.log(`Total records: ${records.length}`);
    console.log(`Unique tracks: ${uniqueTracks.length}`);

    console.log("\nSample tracks:");
    uniqueTracks.slice(0, 5).forEach((track) => {
      console.log(`  - ${track.trackName} by ${track.artistName}`);
    });

    // Save extracted tracks to JSON file for inspection
    const dataDir = path.join(process.cwd(), "data");
    const extractedTracksPath = path.join(dataDir, "extracted-tracks.json");
    await writeFile(extractedTracksPath, JSON.stringify(uniqueTracks, null, 2));
    console.log(`\nExtracted tracks saved to: ${extractedTracksPath}`);

    // Phase 2: Fetch lyrics for all tracks
    const tracksWithLyrics = await fetchAllLyrics(uniqueTracks);

    // Save tracks with lyrics to JSON file
    const tracksWithLyricsPath = path.join(dataDir, "tracks-with-lyrics.json");
    await writeFile(
      tracksWithLyricsPath,
      JSON.stringify(tracksWithLyrics, null, 2)
    );
    console.log(`\nTracks with lyrics saved to: ${tracksWithLyricsPath}`);

    // Phase 3: Database insertion
    await seedDatabase(records, tracksWithLyrics);

    // Verify seeding results
    await verifySeeding();

    console.log("\n=== All Phases Completed Successfully! ===");
  } catch (error) {
    console.error("\n=== Error during seeding ===");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
