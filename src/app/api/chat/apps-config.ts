import { Calendar, CheckSquare, Notebook, type LucideIcon } from "lucide-react";
import type { ToolSet } from "ai";
import type { MyMessage } from "./route";

export type AppDefinition = {
  id: string;
  name: string;
  icon: LucideIcon;
  toolPrefix: string;
};

export const availableApps: AppDefinition[] = [
  {
    id: "calendar",
    name: "Calendar",
    icon: Calendar,
    toolPrefix: "google_calendar_",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Notebook,
    toolPrefix: "linkedin_",
  },
  {
    id: "tasks",
    name: "Tasks",
    icon: CheckSquare,
    toolPrefix: "google_tasks_",
  },
];

export const filterToolsByApps = (
  tools: ToolSet,
  appIds: string[]
): ToolSet => {
  if (appIds.length === 0) {
    return {};
  }

  // ADDED: Get tool prefixes for the selected app IDs
  const prefixes = availableApps
    .filter((app) => appIds.includes(app.id))
    .map((app) => app.toolPrefix);

  const filteredTools: ToolSet = {};

  // ADDED: Only include tools matching the selected prefixes
  for (const [toolName, tool] of Object.entries(tools)) {
    if (prefixes.some((prefix) => toolName.startsWith(prefix))) {
      filteredTools[toolName] = tool;
    }
  }

  return filteredTools;
};

export const parseAppIdsFromMessage = (
  message: MyMessage | undefined
): string[] => {
  if (!message) return [];

  // ADDED: Extract app IDs from data-app-tag parts
  const appIds = message.parts
    .filter((part) => part.type === "data-app-tag")
    .map((part) => part.data.appId);

  // ADDED: Return unique app IDs
  return [...new Set(appIds)];
};
