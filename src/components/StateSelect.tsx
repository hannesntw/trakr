"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { WorkflowState } from "@/lib/constants";

/** Category-based colors for state badges */
const CATEGORY_COLORS: Record<string, string> = {
  todo: "text-gray-600 bg-gray-50 border-gray-200",
  in_progress: "text-indigo-600 bg-indigo-50 border-indigo-200",
  done: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

const FALLBACK_COLOR = "text-gray-600 bg-gray-50 border-gray-200";

interface StateSelectProps {
  value: string;
  onChange: (state: string) => void;
  workflowStates: WorkflowState[];
  size?: "sm" | "md";
}

export function StateSelect({
  value,
  onChange,
  workflowStates,
  size = "sm",
}: StateSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = workflowStates.find((w) => w.slug === value);
  const currentColor = current
    ? (CATEGORY_COLORS[current.category] ?? FALLBACK_COLOR)
    : FALLBACK_COLOR;
  const currentLabel = current?.displayName ?? value;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center rounded text-xs font-medium border transition-colors cursor-pointer",
          currentColor,
          size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1"
        )}
      >
        {currentLabel}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]">
          {workflowStates.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                onChange(ws.slug);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-content-bg transition-colors",
                ws.slug === value && "bg-content-bg font-medium"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border",
                  CATEGORY_COLORS[ws.category] ?? FALLBACK_COLOR
                )}
              >
                {ws.displayName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
