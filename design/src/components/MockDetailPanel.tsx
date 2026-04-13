"use client";

import { X, ExternalLink, GitBranch, GitPullRequest, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useVariant } from "./VariantContext";

interface MockDetailPanelProps {
  itemId: number | null;
  title: string;
  type: string;
  state: string;
  onClose: () => void;
}

const typeColors: Record<string, string> = {
  epic: "text-purple-600 bg-purple-50 border-purple-200",
  feature: "text-blue-600 bg-blue-50 border-blue-200",
  story: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

const stateColors: Record<string, string> = {
  done: "text-emerald-600 bg-emerald-50 border-emerald-200",
  active: "text-blue-600 bg-blue-50 border-blue-200",
  in_progress: "text-indigo-600 bg-indigo-50 border-indigo-200",
  ready: "text-amber-600 bg-amber-50 border-amber-200",
  new: "text-gray-600 bg-gray-50 border-gray-200",
};

export function MockDetailPanel({ itemId, title, type, state, onClose }: MockDetailPanelProps) {
  const variant = useVariant();
  if (!itemId) return null;

  return (
    <div className="fixed top-9 bottom-0 right-0 w-[480px] bg-surface border-l border-border shadow-2xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeColors[type] ?? ""}`}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
          <span className="text-xs text-text-tertiary font-mono">TRK-{itemId}</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/${variant.id}/story`}
            className="p-1.5 rounded hover:bg-content-bg transition-colors"
            title="Open full detail"
          >
            <ExternalLink className="w-3.5 h-3.5 text-text-tertiary" />
          </Link>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-content-bg transition-colors">
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">
        <Link href={`/${variant.id}/story`} className="text-lg font-semibold text-text-primary hover:text-accent transition-colors block">
          {title}
        </Link>

        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs text-text-tertiary block mb-1">State</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${stateColors[state] ?? ""}`}>
              {state.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </div>
          <div>
            <span className="text-xs text-text-tertiary block mb-1">Type</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeColors[type] ?? ""}`}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          </div>
        </div>

        <div>
          <span className="text-xs text-text-tertiary block mb-1.5">Description</span>
          <p className="text-sm text-text-secondary italic">Click dummy — no description loaded</p>
        </div>

        {/* GitHub integration section */}
        {variant.features.githubLinks && (
          <div>
            <span className="text-xs text-text-tertiary block mb-2">Development</span>
            {itemId === 4 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-content-bg rounded-lg">
                  <GitPullRequest className="w-4 h-4 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">#47 feat: detail panel with markdown preview</p>
                    <p className="text-[11px] text-text-tertiary">hannesntw/trakr &middot; Open</p>
                  </div>
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <GitBranch className="w-3.5 h-3.5" />
                  <code className="text-[11px] bg-content-bg px-1.5 py-0.5 rounded">feat/TRK-4-detail-panel</code>
                </div>
              </div>
            ) : itemId === 1 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-content-bg rounded-lg">
                  <GitPullRequest className="w-4 h-4 text-purple-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">#38 feat: work item CRUD</p>
                    <p className="text-[11px] text-text-tertiary">hannesntw/trakr &middot; Merged</p>
                  </div>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
