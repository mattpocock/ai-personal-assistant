import { TopBar } from "@/components/top-bar";
import { EmailList } from "../search/email-list";
import { SearchPagination } from "../search/search-pagination";
import { PerPageSelector } from "../search/per-page-selector";
import { loadChats, loadMemories } from "@/lib/persistence-layer";
import { CHAT_LIMIT } from "../page";
import { SideBar } from "@/components/side-bar";
import { loadEmails, searchEmailsWithRRF } from "../search";
import { SearchInput } from "../search/search-input";
import { loadTracks } from "@/lib/db";
import { Lyrics, Track } from "../generated/prisma/client";
import { TrackList } from "./track-list";

export type TrackWithLyrics = Track & {
  lyrics: Lyrics | null;
};

export default async function TrackSearchPage(props: {
  searchParams: Promise<{ q?: string; page?: string; perPage?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams.q || "";
  const page = Number(searchParams.page) || 1;
  const perPage = Number(searchParams.perPage) || 10;

  const allTracks = await loadTracks();

  //const emailsWithScores = await searchEmailsWithRRF(query, allTracks);

  // Transform emails to match the expected format
  /*  const transformedEmails = emailsWithScores
    .map(({ item: email, score }) => ({
      id: email.id,
      from: email.from,
      subject: email.subject,
      preview: email.chunk.substring(0, 100) + "...",
      content: email.chunk,
      date: email.timestamp,
      score: score,
      chunkIndex: email.index,
      totalChunks: email.totalChunks,
    }))
    .sort((a, b) => b.score - a.score); */

  // Filter emails based on search query
  /* const filteredEmails = query
    ? transformedEmails.filter((email) => email.score > 0)
    : transformedEmails; */

  const totalPages = Math.ceil(allTracks.length / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedTracks = allTracks.slice(startIndex, startIndex + perPage);
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
              />
              <PerPageSelector currentPerPage={perPage} query={query} />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {query ? (
                    <>
                      Found {allTracks.length} result
                      {allTracks.length !== 1 ? "s" : ""} for &ldquo;
                      {query}
                      &rdquo;
                    </>
                  ) : (
                    <>Found {allTracks.length} tracks</>
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
