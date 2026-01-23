"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon, MusicIcon } from "lucide-react";
import { useState } from "react";
import { TrackWithLyrics } from "./page";

function TrackCard({ track }: { track: TrackWithLyrics }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-full bg-primary/10">
          <MusicIcon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-0.5">
                {track.trackName} by {track.artistName}
              </h3>
            </div>
          </div>

          <p className="text-sm text-foreground/80 mt-2 line-clamp-2">
            {track.lyrics
              ? track.lyrics.lyricsBody.slice(0, 100) + "..."
              : "No lyrics available."}
          </p>
          {track.lyrics && (
            <>
              {expanded && (
                <div className="mt-3 pt-3 border-t">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {track.lyrics
                        ? track.lyrics.lyricsBody
                        : "No lyrics available."}
                    </pre>
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="mt-2 h-8 text-primary hover:text-primary px-2"
              >
                {expanded ? (
                  <>
                    <ChevronUpIcon className="h-3.5 w-3.5 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="h-3.5 w-3.5 mr-1" />
                    See more
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export function TrackList({ tracks }: { tracks: TrackWithLyrics[] }) {
  if (tracks.length === 0) {
    return (
      <div className="text-center py-12">
        <MusicIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tracks found</h3>
        <p className="text-muted-foreground">Try adjusting your search query</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tracks.map((track) => (
        <TrackCard key={track.id} track={track} />
      ))}
    </div>
  );
}
