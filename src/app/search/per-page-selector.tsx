"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

export function PerPageSelector({
  currentPerPage,
  query,
}: {
  currentPerPage: number;
  query: string;
}) {
  const router = useRouter();

  const handleChange = (value: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("perPage", value);
    // Reset to page 1 when changing per page
    params.set("page", "1");
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Show</span>
      <Select
        value={currentPerPage.toString()}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-[70px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10</SelectItem>
          <SelectItem value="25">25</SelectItem>
          <SelectItem value="50">50</SelectItem>
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">per page</span>
    </div>
  );
}
