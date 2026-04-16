"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterChip<T extends string>({
  label,
  options,
  selected,
  onToggle,
  labelMap,
}: {
  label: string;
  options: readonly T[] | T[];
  selected: Set<T>;
  onToggle: (value: T) => void;
  labelMap: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const active = selected.size > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "h-8 inline-flex items-center gap-1.5 px-3 rounded-md border text-xs font-medium transition-colors cursor-pointer",
          active
            ? "border-accent bg-accent-light text-accent"
            : "border-border bg-surface text-text-secondary hover:border-border-hover"
        )}
      >
        {label}
        {active && (
          <span className="bg-accent text-white text-[10px] rounded-full px-1.5 leading-4">
            {selected.size}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-50 py-1 min-w-[160px]">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-content-bg transition-colors cursor-pointer",
                selected.has(opt) && "bg-content-bg font-medium"
              )}
            >
              <span
                className={cn(
                  "w-3.5 h-3.5 rounded border flex items-center justify-center",
                  selected.has(opt)
                    ? "border-accent bg-accent text-white"
                    : "border-border"
                )}
              >
                {selected.has(opt) && (
                  <svg
                    className="w-2.5 h-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </span>
              {labelMap[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
