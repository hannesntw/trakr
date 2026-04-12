"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  secondary?: string;
  icon?: React.ReactNode;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  clearLabel?: string;
  loading?: boolean;
  renderSelected?: (option: ComboboxOption) => React.ReactNode;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "None",
  searchPlaceholder = "Search...",
  clearLabel = "Clear",
  loading = false,
  renderSelected,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.secondary && o.secondary.toLowerCase().includes(q))
    );
  }, [options, search]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1 text-sm rounded-md border border-transparent transition-colors text-left",
          "hover:border-border hover:bg-content-bg cursor-pointer",
          open && "border-border bg-content-bg"
        )}
      >
        {selected ? (
          renderSelected ? (
            renderSelected(selected)
          ) : (
            <span className="text-text-primary truncate">{selected.label}</span>
          )
        ) : (
          <span className="text-text-tertiary">{placeholder}</span>
        )}
        <svg
          className="ml-auto w-3.5 h-3.5 text-text-tertiary shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-50 min-w-[220px]">
          <div className="p-1.5">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2 py-1.5 text-xs border border-border rounded bg-content-bg focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {value && (
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-tertiary hover:bg-content-bg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {clearLabel}
              </button>
            )}

            {loading && (
              <div className="px-3 py-2 text-xs text-text-tertiary">Loading...</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-text-tertiary">No results</div>
            )}

            {filtered.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-content-bg transition-colors",
                  option.value === value && "bg-content-bg font-medium"
                )}
              >
                <div className="flex items-center gap-2">
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <span className="text-text-primary truncate flex-1">{option.label}</span>
                  {option.value === value && (
                    <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {option.secondary && (
                  <div className={cn("text-text-tertiary truncate", option.icon ? "pl-7" : "")}>
                    {option.secondary}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
