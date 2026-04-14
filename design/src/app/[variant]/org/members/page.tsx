"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, X, Mail, ChevronDown, ChevronRight, MoreHorizontal, Clock, UserMinus, ShieldCheck, ShieldAlert, Info, Monitor, Smartphone, Laptop, Activity, FolderKanban, Users } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { Pagination, paginate } from "@/components/Pagination";

type OrgRole = "Owner" | "Admin" | "Member" | "Viewer" | "Guest";

interface TeamMembership {
  team: string;
  role: "Lead" | "Member";
}

interface ProjectAccess {
  name: string;
  key: string;
  viaTeam: string;
}

interface AuditEntry {
  action: string;
  target: string;
  timestamp: string;
}

interface SessionInfo {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
}

interface OrgMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: OrgRole;
  teams: TeamMembership[];
  lastActive: string;
  joined: string;
  status: "active" | "deactivated";
  projects: ProjectAccess[];
  recentActivity: AuditEntry[];
  sessions: SessionInfo[];
  ssoManaged?: boolean;
}

interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  sentAt: string;
  sentBy: string;
}

const roleColors: Record<OrgRole, string> = {
  Owner: "bg-purple-50 text-purple-600 border-purple-200",
  Admin: "bg-blue-50 text-blue-600 border-blue-200",
  Member: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Viewer: "bg-gray-50 text-gray-500 border-gray-200",
  Guest: "bg-amber-50 text-amber-600 border-amber-200",
};

const allRoles: OrgRole[] = ["Owner", "Admin", "Member", "Viewer", "Guest"];

