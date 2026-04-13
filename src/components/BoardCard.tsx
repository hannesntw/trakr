"use client";

import { TypeBadge, IdBadge } from "@/components/Badge";
import { PointsBadge } from "@/components/PointsBadge";
import { GitPullRequest, CheckCircle2, XCircle, Circle, GitBranch } from "lucide-react";
import type { WorkItemType } from "@/lib/constants";

export interface GitHubStatus {
  prNumber: number | null;
  prTitle: string | null;
  prState: string | null;
  branch: string | null;
  ciStatus: string | null;
}

interface BoardCardProps {
  id: number;
  displayId?: string | null;
  title: string;
  type: WorkItemType;
  assignee: string | null;
  projectKey: string;
  parentTitle?: string;
  points?: number | null;
  github?: GitHubStatus | null;
}

export function BoardCard({
  id,
  displayId,
  title,
  type,
  assignee,
  parentTitle,
  points,
  github,
}: BoardCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3 hover:border-border-hover hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <TypeBadge type={type} />
        <div className="flex items-center gap-1.5">
          <IdBadge id={id} displayId={displayId} />
          {(type === "story" || type === "bug") && points != null && (
            <PointsBadge points={points} />
          )}
        </div>
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
      {github && (github.prNumber || github.branch) && (
        <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2 flex-wrap">
          {github.prNumber && (
            <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md ${
              github.prState === "merged" ? "bg-purple-50 text-purple-700" :
              github.prState === "closed" ? "bg-red-50 text-red-600" :
              "bg-blue-50 text-blue-700"
            }`}>
              <GitPullRequest className="w-3 h-3" />
              #{github.prNumber}
            </span>
          )}
          {github.ciStatus && (
            <span className={`inline-flex items-center gap-0.5 text-[11px] ${
              github.ciStatus === "success" || github.ciStatus === "passing" ? "text-emerald-600" :
              github.ciStatus === "failure" || github.ciStatus === "failing" ? "text-red-500" :
              "text-amber-500"
            }`}>
              {github.ciStatus === "success" || github.ciStatus === "passing" ? <CheckCircle2 className="w-3 h-3" /> :
               github.ciStatus === "failure" || github.ciStatus === "failing" ? <XCircle className="w-3 h-3" /> :
               <Circle className="w-3 h-3" />}
              CI
            </span>
          )}
          {github.branch && !github.prNumber && (
            <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
              <GitBranch className="w-3 h-3" />
              {github.branch.length > 25 ? github.branch.slice(0, 25) + "..." : github.branch}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
