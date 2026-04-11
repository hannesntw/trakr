"use client";

import { TypeBadge, IdBadge } from "@/components/Badge";
import type { WorkItemType } from "@/lib/constants";

interface BoardCardProps {
  id: number;
  title: string;
  type: WorkItemType;
  assignee: string | null;
  projectKey: string;
  parentTitle?: string;
}

export function BoardCard({
  id,
  title,
  type,
  assignee,
  parentTitle,
}: BoardCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3 hover:border-border-hover hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <TypeBadge type={type} />
        <IdBadge id={id} />
      </div>
      <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors line-clamp-2">
        {title}
      </p>
      {parentTitle && (
        <p className="text-xs text-text-tertiary mt-1 truncate">
          {parentTitle}
        </p>
      )}
      {assignee && (
        <div className="flex items-center gap-1.5 mt-2.5">
          <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center">
            {assignee
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
          <span className="text-xs text-text-secondary">{assignee}</span>
        </div>
      )}
    </div>
  );
}
