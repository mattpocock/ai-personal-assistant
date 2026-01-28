import { TopBar } from "@/components/top-bar";
import { SearchPagination } from "../search/search-pagination";
import { PerPageSelector } from "../search/per-page-selector";
import { loadChats, loadMemories } from "@/lib/persistence-layer";
import { CHAT_LIMIT } from "../page";
import { SideBar } from "@/components/side-bar";
import { SearchInput } from "../search/search-input";
import { Lyrics, Track } from "../generated/prisma/client";
import { TrackList } from "./track-list";
import { searchLyricsWithRRF, toTrackType } from "../search-db";
import { getAllEmbeddings } from "../generated/prisma/sql";
import prisma from "../../../lib/prisma";

export type TrackWithLyrics = Track & {
  lyrics: Lyrics | null;
};

export type TrackWithScore = TrackWithLyrics & {
  score: number;
};

export default async function TrackSearchPage(props: {
  searchParams: Promise<{ q?: string; page?: string; perPage?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams.q || "";
  const page = Number(searchParams.page) || 1;
  const perPage = Number(searchParams.perPage) || 10;
  const tracksWithEmbeddings = await prisma.$queryRawTyped(getAllEmbeddings());

  const tracksWithScores = query
    ? await searchLyricsWithRRF(query, tracksWithEmbeddings)
    : tracksWithEmbeddings.map((track) => ({
        item: toTrackType(track),
        score: 0,
      }));

  const transformedTracks: TrackWithScore[] = tracksWithScores
    .map(({ item, score }) => ({
      ...item,
      score,
    }))
    .sort((a, b) => b.score - a.score);

  // Filter tracks based on search query
  const filteredTracks = query
    ? transformedTracks.filter((track) => track.score > 0)
    : transformedTracks;

  const totalPages = Math.ceil(filteredTracks.length / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedTracks = filteredTracks.slice(
    startIndex,
    startIndex + perPage
  );
  const allChats = await loadChats();
  const chats = allChats.slice(0, CHAT_LIMIT);
  const memories = await loadMemories();

  return (
    <>
      <SideBar chats={chats} memories={memories} chatIdFromSearchParams={""} />
      <div className="h-screen flex flex-col w-full">
        <TopBar showSidebar={true} title="Tracks" />
        <div className="flex-1">
          <div className="max-w-4xl mx-auto xl:px-2 px-6 py-6">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Search through your listened tracks
              </p>
            </div>

            <div className="flex md:items-center md:justify-between gap-4 flex-col md:flex-row">
              <SearchInput
                initialQuery={query}
                currentPerPage={perPage}
                placeholder="Search tracks..."
                url="/track-search"
              />
              <PerPageSelector currentPerPage={perPage} query={query} />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {query ? (
                    <>
                      Found {filteredTracks.length} result
                      {filteredTracks.length !== 1 ? "s" : ""} for &ldquo;
                      {query}
                      &rdquo;
                    </>
                  ) : (
                    <>Found {filteredTracks.length} tracks</>
                  )}
                </p>
              </div>
              <TrackList tracks={paginatedTracks} />
              {totalPages > 1 && (
                <div className="mt-6">
                  <SearchPagination
                    currentPage={page}
                    totalPages={totalPages}
                    query={query}
                    perPage={perPage}
                    url="/track-search"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
