import { ThemeToggle } from "./theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function TopBar() {
  return (
    <div className="border-b relative">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <SidebarTrigger className="lg:absolute lg:left-6 lg:top-1/2 lg:-translate-y-1/2 transition-none" />
        <div className="flex items-center gap-2 md:contents">
          <h1 className="text-xl font-semibold">Personal Assistant</h1>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
