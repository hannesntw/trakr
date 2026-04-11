"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useVariant } from "./VariantContext";
import { LayoutDashboard, List, CalendarRange, GanttChart, FolderKanban, PanelLeftClose, PanelLeftOpen, ChevronDown, Plus, X, Check, Settings } from "lucide-react";

const mockProjects = [
  { key: "PIC", name: "Pictura", owned: false },
  { key: "TRK", name: "Trakr", owned: false },
];

export function SidebarNav({ variant }: { variant: string }) {
  const config = useVariant();
  const canCollapse = config.features.collapsibleSidebar;
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState(mockProjects);
  const [currentKey, setCurrentKey] = useState("TRK");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const switcherRef = useRef<HTMLDivElement>(null);

  const isCollapsed = canCollapse && collapsed;
  const currentProject = projects.find(p => p.key === currentKey);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleCreate() {
    if (!newName.trim() || !newKey.trim()) return;
    const key = newKey.toUpperCase().slice(0, 5);
    setProjects([...projects, { key, name: newName.trim(), owned: true }]);
    setCurrentKey(key);
    setCreating(false);
    setSwitcherOpen(false);
    setNewName("");
    setNewKey("");
  }

  const isOwned = currentProject?.owned ?? false;

  const navItems = [
    { href: `/${variant}/board`, icon: LayoutDashboard, label: "Board", show: true },
    { href: `/${variant}/backlog`, icon: List, label: "Backlog", show: true },
    { href: `/${variant}/sprints`, icon: CalendarRange, label: "Sprints", show: true },
    { href: `/${variant}/timeline`, icon: GanttChart, label: "Timeline", show: config.features.timelinePlanning },
    { href: `/${variant}/settings`, icon: Settings, label: "Settings", show: isOwned },
  ];

  return (
    <aside
      className={`bg-sidebar-bg text-sidebar-text flex flex-col shrink-0 border-r border-sidebar-border transition-[width] duration-200 ${switcherOpen && isCollapsed ? "overflow-visible" : "overflow-hidden"}`}
      style={{ width: isCollapsed ? 56 : 240 }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center border-b border-sidebar-border pl-[15px]">
        <FolderKanban className="w-5 h-5 text-accent shrink-0" />
        <span className={`font-semibold text-sidebar-text-active text-sm ml-2 whitespace-nowrap transition-opacity duration-150 ${isCollapsed ? "opacity-0" : "opacity-100"}`}>
          Trakr
        </span>
      </div>

      {/* Project Switcher */}
      {!isCollapsed && (
        <div className="px-2 py-3" ref={switcherRef}>
          <div className="relative">
            <button
              onClick={() => { setSwitcherOpen(!switcherOpen); setCreating(false); }}
              className="w-full flex items-center gap-2 pl-2 py-1.5 rounded-md hover:bg-sidebar-hover transition-colors text-sm"
            >
              <span className="w-6 h-6 rounded bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0">
                {currentProject?.key.charAt(0)}
              </span>
              <span className="text-sidebar-text-active font-medium truncate flex-1 text-left">
                {currentProject?.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-sidebar-text shrink-0" />
            </button>

            {switcherOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-sidebar-bg border border-sidebar-border rounded-md shadow-lg z-50">
                {projects.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setCurrentKey(p.key); setSwitcherOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-sidebar-hover transition-colors ${p.key === currentKey ? "text-sidebar-text-active bg-sidebar-hover" : ""}`}
                  >
                    <span className="w-5 h-5 rounded bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">
                      {p.key.charAt(0)}
                    </span>
                    <span className="truncate">{p.name}</span>
                    <span className="text-sidebar-text text-xs ml-auto">{p.key}</span>
                  </button>
                ))}

                <div className="border-t border-sidebar-border">
                  {creating ? (
                    <div className="p-3 space-y-2">
                      <input
                        autoFocus
                        value={newName}
                        onChange={e => {
                          setNewName(e.target.value);
                          if (!newKey || newKey === newName.slice(0, 3).toUpperCase()) {
                            setNewKey(e.target.value.slice(0, 3).toUpperCase());
                          }
                        }}
                        placeholder="Project name"
                        className="w-full px-2 py-1 text-xs bg-sidebar-hover border border-sidebar-border rounded text-sidebar-text-active outline-none focus:border-accent"
                      />
                      <div className="flex gap-2">
                        <input
                          value={newKey}
                          onChange={e => setNewKey(e.target.value.toUpperCase().slice(0, 5))}
                          placeholder="KEY"
                          className="w-16 px-2 py-1 text-xs bg-sidebar-hover border border-sidebar-border rounded text-sidebar-text-active outline-none focus:border-accent font-mono"
                        />
                        <button onClick={handleCreate} disabled={!newName.trim() || !newKey.trim()} className="flex-1 px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> Create
                        </button>
                        <button onClick={() => { setCreating(false); setNewName(""); setNewKey(""); }} className="px-2 py-1 text-xs text-sidebar-text hover:text-sidebar-text-active">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCreating(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      New Project
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collapsed: project initial with floating dropdown */}
      {isCollapsed && (
        <div className="py-3 px-2 relative" ref={switcherRef}>
          <button onClick={() => { setSwitcherOpen(!switcherOpen); setCreating(false); }} className="w-full flex justify-center">
            <span className="w-8 h-8 rounded bg-accent/20 text-accent text-xs font-bold flex items-center justify-center hover:bg-accent/30 transition-colors cursor-pointer">
              {currentProject?.key.charAt(0)}
            </span>
          </button>

          {switcherOpen && (
            <div className="absolute left-full top-0 ml-2 bg-sidebar-bg border border-sidebar-border rounded-md shadow-xl z-50 min-w-[200px]">
              {projects.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setCurrentKey(p.key); setSwitcherOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-sidebar-hover transition-colors ${p.key === currentKey ? "text-sidebar-text-active bg-sidebar-hover" : "text-sidebar-text"}`}
                >
                  <span className="w-5 h-5 rounded bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">
                    {p.key.charAt(0)}
                  </span>
                  <span className="truncate">{p.name}</span>
                  <span className="text-sidebar-text text-xs ml-auto">{p.key}</span>
                </button>
              ))}
              <div className="border-t border-sidebar-border">
                <button onClick={() => { setCreating(true); setSwitcherOpen(false); setCollapsed(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors">
                  <Plus className="w-4 h-4" /> New Project
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.filter(n => n.show).map(item => (
          <Link
            key={item.label}
            href={item.href}
            title={isCollapsed ? item.label : undefined}
            className="flex items-center gap-2.5 pl-2 py-1.5 rounded-md text-sm hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors"
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className={`whitespace-nowrap transition-opacity duration-150 ${isCollapsed ? "opacity-0" : "opacity-100"}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      {/* User (mock) */}
      <div className="border-t border-sidebar-border py-2 px-2">
        <Link href={`/${variant}/account`} className="flex items-center gap-2.5 pl-1 py-1.5 rounded-md group hover:bg-sidebar-hover transition-colors">
          <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
            H
          </span>
          <span className={`text-xs text-sidebar-text-active truncate whitespace-nowrap transition-opacity duration-150 flex-1 ${isCollapsed ? "opacity-0" : "opacity-100"}`}>
            hannes@example.com
          </span>
          <span className={`text-[10px] text-sidebar-text opacity-0 group-hover:opacity-100 transition-opacity ${isCollapsed ? "hidden" : ""}`}>
            Sign out
          </span>
        </Link>
      </div>

      {/* Collapse toggle */}
      {canCollapse && (
        <div className="border-t border-sidebar-border py-2 px-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2.5 pl-2 py-1.5 rounded-md text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors w-full"
          >
            <div className="w-4 h-4 shrink-0 relative">
              <PanelLeftClose className={`w-4 h-4 absolute inset-0 transition-opacity duration-150 ${isCollapsed ? "opacity-0" : "opacity-100"}`} />
              <PanelLeftOpen className={`w-4 h-4 absolute inset-0 transition-opacity duration-150 ${isCollapsed ? "opacity-100" : "opacity-0"}`} />
            </div>
            <span className={`whitespace-nowrap transition-opacity duration-150 ${isCollapsed ? "opacity-0" : "opacity-100"}`}>
              Collapse
            </span>
          </button>
        </div>
      )}
    </aside>
  );
}
