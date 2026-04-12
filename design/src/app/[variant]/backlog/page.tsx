"use client";

import { useState, useMemo } from "react";
import { useVariant } from "@/components/VariantContext";
import { useStateOverride } from "@/components/StateOverrideContext";
import { MockDetailPanel } from "@/components/MockDetailPanel";
import { StateIcon } from "@/components/StateIcon";
import { Search, X, ChevronDown } from "lucide-react";
import { PointsBadge } from "@/components/PointsBadge";

const mockUsers = ["Hannes", "Peter", "Sarah", "Unassigned"];

const mockItems = [
  { id: 300, title: "Trakr Core", type: "epic", state: "active", assignee: "Hannes", depth: 0, points: null as number | null },
  { id: 301, title: "Work Item Management", type: "feature", state: "active", assignee: "Hannes", depth: 1, points: null },
  { id: 302, title: "Create Work Item", type: "story", state: "done", assignee: "Peter", depth: 2, points: 3 },
  { id: 303, title: "View Sprint Board", type: "story", state: "done", assignee: "Peter", depth: 2, points: 5 },
  { id: 304, title: "View Backlog Table", type: "story", state: "done", assignee: "Sarah", depth: 2, points: 3 },
  { id: 305, title: "View Work Item Detail", type: "story", state: "in_progress", assignee: "Hannes", depth: 2, points: 5 },
  { id: 306, title: "Sprint Planning", type: "feature", state: "in_progress", assignee: "Hannes", depth: 1, points: null },
  { id: 307, title: "Plan Sprint", type: "story", state: "in_progress", assignee: "Hannes", depth: 2, points: 8 },
  { id: 308, title: "Create and Manage Sprints", type: "story", state: "ready", assignee: "Sarah", depth: 2, points: 5 },
  { id: 309, title: "Work Item Comments", type: "feature", state: "new", assignee: "Unassigned", depth: 1, points: null },
  { id: 310, title: "Add and View Comments", type: "story", state: "new", assignee: "Unassigned", depth: 2, points: 3 },
  { id: 311, title: "Timeline & Roadmap", type: "epic", state: "new", assignee: "Hannes", depth: 0, points: null },
  { id: 312, title: "Timeline View", type: "feature", state: "new", assignee: "Unassigned", depth: 1, points: null },
  { id: 313, title: "Epic Timeline Bars", type: "story", state: "new", assignee: "Unassigned", depth: 2, points: 5 },
  { id: 314, title: "Drill-down to Features", type: "story", state: "new", assignee: "Unassigned", depth: 2, points: 3 },
];

const typeBadge: Record<string, string> = {
  epic: "text-purple-600 bg-purple-50 border-purple-200",
  feature: "text-blue-600 bg-blue-50 border-blue-200",
  story: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

function FilterChip({ label, value, options, onSelect, renderOption }: {
  label: string;
  value: string | null;
  options: string[];
  onSelect: (v: string | null) => void;
  renderOption?: (v: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`h-8 flex items-center gap-1.5 px-2.5 text-xs border rounded-md transition-colors ${value ? "border-accent/50 bg-accent/5 text-accent" : "border-border text-text-secondary hover:border-border-hover"}`}
      >
        {label}{value && `: ${value.replace("_", " ")}`}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-20 min-w-[130px]">
          {options.map(o => (
            <button key={o} onClick={() => { onSelect(value === o ? null : o); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-content-bg transition-colors flex items-center gap-2 ${value === o ? "text-accent font-medium" : "text-text-secondary"}`}>
              {renderOption ? renderOption(o) : o.charAt(0).toUpperCase() + o.slice(1).replace("_", " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BacklogPage() {
  const config = useVariant();
  const backlogState = useStateOverride("backlog");
  const hasFilters = config.features.backlogFilters;

  const [selected, setSelected] = useState<typeof mockItems[0] | null>(null);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  const hasActiveFilters = typeFilter || stateFilter || assigneeFilter || searchText;

  const filteredItems = useMemo(() => {
    let items = mockItems;
    if (searchText) {
      const q = searchText.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || `#${i.id}`.includes(q));
    }
    if (typeFilter) items = items.filter(i => i.type === typeFilter);
    if (stateFilter) items = items.filter(i => i.state === stateFilter);
    if (assigneeFilter) items = items.filter(i => i.assignee === assigneeFilter);
    return items;
  }, [searchText, typeFilter, stateFilter, assigneeFilter]);

  function clearFilters() {
    setTypeFilter(null);
    setStateFilter(null);
    setAssigneeFilter(null);
    setSearchText("");
  }

  return (
    <>
      <header className="px-6 border-b border-border bg-surface shrink-0">
        <div className="h-14 flex items-center">
          <h1 className="text-sm font-semibold text-text-primary">Trakr</h1>
          <span className="text-text-tertiary mx-3">/</span>
          <span className="text-sm text-text-secondary">Backlog</span>
          <span className="ml-auto text-xs text-text-tertiary">{filteredItems.length} items</span>
        </div>

        {hasFilters && (
          <div className="pb-3 flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search..."
                className="h-8 pl-8 pr-3 text-sm bg-content-bg border border-border rounded-md w-48 outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
              />
              {searchText && (
                <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter chips */}
            <FilterChip label="Type" value={typeFilter} options={["epic", "feature", "story"]} onSelect={setTypeFilter} />
            <FilterChip
              label="State" value={stateFilter}
              options={["new", "active", "ready", "in_progress", "done"]}
              onSelect={setStateFilter}
              renderOption={s => (
                <><StateIcon state={s} size={12} />{s.replace("_", " ")}</>
              )}
            />
            <FilterChip label="Assignee" value={assigneeFilter} options={mockUsers} onSelect={setAssigneeFilter} />

            {hasActiveFilters && (
              <button onClick={clearFilters} className="h-8 flex items-center gap-1 px-2 text-xs text-text-tertiary hover:text-text-secondary">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto">
        {backlogState === "empty" || filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-text-tertiary">
              {hasActiveFilters ? "No items match your filters." : "Backlog is empty."}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-accent hover:text-accent-hover">Clear filters</button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-content-bg z-10">
              <tr className="border-b border-border text-left">
                <th className="px-6 py-2.5 text-xs font-medium text-text-tertiary uppercase w-16">ID</th>
                <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-24">Type</th>
                <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase">Title</th>
                <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-28">State</th>
                <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-24">Assignee</th>
                {config.features.storyPoints && (
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-16 text-right pr-6">Pts</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} onClick={() => setSelected(item)} className="border-b border-border/50 hover:bg-surface transition-colors cursor-pointer">
                  <td className="px-6 py-2.5 text-xs text-text-tertiary font-mono">#{item.id}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeBadge[item.type]}`}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm" style={{ paddingLeft: `${12 + item.depth * 20}px` }}>
                    {item.title}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <StateIcon state={item.state} size={14} />
                      <span className="text-xs text-text-secondary">{item.state.replace("_", " ")}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-text-secondary">{item.assignee}</td>
                  {config.features.storyPoints && (
                    <td className="px-3 py-2.5 text-right pr-6">
                      <PointsBadge points={item.points} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <MockDetailPanel
          itemId={selected.id}
          title={selected.title}
          type={selected.type}
          state={selected.state}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
