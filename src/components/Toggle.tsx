"use client";

import { cn } from "@/lib/utils";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}

export function Toggle({ enabled, onChange, size = "md", disabled }: ToggleProps) {
  const sizes = {
    sm: { track: "h-4 w-7", dot: "h-2.5 w-2.5", on: "translate-x-[13px]", off: "translate-x-[3px]" },
    md: { track: "h-5 w-9", dot: "h-3.5 w-3.5", on: "translate-x-[18px]", off: "translate-x-[3px]" },
  };
  const s = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={cn(
        `relative inline-flex items-center rounded-full transition-colors`,
        s.track,
        enabled ? "bg-accent" : "bg-text-tertiary/40",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "inline-block transform rounded-full bg-surface transition-transform",
          s.dot,
          enabled ? s.on : s.off,
        )}
      />
    </button>
  );
}
