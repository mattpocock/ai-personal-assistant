import { ThemeToggle } from "./theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SearchIcon } from "lucide-react";

export function TopBar({
  showSidebar,
  title,
}: {
  showSidebar: boolean;
  title: string;
}) {
  return (
    <div className="border-b relative px-3 h-16 flex items-center justify-between">
      {showSidebar && <SidebarTrigger className="transition-none" />}
      <div className="max-w-4xl w-full mx-auto px-3 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <h1 className="lg:text-2xl sm:text-xl text-lg font-bold">{title}</h1>
        </div>
      </div>
      <ThemeToggle />
    </div>
  );
}
