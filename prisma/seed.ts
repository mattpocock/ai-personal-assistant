// Phase 1: Unique Track Extraction Only
// Database operations will be added in future phases

import { readFile, writeFile } from "fs/promises";
import path from "path";

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

/**
 * Load spotify-test.json from /data directory
 */
async function loadSpotifyTestFile(): Promise<SpotifyStreamingRecord[]> {
  console.log("Loading spotify-test.json...");
  const dataDir = path.join(process.cwd(), "data");
  const filePath = path.join(dataDir, "spotify-test.json");

  const fileContent = await readFile(filePath, "utf-8");
  const data = JSON.parse(fileContent);

  // Handle both single object and array of objects
  const records: SpotifyStreamingRecord[] = Array.isArray(data) ? data : [data];

  console.log(`  - Loaded ${records.length} records from spotify-test.json`);
  return records;
}

/**
 * Extract unique tracks from streaming records
 */
function extractUniqueTracks(
  records: SpotifyStreamingRecord[]
): UniqueTrack[] {
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

// Main Function

export async function main() {
  console.log("=== Spotify Data Loading Script - Phase 1: Unique Track Extraction ===\n");

  try {
    // Load test file
    const records = await loadSpotifyTestFile();

    // Extract unique tracks
    const uniqueTracks = extractUniqueTracks(records);

    // Output results to console
    console.log("\n=== Unique Tracks Extracted ===");
    console.log(`Total records: ${records.length}`);
    console.log(`Unique tracks: ${uniqueTracks.length}`);

    console.log("\nSample tracks:");
    uniqueTracks.slice(0, 5).forEach((track) => {
      console.log(`  - ${track.trackName} by ${track.artistName}`);
    });

    // Save to JSON file for inspection
    const dataDir = path.join(process.cwd(), "data");
    const outputPath = path.join(dataDir, "extracted-tracks.json");
    await writeFile(outputPath, JSON.stringify(uniqueTracks, null, 2));
    console.log(`\nFull track list saved to: ${outputPath}`);

    console.log("\n=== Phase 1 completed successfully! ===");
    console.log("Next step: Verify the extracted tracks, then proceed to lyrics fetching.");
  } catch (error) {
    console.error("\n=== Error during data loading ===");
    console.error(error);
    throw error;
  }
}

main();
