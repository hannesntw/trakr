"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  List,
  Code2,
  CalendarRange,
  GanttChart,
  Lightbulb,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Plus,
  Check,
  X,
  Building2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: number;
  name: string;
  key: string;
  ownerId?: string | null;
  makerMode?: boolean;
}

interface UserInfo {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface SidebarProps {
  projects: Project[];
  currentProjectKey: string;
  user?: UserInfo | null;
  signOutAction?: () => Promise<void>;
  hasOrg?: boolean;
  isPlatformAdmin?: boolean;
}

// Shared layout: all rows align icons at 16px from sidebar left edge.
// Container px-2 (8px) + row pl-2 (8px) = 16px to icon left edge.
// Labels fade via opacity, never change layout -> no jump on collapse.

export function Sidebar({ projects, currentProjectKey, user, signOutAction, hasOrg, isPlatformAdmin: isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentProject = projects.find((p) => p.key === currentProjectKey);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("trakr-sidebar-collapsed") === "true";
    return false;
  });
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("trakr-sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("trakr-last-project", currentProjectKey);
  }, [currentProjectKey]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const isOwned = currentProject?.ownerId === user?.id && !!user?.id;

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

  async function handleCreate() {
    if (!newName.trim() || !newKey.trim() || submitting) return;
    setSubmitting(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), key: newKey.toUpperCase().slice(0, 5) }),
    });
    if (res.ok) {
      const project = await res.json();
      setCreating(false);
      setSwitcherOpen(false);
      setNewName("");
      setNewKey("");
      router.push(`/projects/${project.key}/board`);
      router.refresh();
    }
    setSubmitting(false);
  }

  const isMaker = currentProject?.makerMode === true;

  const navItems = [
    { slug: "board", label: "Board", icon: LayoutDashboard, show: true },
    { slug: "backlog", label: "Backlog", icon: List, show: true },
    { slug: "ideas", label: "Ideas", icon: Lightbulb, show: isMaker },
    { slug: "queries", label: "Queries", icon: Code2, show: true },
    { slug: "sprints", label: "Sprints", icon: CalendarRange, show: !isMaker },
    { slug: "timeline", label: "Timeline", icon: GanttChart, show: !isMaker },
    { slug: "settings", label: "Settings", icon: Settings, show: isOwned },
  ];

  return (
    <aside
      className={cn("bg-sidebar-bg text-sidebar-text flex flex-col shrink-0 border-r border-sidebar-border transition-[width] duration-200", switcherOpen && collapsed ? "overflow-visible" : "overflow-hidden")}
      style={{ width: collapsed ? 56 : 240 }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center border-b border-sidebar-border px-2">
        <div className="flex items-center gap-2.5 pl-2">
          <svg width="20" height="20" viewBox="0 0 32 32" className="shrink-0">
            <rect width="32" height="32" rx="6" fill="#6366F1"/>
            <rect x="7" y="8" width="5" height="16" rx="1.5" fill="white" opacity="0.9"/>
            <rect x="14" y="12" width="5" height="12" rx="1.5" fill="white" opacity="0.7"/>
            <rect x="21" y="10" width="5" height="14" rx="1.5" fill="white" opacity="0.5"/>
          </svg>
          <span className={cn("font-semibold text-sidebar-text-active text-sm tracking-tight whitespace-nowrap transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100")}>
            Trakr
          </span>
        </div>
      </div>

      {/* Project Switcher */}
      <div className="px-2 py-2 relative" ref={switcherRef}>
        <button
          onClick={() => { setSwitcherOpen(!switcherOpen); setCreating(false); }}
          className="w-full flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-md hover:bg-sidebar-hover transition-colors text-sm"
        >
          <span className="w-5 h-5 rounded bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
            {currentProject?.key.charAt(0)}
          </span>
          <span className={cn("text-sidebar-text-active font-medium truncate flex-1 text-left whitespace-nowrap transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100")}>
            {currentProject?.name}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-sidebar-text shrink-0 transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100")} />
        </button>

        {switcherOpen && (
          <div className={cn(
            "bg-sidebar-bg border border-sidebar-border rounded-md shadow-xl z-50",
            collapsed
              ? "absolute left-full top-0 ml-2 min-w-[200px]"
              : "absolute top-full left-2 right-2 mt-1"
          )}>
            {projects.map((project) => (
              <Link
                key={project.key}
                href={`/projects/${project.key}/board`}
                onClick={() => setSwitcherOpen(false)}
                className={cn("flex items-center gap-2 px-3 py-2 text-sm hover:bg-sidebar-hover transition-colors", project.key === currentProjectKey && "text-sidebar-text-active bg-sidebar-hover")}
              >
                <span className="w-5 h-5 rounded bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">{project.key.charAt(0)}</span>
                <span className="truncate">{project.name}</span>
                <span className="text-sidebar-text text-xs ml-auto">{project.key}</span>
              </Link>
            ))}
            <div className="border-t border-sidebar-border">
              {creating ? (
                <div className="p-3 space-y-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => { setNewName(e.target.value); if (!newKey || newKey === newName.slice(0, 3).toUpperCase()) setNewKey(e.target.value.slice(0, 3).toUpperCase()); }}
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
                    <button onClick={handleCreate} disabled={!newName.trim() || !newKey.trim() || submitting} className="flex-1 px-2 py-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs rounded flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Create
                    </button>
                    <button onClick={() => { setCreating(false); setNewName(""); setNewKey(""); }} className="px-2 py-1 text-xs text-sidebar-text hover:text-sidebar-text-active">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setCreating(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors">
                  <Plus className="w-4 h-4" /> New Project
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.filter(n => n.show).map((item) => {
          const href = `/projects/${currentProjectKey}/${item.slug}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={item.slug}
              href={href}
              title={collapsed ? item.label : undefined}
              className={cn("flex items-center gap-2.5 pl-2 py-1.5 rounded-md text-sm transition-colors", isActive ? "bg-sidebar-hover text-sidebar-text-active" : "hover:bg-sidebar-hover hover:text-sidebar-text-active")}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className={cn("whitespace-nowrap transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Organization link */}
      {hasOrg && (
        <div className="px-2 mt-1 mb-1">
          <Link
            href="/org"
            title={collapsed ? "Organization" : undefined}
            className={cn("flex items-center gap-2.5 pl-2 py-1.5 rounded-md text-sm transition-colors", pathname.startsWith("/org") ? "bg-sidebar-hover text-sidebar-text-active" : "hover:bg-sidebar-hover hover:text-sidebar-text-active")}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span className={cn("whitespace-nowrap transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100")}>Organization</span>
          </Link>
        </div>
      )}

      {/* Admin link — platform admins only */}
      {isAdmin && (
        <div className="px-2 mb-1">
          <Link
            href="/admin"
            title={collapsed ? "Admin" : undefined}
            className={cn("flex items-center gap-2.5 pl-2 py-1.5 rounded-md text-sm transition-colors", pathname.startsWith("/admin") ? "bg-sidebar-hover text-amber-400" : "text-amber-400/70 hover:bg-sidebar-hover hover:text-amber-400")}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span className={cn("whitespace-nowrap transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100")}>Admin</span>
          </Link>
        </div>
      )}

      {/* User */}
      {user && (
        <div className="border-t border-sidebar-border py-2 px-2">
          <Link href="/account" className="flex items-center gap-2.5 pl-2 py-1.5 rounded-md group hover:bg-sidebar-hover transition-colors">
            {user.image ? (
              <img src={user.image} alt="" className="w-5 h-5 rounded-full shrink-0" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span className={cn("text-xs text-sidebar-text-active truncate whitespace-nowrap transition-opacity duration-150 flex-1", collapsed ? "opacity-0" : "opacity-100")}>
              {user.name ?? user.email}
            </span>
            {signOutAction && (
              <form action={signOutAction} onClick={e => e.stopPropagation()} className={cn("shrink-0 opacity-0 group-hover:opacity-100 transition-opacity", collapsed ? "hidden" : "")}>
                <button type="submit" className="text-[10px] text-sidebar-text hover:text-sidebar-text-active">Sign out</button>
              </form>
            )}
          </Link>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border py-2 px-2">
        <button
          onClick={toggleCollapsed}
          className="flex items-center gap-2.5 pl-2 py-1.5 rounded-md text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors w-full"
        >
          <div className="w-4 h-4 shrink-0 relative">
            <PanelLeftClose className={cn("w-4 h-4 absolute inset-0 transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100")} />
            <PanelLeftOpen className={cn("w-4 h-4 absolute inset-0 transition-opacity duration-150", collapsed ? "opacity-100" : "opacity-0")} />
          </div>
          <span className={cn("whitespace-nowrap transition-opacity duration-150", collapsed ? "opacity-0" : "opacity-100")}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}
