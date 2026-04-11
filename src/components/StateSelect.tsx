"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  WORK_ITEM_STATES,
  STATE_COLORS,
  STATE_LABELS,
  type WorkItemState,
} from "@/lib/constants";

interface StateSelectProps {
  value: WorkItemState;
  onChange: (state: WorkItemState) => void;
  size?: "sm" | "md";
}

export function StateSelect({
  value,
  onChange,
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center rounded text-xs font-medium border transition-colors cursor-pointer",
          STATE_COLORS[value],
          size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1"
        )}
      >
        {STATE_LABELS[value]}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-50 py-1 min-w-[140px]">
          {WORK_ITEM_STATES.map((state) => (
            <button
              key={state}
              onClick={() => {
                onChange(state);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-content-bg transition-colors",
                state === value && "bg-content-bg font-medium"
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border",
                  STATE_COLORS[state]
                )}
              >
                {STATE_LABELS[state]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
