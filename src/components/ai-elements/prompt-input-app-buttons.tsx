"use client";

import { availableApps } from "@/app/api/chat/apps-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PromptInputAppButtons = (props: {
  taggedAppIds: string[];
  onToggle: (appId: string) => void;
}) => {
  return (
    <div className="flex gap-2">
      {availableApps.map((app) => {
        const isActive = props.taggedAppIds.includes(app.id);
        const Icon = app.icon;

        return (
          <Button
            key={app.id}
            type="button"
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => props.onToggle(app.id)}
            className={cn(
              "flex items-center gap-1.5 min-w-fit",
              isActive && "bg-primary text-primary-foreground"
            )}
          >
            <Icon className="size-3 shrink-0" />
            <span className="text-xs whitespace-nowrap">{app.name}</span>
          </Button>
        );
      })}
    </div>
  );
};