const initialMembers: OrgMember[] = [
  {
    id: "1", name: "Hannes", email: "hannes@example.com", avatar: "H", role: "Owner",
    teams: [{ team: "Platform Engineering", role: "Lead" }],
    lastActive: "Just now", joined: "Jan 15, 2025", status: "active",
    projects: [{ name: "Trakr", key: "TRK", viaTeam: "Platform Engineering" }, { name: "Pictura", key: "PIC", viaTeam: "Platform Engineering" }],
    recentActivity: [
      { action: "Updated work item", target: "TRK-142 API rate limiting", timestamp: "2 min ago" },
      { action: "Created sprint", target: "Sprint 24", timestamp: "1 hour ago" },
      { action: "Commented on", target: "TRK-138 OAuth flow", timestamp: "3 hours ago" },
      { action: "Changed status", target: "TRK-135 to Done", timestamp: "Yesterday" },
      { action: "Invited member", target: "casey@newco.com", timestamp: "2 days ago" },
    ],
    sessions: [
      { id: "s1", device: "MacBook Pro", browser: "Chrome 124", location: "Berlin, DE", lastActive: "Active now", current: true },
      { id: "s2", device: "iPhone 15", browser: "Safari 18", location: "Berlin, DE", lastActive: "2 hours ago", current: false },
    ],
  },
  {
    id: "2", name: "Sarah Chen", email: "sarah@thoughtworks.com", avatar: "S", role: "Admin", ssoManaged: true,
    teams: [{ team: "Platform Engineering", role: "Member" }, { team: "Product Design", role: "Member" }, { team: "QA & Release", role: "Lead" }],
    lastActive: "2 hours ago", joined: "Feb 3, 2025", status: "active",
    projects: [{ name: "Trakr", key: "TRK", viaTeam: "Platform Engineering" }, { name: "Pictura", key: "PIC", viaTeam: "Product Design" }, { name: "Pulsr", key: "PLS", viaTeam: "QA & Release" }],
    recentActivity: [
      { action: "Reviewed PR", target: "TRK-140 Fix pagination", timestamp: "2 hours ago" },
      { action: "Updated work item", target: "PIC-88 Gallery view", timestamp: "5 hours ago" },
      { action: "Changed status", target: "TRK-139 to In Progress", timestamp: "Yesterday" },
      { action: "Created work item", target: "PIC-91 Export feature", timestamp: "2 days ago" },
      { action: "Commented on", target: "TRK-136 Performance", timestamp: "3 days ago" },
    ],
    sessions: [
      { id: "s3", device: "MacBook Air", browser: "Firefox 132", location: "Munich, DE", lastActive: "2 hours ago", current: false },
      { id: "s4", device: "iPad Pro", browser: "Safari 18", location: "Munich, DE", lastActive: "1 day ago", current: false },
      { id: "s5", device: "Windows PC", browser: "Chrome 124", location: "Office VPN", lastActive: "3 days ago", current: false },
    ],
  },
  {
    id: "3", name: "Alex Rivera", email: "alex@thoughtworks.com", avatar: "A", role: "Member", ssoManaged: true,
    teams: [{ team: "Platform Engineering", role: "Member" }, { team: "QA & Release", role: "Member" }, { team: "Backend API", role: "Lead" }, { team: "DevOps", role: "Member" }],
    lastActive: "1 day ago", joined: "Mar 10, 2025", status: "active",
    projects: [{ name: "Trakr", key: "TRK", viaTeam: "Backend API" }, { name: "Pictura", key: "PIC", viaTeam: "Platform Engineering" }, { name: "Pulsr", key: "PLS", viaTeam: "DevOps" }],
    recentActivity: [
      { action: "Deployed", target: "TRK v2.4.1 to production", timestamp: "1 day ago" },
      { action: "Created work item", target: "TRK-143 DB migration", timestamp: "1 day ago" },
      { action: "Updated work item", target: "TRK-141 API caching", timestamp: "2 days ago" },
      { action: "Commented on", target: "TRK-139 Performance", timestamp: "3 days ago" },
      { action: "Changed status", target: "TRK-137 to Dev Done", timestamp: "4 days ago" },
    ],
    sessions: [
      { id: "s6", device: "Linux Desktop", browser: "Chrome 124", location: "Berlin, DE", lastActive: "1 day ago", current: false },
    ],
  },
  {
    id: "4", name: "Peter Schmidt", email: "peter@thoughtworks.com", avatar: "P", role: "Member", ssoManaged: true,
    teams: [{ team: "Platform Engineering", role: "Member" }, { team: "Customer Success", role: "Lead" }, { team: "Security", role: "Member" }],
    lastActive: "3 hours ago", joined: "Mar 15, 2025", status: "active",
    projects: [{ name: "Trakr", key: "TRK", viaTeam: "Platform Engineering" }, { name: "Pictura", key: "PIC", viaTeam: "Customer Success" }],
    recentActivity: [
      { action: "Commented on", target: "TRK-142 API rate limiting", timestamp: "3 hours ago" },
      { action: "Updated work item", target: "PIC-89 Onboarding flow", timestamp: "Yesterday" },
      { action: "Changed status", target: "PIC-87 to Done", timestamp: "2 days ago" },
      { action: "Created work item", target: "PIC-90 Help center", timestamp: "3 days ago" },
      { action: "Commented on", target: "TRK-138 OAuth flow", timestamp: "4 days ago" },
    ],
    sessions: [
      { id: "s7", device: "MacBook Pro", browser: "Safari 18", location: "Hamburg, DE", lastActive: "3 hours ago", current: false },
      { id: "s8", device: "iPhone 14", browser: "Safari 18", location: "Hamburg, DE", lastActive: "1 day ago", current: false },
    ],
  },
  {
    id: "5", name: "Maya Patel", email: "maya@example.com", avatar: "M", role: "Admin",
    teams: [{ team: "Product Design", role: "Lead" }],
    lastActive: "5 hours ago", joined: "Apr 1, 2025", status: "active",
    projects: [{ name: "Trakr", key: "TRK", viaTeam: "Product Design" }, { name: "Pictura", key: "PIC", viaTeam: "Product Design" }],
    recentActivity: [
      { action: "Updated work item", target: "TRK-140 Design review", timestamp: "5 hours ago" },
      { action: "Commented on", target: "PIC-88 Gallery view", timestamp: "Yesterday" },
      { action: "Created work item", target: "TRK-144 Nav redesign", timestamp: "2 days ago" },
      { action: "Changed status", target: "PIC-86 to Done", timestamp: "3 days ago" },
      { action: "Uploaded attachment", target: "TRK-140 mockup.png", timestamp: "4 days ago" },
    ],
    sessions: [
      { id: "s9", device: "MacBook Pro", browser: "Chrome 124", location: "London, UK", lastActive: "5 hours ago", current: false },
    ],
  },
  {
    id: "6", name: "Jordan Lee", email: "jordan@example.com", avatar: "J", role: "Member",
    teams: [{ team: "Product Design", role: "Member" }, { team: "Data Engineering", role: "Lead" }],
    lastActive: "1 day ago", joined: "Apr 8, 2025", status: "active",
    projects: [{ name: "Trakr", key: "TRK", viaTeam: "Data Engineering" }, { name: "Pictura", key: "PIC", viaTeam: "Product Design" }],
    recentActivity: [
      { action: "Updated work item", target: "TRK-141 Data pipeline", timestamp: "1 day ago" },
      { action: "Commented on", target: "PIC-88 Gallery view", timestamp: "2 days ago" },
      { action: "Changed status", target: "TRK-136 to Done", timestamp: "3 days ago" },
      { action: "Created work item", target: "TRK-145 Analytics", timestamp: "4 days ago" },
      { action: "Commented on", target: "TRK-135 Performance", timestamp: "5 days ago" },
    ],
    sessions: [
      { id: "s10", device: "MacBook Air", browser: "Chrome 124", location: "Seoul, KR", lastActive: "1 day ago", current: false },
    ],
  },
  {
    id: "7", name: "Taylor Kim", email: "taylor@example.com", avatar: "T", role: "Member",
    teams: [{ team: "Product Design", role: "Member" }, { team: "Mobile", role: "Lead" }],
    lastActive: "4 days ago", joined: "May 20, 2025", status: "active",
    projects: [{ name: "Pictura", key: "PIC", viaTeam: "Mobile" }],
    recentActivity: [
      { action: "Updated work item", target: "PIC-85 Mobile layout", timestamp: "4 days ago" },
      { action: "Commented on", target: "PIC-84 Touch gestures", timestamp: "5 days ago" },
      { action: "Changed status", target: "PIC-83 to Done", timestamp: "1 week ago" },
      { action: "Created work item", target: "PIC-86 Offline mode", timestamp: "1 week ago" },
      { action: "Uploaded attachment", target: "PIC-85 screenshot.png", timestamp: "2 weeks ago" },
    ],
    sessions: [
      { id: "s11", device: "MacBook Pro", browser: "Safari 18", location: "San Francisco, US", lastActive: "4 days ago", current: false },
    ],
  },
  {
    id: "8", name: "Chris Evans", email: "chris@example.com", avatar: "C", role: "Member",
    teams: [{ team: "Growth", role: "Lead" }, { team: "Data Engineering", role: "Member" }, { team: "Customer Success", role: "Member" }],
    lastActive: "2 days ago", joined: "Jun 1, 2025", status: "active",
    projects: [{ name: "Pictura", key: "PIC", viaTeam: "Growth" }, { name: "Trakr", key: "TRK", viaTeam: "Data Engineering" }],
    recentActivity: [
      { action: "Updated work item", target: "PIC-89 Onboarding", timestamp: "2 days ago" },
      { action: "Commented on", target: "PIC-87 Analytics", timestamp: "3 days ago" },
      { action: "Changed status", target: "PIC-86 to In Progress", timestamp: "4 days ago" },
      { action: "Created work item", target: "PIC-90 Referral system", timestamp: "5 days ago" },
      { action: "Commented on", target: "TRK-138 Growth metrics", timestamp: "1 week ago" },
    ],
    sessions: [
      { id: "s12", device: "Windows Laptop", browser: "Edge 124", location: "Berlin, DE", lastActive: "2 days ago", current: false },
    ],
  },
  {
    id: "9", name: "Dana White", email: "dana@example.com", avatar: "D", role: "Viewer",
    teams: [{ team: "Growth", role: "Member" }, { team: "Security", role: "Lead" }],
    lastActive: "1 week ago", joined: "Jul 15, 2025", status: "active",
    projects: [{ name: "Trakr", key: "TRK", viaTeam: "Security" }, { name: "Pictura", key: "PIC", viaTeam: "Growth" }],
    recentActivity: [
      { action: "Viewed board", target: "TRK project board", timestamp: "1 week ago" },
      { action: "Viewed work item", target: "TRK-140 Security audit", timestamp: "1 week ago" },
      { action: "Viewed board", target: "PIC project board", timestamp: "2 weeks ago" },
      { action: "Viewed sprint", target: "PIC Sprint 12", timestamp: "2 weeks ago" },
      { action: "Viewed work item", target: "PIC-82 Data privacy", timestamp: "3 weeks ago" },
    ],
    sessions: [
      { id: "s13", device: "MacBook Air", browser: "Chrome 124", location: "Berlin, DE", lastActive: "1 week ago", current: false },
    ],
  },
  {
    id: "10", name: "Robin Park", email: "robin@example.com", avatar: "R", role: "Member",
    teams: [{ team: "QA & Release", role: "Lead" }, { team: "Backend API", role: "Member" }, { team: "DevOps", role: "Member" }],
    lastActive: "6 hours ago", joined: "Aug 3, 2025", status: "active",
    projects: [{ name: "Trakr", key: "TRK", viaTeam: "QA & Release" }, { name: "Pictura", key: "PIC", viaTeam: "QA & Release" }, { name: "Pulsr", key: "PLS", viaTeam: "QA & Release" }],
    recentActivity: [
      { action: "Changed status", target: "TRK-141 to QA", timestamp: "6 hours ago" },
      { action: "Commented on", target: "TRK-140 Test results", timestamp: "Yesterday" },
      { action: "Created work item", target: "TRK-146 Regression test", timestamp: "2 days ago" },
      { action: "Updated work item", target: "PIC-88 QA pass", timestamp: "3 days ago" },
      { action: "Changed status", target: "PIC-87 to Done", timestamp: "4 days ago" },
    ],
    sessions: [
      { id: "s14", device: "Linux Desktop", browser: "Firefox 132", location: "Tokyo, JP", lastActive: "6 hours ago", current: false },
      { id: "s15", device: "Android Phone", browser: "Chrome 124", location: "Tokyo, JP", lastActive: "1 day ago", current: false },
    ],
  },
  {
    id: "11", name: "Sam Torres", email: "sam@example.com", avatar: "S", role: "Member",
    teams: [{ team: "QA & Release", role: "Member" }, { team: "DevOps", role: "Lead" }, { team: "Security", role: "Member" }],
    lastActive: "3 days ago", joined: "Sep 12, 2025", status: "active",
    projects: [{ name: "Trakr", key: "TRK", viaTeam: "DevOps" }, { name: "Pictura", key: "PIC", viaTeam: "QA & Release" }, { name: "Pulsr", key: "PLS", viaTeam: "DevOps" }],
    recentActivity: [
      { action: "Deployed", target: "PIC v1.8.0 to staging", timestamp: "3 days ago" },
      { action: "Updated work item", target: "TRK-139 CI pipeline", timestamp: "4 days ago" },
      { action: "Commented on", target: "TRK-138 Infra costs", timestamp: "5 days ago" },
      { action: "Changed status", target: "TRK-137 to Done", timestamp: "1 week ago" },
      { action: "Created work item", target: "TRK-140 Monitoring", timestamp: "1 week ago" },
    ],
    sessions: [
      { id: "s16", device: "MacBook Pro", browser: "Chrome 124", location: "Madrid, ES", lastActive: "3 days ago", current: false },
    ],
  },
  {
    id: "12", name: "Jamie Nguyen", email: "jamie@example.com", avatar: "J", role: "Guest",
    teams: [],
    lastActive: "2 weeks ago", joined: "Oct 5, 2025", status: "deactivated",
    projects: [],
    recentActivity: [
      { action: "Viewed board", target: "PIC project board", timestamp: "2 weeks ago" },
      { action: "Commented on", target: "PIC-80 Feedback", timestamp: "3 weeks ago" },
      { action: "Viewed work item", target: "PIC-79 UX review", timestamp: "3 weeks ago" },
      { action: "Viewed sprint", target: "PIC Sprint 10", timestamp: "1 month ago" },
      { action: "Account deactivated", target: "By Hannes", timestamp: "2 weeks ago" },
    ],
    sessions: [],
  },
];

