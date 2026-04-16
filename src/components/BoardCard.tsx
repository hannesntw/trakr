"use client";

import { TypeBadge, IdBadge } from "@/components/Badge";
import { PointsBadge } from "@/components/PointsBadge";
import { GitPullRequest, CheckCircle2, XCircle, Circle, GitBranch, Square, CheckSquare } from "lucide-react";
import type { WorkItemType } from "@/lib/constants";

export interface GitHubStatus {
  prNumber: number | null;
  prTitle: string | null;
  prState: string | null;
  branch: string | null;
  ciStatus: string | null;
}

export interface ChildTask {
  id: string;
  displayId?: string | null;
  title: string;
  state: string;
}

interface BoardCardProps {
  id: string;
  displayId?: string | null;
  title: string;
  type: WorkItemType;
  state?: string;
  assignee: string | null;
  projectKey: string;
  parentTitle?: string;
  points?: number | null;
  github?: GitHubStatus | null;
  childTasks?: ChildTask[];
  onToggleTask?: (taskId: string, done: boolean) => void;
}

export function BoardCard({
  id,
  displayId,
  title,
  type,
  state,
  assignee,
  parentTitle,
  points,
  github,
  childTasks,
  onToggleTask,
}: BoardCardProps) {
  const isDone = state === "done" || state === "closed";

  return (
    <div className="bg-surface border border-border rounded-lg p-3 hover:border-border-hover hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        {type === "task" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleTask?.(id, !isDone);
            }}
            className="shrink-0 mt-0.5"
          >
            {isDone ? (
              <CheckSquare className="w-4 h-4 text-emerald-500" />
            ) : (
              <Square className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
            )}
          </button>
        ) : (
          <TypeBadge type={type} />
        )}
        <div className="flex items-center gap-1.5">
          <IdBadge id={id} displayId={displayId} />
          {(type === "story" || type === "bug") && points != null && (
            <PointsBadge points={points} />
          )}
        </div>
      </div>
      <p className={`text-sm font-medium group-hover:text-accent transition-colors line-clamp-2 ${
        type === "task" && isDone ? "line-through text-text-tertiary" : "text-text-primary"
      }`}>
        {title}
      </p>
      {parentTitle && (
        <p className="text-xs text-text-tertiary mt-1 truncate">
          {parentTitle}
        </p>
      )}

      {/* Child task checklist (for stories/features with child tasks) */}
      {childTasks && childTasks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">
            Tasks {childTasks.filter((t) => t.state === "done" || t.state === "closed").length}/{childTasks.length}
          </p>
          {childTasks.map((task) => {
            const taskDone = task.state === "done" || task.state === "closed";
            return (
              <div key={task.id} className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTask?.(task.id, !taskDone);
                  }}
                  className="shrink-0"
                >
                  {taskDone ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 transition-colors" />
                  )}
                </button>
                <span className={`text-xs ${taskDone ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                  {task.title}
                </span>
              </div>
            );
          })}
        </div>
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
