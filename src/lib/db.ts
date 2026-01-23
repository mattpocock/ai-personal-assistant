import prisma from "../../lib/prisma";

/**
 * Load all tracks from the database with their lyrics
 */
export async function loadTracks() {
  const tracks = await prisma.track.findMany({
    include: {
      lyrics: true, // Include the related lyrics
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return tracks;
}
