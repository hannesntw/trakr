import { cn } from "@/lib/utils";
import {
  TYPE_COLORS,
  TYPE_LABELS,
  TYPE_DOT_COLORS,
  type WorkItemType,
  type WorkflowState,
} from "@/lib/constants";

export function TypeBadge({ type }: { type: WorkItemType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border",
        TYPE_COLORS[type]
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", TYPE_DOT_COLORS[type])} />
      {TYPE_LABELS[type]}
    </span>
  );
}

/** Category-based fallback colors when workflow states are not provided */
const CATEGORY_COLORS: Record<string, string> = {
  todo: "text-gray-600 bg-gray-50 border-gray-200",
  in_progress: "text-indigo-600 bg-indigo-50 border-indigo-200",
  done: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

const FALLBACK_COLOR = "text-gray-600 bg-gray-50 border-gray-200";

export function StateBadge({
  state,
  workflowStates,
}: {
  state: string;
  workflowStates?: WorkflowState[];
}) {
  const ws = workflowStates?.find((w) => w.slug === state);

  if (ws) {
    // Build Tailwind classes from the workflow state's hex color
    const categoryColor = CATEGORY_COLORS[ws.category] ?? FALLBACK_COLOR;
    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
          categoryColor
        )}
      >
        {ws.displayName}
      </span>
    );
  }

  // Fallback: show raw slug when no workflow states available
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        FALLBACK_COLOR
      )}
    >
      {state}
    </span>
  );
}

export function IdBadge({ id }: { id: number }) {
  return (
    <span className="text-xs text-text-tertiary font-mono">#{id}</span>
  );
}
