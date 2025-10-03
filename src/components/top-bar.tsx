import { ThemeToggle } from "./theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SearchIcon } from "lucide-react";

export function TopBar({ showSidebar }: { showSidebar: boolean }) {
  return (
    <div className="border-b relative">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        {showSidebar && (
          <SidebarTrigger className="lg:absolute lg:left-6 lg:top-1/2 lg:-translate-y-1/2 transition-none" />
        )}
        {/* Dummy div to properly space the title */}
        {showSidebar && <div className="xl:hidden hidden lg:block" />}
        <div className="flex items-center gap-8">
          <Link href="/">
            <h1 className="text-xl font-semibold">Personal Assistant</h1>
          </Link>
          <Button variant="link" size="sm" asChild>
            <Link href="/search" className="flex items-center gap-2">
              <SearchIcon />
              Data
            </Link>
          </Button>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
