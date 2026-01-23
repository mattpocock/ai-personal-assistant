"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

export function SearchInput({
  initialQuery,
  currentPerPage,
  placeholder = "Search ...",
  url = "/search",
}: {
  initialQuery: string;
  currentPerPage: number;
  placeholder?: string;
  url?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (currentPerPage !== 10) {
      params.set("perPage", currentPerPage.toString());
    }
    const queryString = params.toString();
    router.push(queryString ? `${url}?${queryString}` : url);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md flex-1">
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 flex-shrink-0"
      />
      <Button type="submit" size="default">
        <SearchIcon className="h-4 w-4 mr-2" />
        Search
      </Button>
    </form>
  );
}
