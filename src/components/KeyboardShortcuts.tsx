"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";

const SHORTCUTS = [
  { key: "c", description: "Create new work item" },
  { key: "?", description: "Toggle shortcuts cheat sheet" },
  { key: "/", description: "Focus search / filter input" },
  { key: "f", description: "Toggle fullscreen" },
  { key: "Esc", description: "Close dialog / panel" },
];

export function KeyboardShortcuts() {
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs, textareas, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        // Still handle Escape in inputs
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      switch (e.key) {
        case "c": {
          e.preventDefault();
          // Dispatch custom event that board/backlog clients listen to
          window.dispatchEvent(new CustomEvent("trakr:create-item"));
          break;
        }
        case "?": {
          e.preventDefault();
          setCheatSheetOpen((prev) => !prev);
          break;
        }
        case "/": {
          e.preventDefault();
          // Focus first visible search input
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder*="Search"], input[placeholder*="Filter"], input[data-search]'
          );
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          break;
        }
        case "f": {
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
          break;
        }
        case "Escape": {
          if (cheatSheetOpen) {
            setCheatSheetOpen(false);
          } else {
            // Dispatch close event for dialogs/panels
            window.dispatchEvent(new CustomEvent("trakr:close-panel"));
          }
          break;
        }
      }
    },
    [cheatSheetOpen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!cheatSheetOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setCheatSheetOpen(false)}
      />
      <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setCheatSheetOpen(false)}
            className="p-1 rounded hover:bg-content-bg transition-colors"
          >
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-text-secondary">{s.description}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-content-bg border border-border rounded text-text-primary">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
