import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  return (
    <div className="border-b">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Personal Assistant</h1>
        <ThemeToggle />
      </div>
    </div>
  );
}
