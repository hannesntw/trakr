import { cn } from "@/lib/utils";
import {
  TYPE_COLORS,
  TYPE_LABELS,
  STATE_COLORS,
  STATE_LABELS,
  TYPE_DOT_COLORS,
  type WorkItemType,
  type WorkItemState,
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

export function StateBadge({ state }: { state: WorkItemState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        STATE_COLORS[state]
      )}
    >
      {STATE_LABELS[state]}
    </span>
  );
}

export function IdBadge({ id }: { id: number }) {
  return (
    <span className="text-xs text-text-tertiary font-mono">#{id}</span>
  );
}
