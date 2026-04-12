"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StateBadge } from "@/components/Badge";
import type { WorkflowState } from "@/lib/constants";

interface LinkRow {
  id: number;
  sourceId: number;
  targetId: number;
  type: string;
  createdAt: string;
}

interface LinkedWorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
}

interface ResolvedLink {
  linkId: number;
  type: string;
  direction: "outgoing" | "incoming";
  target: LinkedWorkItem;
}

const LINK_TYPE_LABELS: Record<string, string> = {
  blocks: "Blocks",
  blocked_by: "Blocked by",
  relates_to: "Relates to",
  duplicates: "Duplicates",
};

const LINK_TYPE_ICONS: Record<string, React.ReactNode> = {
  blocks: (
    <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  blocked_by: (
    <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  relates_to: (
    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  duplicates: (
    <svg className="w-3.5 h-3.5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
};

const LINK_TYPES = ["blocks", "blocked_by", "relates_to", "duplicates"] as const;

interface WorkItemLinksProps {
  workItemId: number;
  projectId: number;
  projectKey: string;
  workflowStates?: WorkflowState[];
}

export function WorkItemLinks({ workItemId, projectId, projectKey, workflowStates }: WorkItemLinksProps) {
  const [links, setLinks] = useState<ResolvedLink[]>([]);
  const [adding, setAdding] = useState(false);
  const [linkType, setLinkType] = useState<string>("relates_to");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<LinkedWorkItem[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLinks = useCallback(async () => {
    const res = await fetch(`/api/work-items/${workItemId}/links`);
    if (!res.ok) return;
    const rows: LinkRow[] = await res.json();

    // Only process links where this item is the source (outgoing links)
    // The API returns both directions, but we only display sourceId === workItemId
    const outgoing = rows.filter((r) => r.sourceId === workItemId);

    // Fetch target work items
    const resolved: ResolvedLink[] = [];
    for (const row of outgoing) {
      const targetRes = await fetch(`/api/work-items/${row.targetId}`);
      if (targetRes.ok) {
        const target = await targetRes.json();
        resolved.push({
          linkId: row.id,
          type: row.type,
          direction: "outgoing",
          target: { id: target.id, title: target.title, type: target.type, state: target.state },
        });
      }
    }

    setLinks(resolved);
  }, [workItemId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  function handleSearch(q: string) {
    setSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/work-items?projectId=${projectId}&q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const items = await res.json();
        // Exclude current item and already-linked items
        const linkedIds = new Set(links.map((l) => l.target.id));
        setSearchResults(
          items
            .filter((i: LinkedWorkItem) => i.id !== workItemId && !linkedIds.has(i.id))
            .slice(0, 8)
        );
      }
      setSearching(false);
    }, 300);
  }

  async function addLink(targetId: number) {
    await fetch(`/api/work-items/${workItemId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, type: linkType }),
    });
    setAdding(false);
    setSearch("");
    setSearchResults([]);
    fetchLinks();
  }

  async function removeLink(linkId: number) {
    await fetch(`/api/work-items/${workItemId}/links/${linkId}`, {
      method: "DELETE",
    });
    fetchLinks();
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
          Links
        </h3>
        <button
          onClick={() => setAdding(!adding)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-content-bg text-text-tertiary hover:text-text-primary transition-colors"
        >
          {adding ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      </div>

      {adding && (
        <div className="mb-3 space-y-2">
          <select
            value={linkType}
            onChange={(e) => setLinkType(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-border rounded bg-surface focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent text-text-primary"
          >
            {LINK_TYPES.map((t) => (
              <option key={t} value={t}>{LINK_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search work items..."
            className="w-full px-2 py-1.5 text-xs border border-border rounded bg-content-bg focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent text-text-primary placeholder:text-text-tertiary"
            autoFocus
          />
          {searching && (
            <div className="text-xs text-text-tertiary px-1">Searching...</div>
          )}
          {searchResults.length > 0 && (
            <div className="border border-border rounded bg-surface max-h-40 overflow-y-auto">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addLink(item.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-content-bg transition-colors text-left"
                >
                  <span className="text-text-tertiary">#{item.id}</span>
                  <span className="text-text-primary truncate flex-1">{item.title}</span>
                  <StateBadge state={item.state} workflowStates={workflowStates} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {links.length === 0 && !adding && (
        <div className="text-xs text-text-tertiary">No links</div>
      )}

      {links.length > 0 && (
        <div className="space-y-1">
          {links.map((link) => (
            <div
              key={link.linkId}
              className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-content-bg transition-colors"
            >
              <span className="shrink-0">{LINK_TYPE_ICONS[link.type]}</span>
              <span className="text-[10px] text-text-tertiary shrink-0 w-16 truncate">
                {LINK_TYPE_LABELS[link.type]}
              </span>
              <Link
                href={`/projects/${projectKey}/work-items/${link.target.id}`}
                className="text-xs text-text-primary hover:text-accent transition-colors truncate flex-1"
              >
                #{link.target.id} {link.target.title}
              </Link>
              <StateBadge state={link.target.state} workflowStates={workflowStates} />
              <button
                onClick={() => removeLink(link.linkId)}
                className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-red-50 text-text-tertiary hover:text-red-500 transition-all shrink-0"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