const initialInvitations: Invitation[] = [
  { id: "i1", email: "casey@newco.com", role: "Member", sentAt: "Apr 11, 2026", sentBy: "Hannes" },
  { id: "i2", email: "quinn@partner.io", role: "Guest", sentAt: "Apr 10, 2026", sentBy: "Sarah Chen" },
];

const MAX_VISIBLE_TEAMS = 2;

export default function MembersPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [members, setMembers] = useState<OrgMember[]>(initialMembers);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState<OrgRole | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("Member");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = members.filter((m) => {
    if (searchText) {
      const q = searchText.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    }
    if (roleFilter && m.role !== roleFilter) return false;
    return true;
  });

  const paginatedMembers = paginate(filtered, currentPage, pageSize);

  // Reset to page 1 when filters change
  const resetPage = () => setCurrentPage(1);

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((m) => m.id)));
  }

  function changeRole(id: string, role: OrgRole) {
    setMembers(members.map((m) => (m.id === id ? { ...m, role } : m)));
    setMenuOpen(null);
  }

  function deactivateMember(id: string) {
    setMembers(members.map((m) => (m.id === id ? { ...m, status: m.status === "active" ? "deactivated" as const : "active" as const } : m)));
    setMenuOpen(null);
  }

  function removeMember(id: string) {
    setMembers(members.filter((m) => m.id !== id));
    setMenuOpen(null);
    if (expandedId === id) setExpandedId(null);
  }

  function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInvitations([...invitations, { id: String(Date.now()), email: inviteEmail.trim(), role: inviteRole, sentAt: "Apr 13, 2026", sentBy: "Hannes" }]);
    setInviteEmail("");
    setShowInvite(false);
  }

  function revokeInvite(id: string) {
    setInvitations(invitations.filter((i) => i.id !== id));
  }

  function bulkChangeRole(role: OrgRole) {
    setMembers(members.map((m) => (selectedIds.has(m.id) && m.role !== "Owner" ? { ...m, role } : m)));
    setSelectedIds(new Set());
  }

  function bulkRemove() {
    setMembers(members.filter((m) => !selectedIds.has(m.id) || m.role === "Owner"));
    setSelectedIds(new Set());
  }

  function handleRowClick(memberId: string) {
    if (expandedId === memberId) {
      setExpandedId(null);
    } else {
      setExpandedId(memberId);
      setMenuOpen(null);
    }
  }

  const deviceIcon = (device: string) => {
    if (device.toLowerCase().includes("phone") || device.toLowerCase().includes("iphone") || device.toLowerCase().includes("android")) return Smartphone;
    if (device.toLowerCase().includes("ipad") || device.toLowerCase().includes("tablet")) return Laptop;
    return Monitor;
  };

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">Owner view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav variant={variant} activeTab="members" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Members</h2>
              <p className="text-xs text-text-tertiary mt-0.5">{members.filter((m) => m.status === "active").length} active members, {invitations.length} pending invitations</p>
            </div>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Invite Member
            </button>
          </div>

          {/* Invite form */}
          {showInvite && (
            <div className="bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">Invite New Member</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-content-bg border border-border rounded-md">
                    <Mail className="w-3.5 h-3.5 text-text-tertiary" />
                    <input
                      autoFocus
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                      placeholder="Email address..."
                      className="flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                  className="px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg"
                >
                  {allRoles.filter((r) => r !== "Owner").map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button onClick={sendInvite} disabled={!inviteEmail.trim()} className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors">
                  Send Invite
                </button>
                <button onClick={() => { setShowInvite(false); setInviteEmail(""); }} className="px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Admin delegation info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-medium">Role visibility differs by permission level</p>
              <p>
                <span className="font-medium">Admins</span> can manage teams they lead, add/remove members from their teams, and create projects
                &mdash; but cannot access Plans &amp; Billing, Security, or Audit Log tabs.
              </p>
              <p>
                <span className="font-medium">Members</span> and <span className="font-medium">Viewers</span> see a read-only version of this page.
              </p>
            </div>
          </div>

          {/* Filters + bulk actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); resetPage(); }}
                placeholder="Search members..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => { setRoleFilter(roleFilter ? null : "Member"); resetPage(); }}
                className={`h-8 flex items-center gap-1.5 px-2.5 text-xs border rounded-md transition-colors ${
                  roleFilter ? "border-accent/50 bg-accent/5 text-accent" : "border-border text-text-secondary hover:border-border"
                }`}
              >
                Role{roleFilter && `: ${roleFilter}`}
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {selectedIds.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-text-tertiary">{selectedIds.size} selected</span>
                <select
                  onChange={(e) => { if (e.target.value) bulkChangeRole(e.target.value as OrgRole); e.target.value = ""; }}
                  className="h-8 px-2 text-xs border border-border rounded-md bg-content-bg text-text-secondary"
                  defaultValue=""
                >
                  <option value="" disabled>Change role...</option>
                  {allRoles.filter((r) => r !== "Owner").map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button onClick={bulkRemove} className="h-8 px-2.5 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors">
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Members table */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="accent-accent"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase">Member</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-24">Role</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase">Teams</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-28">Last Active</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-28">Joined</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((member) => {
                  const isExpanded = expandedId === member.id;
                  const visibleTeams = member.teams.slice(0, MAX_VISIBLE_TEAMS);
                  const hiddenCount = member.teams.length - MAX_VISIBLE_TEAMS;

                  return (
                    <tr key={member.id} className="group">
                      <td colSpan={7} className="p-0">
                        <div className={`${isExpanded ? "bg-accent/5" : ""}`}>
                          {/* Main row */}
                          <div className={`flex items-center border-b border-border/50 transition-colors ${!isExpanded ? "hover:bg-content-bg/50" : ""} ${member.status === "deactivated" ? "opacity-50" : ""}`}>
                            <div className="w-10 px-4 py-2.5">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(member.id)}
                                onChange={() => toggleSelect(member.id)}
                                className="accent-accent"
                              />
                            </div>
                            <div className="flex-1 px-3 py-2.5 cursor-pointer" onClick={() => handleRowClick(member.id)}>
                              <div className="flex items-center gap-2.5">
                                <ChevronRight className={`w-3.5 h-3.5 text-text-tertiary transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                                <span className="w-7 h-7 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {member.avatar}
                                </span>
                                <div>
                                  <p className="text-sm text-text-primary font-medium">{member.name}</p>
                                  <p className="text-xs text-text-tertiary">{member.email}</p>
                                </div>
                                {member.ssoManaged && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 rounded font-medium">SSO</span>
                                )}
                                {member.status === "deactivated" && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-500 border border-red-200 rounded">Deactivated</span>
                                )}
                              </div>
                            </div>
                            <div className="w-24 px-3 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${roleColors[member.role]}`}>
                                {member.role}
                              </span>
                            </div>
                            <div className="flex-1 px-3 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {visibleTeams.map((t) => (
                                  <span key={t.team} className="px-1.5 py-0.5 text-[10px] bg-content-bg border border-border rounded text-text-secondary">{t.team}</span>
                                ))}
                                {hiddenCount > 0 && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-accent/10 text-accent border border-accent/20 rounded font-medium cursor-pointer" onClick={() => handleRowClick(member.id)}>
                                    +{hiddenCount} more
                                  </span>
                                )}
                                {member.teams.length === 0 && <span className="text-xs text-text-tertiary">--</span>}
                              </div>
                            </div>
                            <div className="w-28 px-3 py-2.5 text-xs text-text-tertiary">{member.lastActive}</div>
                            <div className="w-28 px-3 py-2.5 text-xs text-text-tertiary">{member.joined}</div>
                            <div className="w-10 px-3 py-2.5 relative">
                              {member.role !== "Owner" && (
                                <>
                                  <button
                                    onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                                    className="p-1 text-text-tertiary hover:text-text-secondary rounded transition-colors"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {menuOpen === member.id && (
                                    <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 min-w-[160px]">
                                      <div className="py-1">
                                        <div className="px-3 py-1 text-[10px] text-text-tertiary uppercase tracking-wider">Change role</div>
                                        {allRoles.filter((r) => r !== "Owner" && r !== member.role).map((r) => (
                                          <button key={r} onClick={() => changeRole(member.id, r)} className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-content-bg flex items-center gap-2">
                                            <ShieldCheck className="w-3 h-3" /> {r}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="border-t border-border py-1">
                                        <button onClick={() => deactivateMember(member.id)} className="w-full text-left px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                          <ShieldAlert className="w-3 h-3" /> {member.status === "active" ? "Deactivate" : "Reactivate"}
                                        </button>
                                        {!member.ssoManaged && (
                                          <button onClick={() => removeMember(member.id)} className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2">
                                            <UserMinus className="w-3 h-3" /> Remove
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Expanded detail panel */}
                          {isExpanded && (
                            <div className="px-6 py-4 border-b border-border/50 space-y-5">
                              <div className="grid grid-cols-2 gap-6">
                                {/* Left column: Profile + Teams + Projects */}
                                <div className="space-y-5">
                                  {/* Full profile */}
                                  <div>
                                    <h4 className="text-xs font-medium text-text-primary mb-2">Profile</h4>
                                    <div className="bg-content-bg border border-border rounded-lg p-3 space-y-2">
                                      <div className="flex items-center gap-3">
                                        <span className="w-10 h-10 rounded-full bg-accent/10 text-accent text-sm font-bold flex items-center justify-center">
                                          {member.avatar}
                                        </span>
                                        <div>
                                          <p className="text-sm text-text-primary font-medium">{member.name}</p>
                                          <p className="text-xs text-text-tertiary">{member.email}</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                                        <div>
                                          <p className="text-[10px] text-text-tertiary">Role</p>
                                          <div className="mt-0.5">
                                            {member.role === "Owner" ? (
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${roleColors[member.role]}`}>
                                                {member.role}
                                              </span>
                                            ) : (
                                              <select
                                                value={member.role}
                                                onChange={(e) => changeRole(member.id, e.target.value as OrgRole)}
                                                className="px-2 py-0.5 text-xs border border-border rounded-md bg-surface"
                                              >
                                                {allRoles.filter((r) => r !== "Owner").map((r) => (
                                                  <option key={r} value={r}>{r}</option>
                                                ))}
                                              </select>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-text-tertiary">Joined</p>
                                          <p className="text-xs text-text-primary mt-0.5">{member.joined}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-text-tertiary">Last Active</p>
                                          <p className="text-xs text-text-primary mt-0.5">{member.lastActive}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-text-tertiary">Status</p>
                                          <p className={`text-xs mt-0.5 ${member.status === "active" ? "text-emerald-600" : "text-red-500"}`}>
                                            {member.status === "active" ? "Active" : "Deactivated"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Teams */}
                                  <div>
                                    <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-text-tertiary" />
                                      Teams ({member.teams.length})
                                    </h4>
                                    <div className="bg-content-bg border border-border rounded-lg overflow-hidden">
                                      {member.teams.length > 0 ? member.teams.map((t) => (
                                        <div key={t.team} className="flex items-center justify-between px-3 py-2 border-b border-border/50 last:border-b-0">
                                          <span className="text-xs text-text-primary">{t.team}</span>
                                          <span className={`px-1.5 py-0.5 text-[10px] rounded-full border font-medium ${
                                            t.role === "Lead"
                                              ? "bg-purple-50 text-purple-600 border-purple-200"
                                              : "bg-gray-50 text-gray-500 border-gray-200"
                                          }`}>
                                            {t.role}
                                          </span>
                                        </div>
                                      )) : (
                                        <div className="px-3 py-2 text-xs text-text-tertiary">No team memberships</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Projects */}
                                  <div>
                                    <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                                      <FolderKanban className="w-3.5 h-3.5 text-text-tertiary" />
                                      Project Access ({member.projects.length})
                                    </h4>
                                    <div className="bg-content-bg border border-border rounded-lg overflow-hidden">
                                      {member.projects.length > 0 ? member.projects.map((p) => (
                                        <div key={`${p.key}-${p.viaTeam}`} className="flex items-center justify-between px-3 py-2 border-b border-border/50 last:border-b-0">
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded bg-accent/20 text-accent text-[9px] font-bold flex items-center justify-center">
                                              {p.key.charAt(0)}
                                            </span>
                                            <span className="text-xs text-text-primary">{p.name}</span>
                                            <span className="text-[10px] text-text-tertiary font-mono">{p.key}</span>
                                          </div>
                                          <span className="text-[10px] text-text-tertiary">via {p.viaTeam}</span>
                                        </div>
                                      )) : (
                                        <div className="px-3 py-2 text-xs text-text-tertiary">No project access</div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right column: Activity + Sessions + Actions */}
                                <div className="space-y-5">
                                  {/* Recent activity */}
                                  <div>
                                    <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                                      <Activity className="w-3.5 h-3.5 text-text-tertiary" />
                                      Recent Activity
                                    </h4>
                                    <div className="bg-content-bg border border-border rounded-lg overflow-hidden">
                                      {member.recentActivity.map((entry, i) => (
                                        <div key={i} className="flex items-start gap-2 px-3 py-2 border-b border-border/50 last:border-b-0">
                                          <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary mt-1.5 shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-text-primary">
                                              {entry.action} <span className="text-text-secondary">{entry.target}</span>
                                            </p>
                                            <p className="text-[10px] text-text-tertiary">{entry.timestamp}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Sessions */}
                                  <div>
                                    <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                                      <Monitor className="w-3.5 h-3.5 text-text-tertiary" />
                                      Active Sessions ({member.sessions.length})
                                    </h4>
                                    <div className="bg-content-bg border border-border rounded-lg overflow-hidden">
                                      {member.sessions.length > 0 ? member.sessions.map((session) => {
                                        const DeviceIcon = deviceIcon(session.device);
                                        return (
                                          <div key={session.id} className="flex items-center gap-2.5 px-3 py-2 border-b border-border/50 last:border-b-0">
                                            <DeviceIcon className="w-4 h-4 text-text-tertiary shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs text-text-primary flex items-center gap-1.5">
                                                {session.device}
                                                {session.current && (
                                                  <span className="px-1 py-0.5 text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">Current</span>
                                                )}
                                              </p>
                                              <p className="text-[10px] text-text-tertiary">{session.browser} &middot; {session.location}</p>
                                            </div>
                                            <span className="text-[10px] text-text-tertiary shrink-0">{session.lastActive}</span>
                                          </div>
                                        );
                                      }) : (
                                        <div className="px-3 py-2 text-xs text-text-tertiary">No active sessions</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  {member.role !== "Owner" && (
                                    <div className="border border-red-200 rounded-lg p-3 space-y-2">
                                      <h4 className="text-xs font-medium text-red-600">Actions</h4>
                                      {member.ssoManaged ? (
                                        <>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => deactivateMember(member.id)}
                                              className="px-3 py-1.5 text-xs text-amber-600 border border-amber-200 rounded-md hover:bg-amber-50 transition-colors"
                                            >
                                              {member.status === "active" ? "Deactivate" : "Reactivate"}
                                            </button>
                                          </div>
                                          <p className="text-[10px] text-text-tertiary">
                                            This user&apos;s identity is managed by your SSO provider. They won&apos;t be able to access Trakr, but their account remains until removed from your identity provider.
                                          </p>
                                        </>
                                      ) : (
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => deactivateMember(member.id)}
                                            className="px-3 py-1.5 text-xs text-amber-600 border border-amber-200 rounded-md hover:bg-amber-50 transition-colors"
                                          >
                                            {member.status === "active" ? "Deactivate" : "Reactivate"}
                                          </button>
                                          <button
                                            onClick={() => removeMember(member.id)}
                                            className="px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                                          >
                                            Remove from Organization
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              totalItems={filtered.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              noun="members"
            />
          </div>

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-tertiary" />
                Pending Invitations
              </h2>
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0">
                    <Mail className="w-4 h-4 text-text-tertiary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">{inv.email}</p>
                      <p className="text-xs text-text-tertiary">Invited by {inv.sentBy} on {inv.sentAt}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full border font-medium ${roleColors[inv.role]}`}>
                      {inv.role}
                    </span>
                    <button className="px-2 py-1 text-xs text-text-tertiary hover:text-accent border border-border rounded transition-colors">
                      Resend
                    </button>
                    <button onClick={() => revokeInvite(inv.id)} className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors">
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
