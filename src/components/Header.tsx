"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-surface shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
        {subtitle && (
          <>
            <span className="text-text-tertiary">/</span>
            <span className="text-sm text-text-secondary">{subtitle}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}

export function CreateButton({
  onClick,
  label = "New Item",
}: {
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-md transition-colors"
    >
      <Plus className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
