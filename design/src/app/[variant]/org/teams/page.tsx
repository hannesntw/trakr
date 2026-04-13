"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, Users, FolderKanban, ChevronRight, X, Check, Trash2, Search } from "lucide-react";

interface TeamMember {
  name: string;
  email: string;
  avatar: string;
  role: "Lead" | "Member";
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  projects: string[];
}

const initialTeams: Team[] = [
  {
    id: "1",
    name: "Platform Engineering",
    description: "Core infrastructure and developer tooling",
    members: [
      { name: "Hannes", email: "hannes@example.com", avatar: "H", role: "Lead" },
      { name: "Sarah Chen", email: "sarah@example.com", avatar: "S", role: "Member" },
      { name: "Alex Rivera", email: "alex@example.com", avatar: "A", role: "Member" },
      { name: "Peter Schmidt", email: "peter@example.com", avatar: "P", role: "Member" },
    ],
    projects: ["Trakr", "Infrastructure"],
  },
  {
    id: "2",
    name: "Product Design",
    description: "UX research, interaction design, and design systems",
    members: [
      { name: "Maya Patel", email: "maya@example.com", avatar: "M", role: "Lead" },
      { name: "Jordan Lee", email: "jordan@example.com", avatar: "J", role: "Member" },
      { name: "Taylor Kim", email: "taylor@example.com", avatar: "T", role: "Member" },
    ],
    projects: ["Trakr", "Pictura"],
  },
  {
    id: "3",
    name: "Growth",
    description: "Marketing, analytics, and customer acquisition",
    members: [
      { name: "Chris Evans", email: "chris@example.com", avatar: "C", role: "Lead" },
      { name: "Dana White", email: "dana@example.com", avatar: "D", role: "Member" },
    ],
    projects: ["Pictura"],
  },
  {
    id: "4",
    name: "QA & Release",
    description: "Test automation, quality assurance, and release management",
    members: [
      { name: "Robin Park", email: "robin@example.com", avatar: "R", role: "Lead" },
      { name: "Sam Torres", email: "sam@example.com", avatar: "S", role: "Member" },
      { name: "Alex Rivera", email: "alex@example.com", avatar: "A", role: "Member" },
    ],
    projects: ["Trakr", "Pictura", "Infrastructure"],
  },
];

const allMembers = [
  { name: "Hannes", email: "hannes@example.com", avatar: "H" },
  { name: "Sarah Chen", email: "sarah@example.com", avatar: "S" },
  { name: "Alex Rivera", email: "alex@example.com", avatar: "A" },
  { name: "Peter Schmidt", email: "peter@example.com", avatar: "P" },
  { name: "Maya Patel", email: "maya@example.com", avatar: "M" },
  { name: "Jordan Lee", email: "jordan@example.com", avatar: "J" },
  { name: "Taylor Kim", email: "taylor@example.com", avatar: "T" },
  { name: "Chris Evans", email: "chris@example.com", avatar: "C" },
  { name: "Dana White", email: "dana@example.com", avatar: "D" },
  { name: "Robin Park", email: "robin@example.com", avatar: "R" },
  { name: "Sam Torres", email: "sam@example.com", avatar: "S" },
];

const allProjects = ["Trakr", "Pictura", "Infrastructure"];

export default function TeamsPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [expandedTeam, setExpandedTeam] = useState<string | null>("1");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [addingMemberTo, setAddingMemberTo] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  function createTeam() {
    if (!newName.trim()) return;
    const team: Team = {
      id: String(Date.now()),
      name: newName.trim(),
      description: newDesc.trim(),
      members: [],
      projects: [],
    };
    setTeams([...teams, team]);
    setNewName("");
    setNewDesc("");
    setCreating(false);
    setExpandedTeam(team.id);
  }

  function removeTeam(id: string) {
    setTeams(teams.filter((t) => t.id !== id));
    if (expandedTeam === id) setExpandedTeam(null);
  }

  function removeMember(teamId: string, email: string) {
    setTeams(teams.map((t) => t.id === teamId ? { ...t, members: t.members.filter((m) => m.email !== email) } : t));
  }

  function addMember(teamId: string, member: typeof allMembers[0]) {
    setTeams(teams.map((t) => {
      if (t.id !== teamId) return t;
      if (t.members.some((m) => m.email === member.email)) return t;
      return { ...t, members: [...t.members, { ...member, role: "Member" as const }] };
    }));
    setMemberSearch("");
    setAddingMemberTo(null);
  }

  function toggleProject(teamId: string, project: string) {
    setTeams(teams.map((t) => {
      if (t.id !== teamId) return t;
      const has = t.projects.includes(project);
      return { ...t, projects: has ? t.projects.filter((p) => p !== project) : [...t.projects, project] };
    }));
  }

  function toggleRole(teamId: string, email: string) {
    setTeams(teams.map((t) => {
      if (t.id !== teamId) return t;
      return { ...t, members: t.members.map((m) => m.email === email ? { ...m, role: m.role === "Lead" ? "Member" as const : "Lead" as const } : m) };
    }));
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization Settings</h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {/* Sub-nav */}
          <nav className="flex gap-1 border-b border-border -mt-2 mb-2">
            {[
              { href: `/${variant}/org`, label: "Overview" },
              { href: `/${variant}/org/members`, label: "Members" },
              { href: `/${variant}/org/teams`, label: "Teams", active: true },
              { href: `/${variant}/org/roles`, label: "Roles & Permissions" },
              { href: `/${variant}/org/audit`, label: "Audit Log" },
              { href: `/${variant}/org/security`, label: "Security" },
            ].map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                  tab.active
                    ? "border-accent text-accent font-medium"
                    : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Header with create */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Teams</h2>
              <p className="text-xs text-text-tertiary mt-0.5">{teams.length} teams in your organization</p>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create Team
            </button>
          </div>

          {/* Create team form */}
          {creating && (
            <div className="bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">New Team</h3>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Team Name</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTeam()}
                  placeholder="e.g. Backend Engineering"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1">Description</label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What does this team do?"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }} className="px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary">
                  Cancel
                </button>
                <button onClick={createTeam} disabled={!newName.trim()} className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors">
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Team list */}
          <div className="space-y-3">
            {teams.map((team) => {
              const isExpanded = expandedTeam === team.id;
              return (
                <div key={team.id} className="bg-surface border border-border rounded-lg overflow-hidden">
                  {/* Team header */}
                  <button
                    onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-content-bg/50 transition-colors text-left"
                  >
                    <ChevronRight className={`w-4 h-4 text-text-tertiary transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{team.name}</p>
                      <p className="text-xs text-text-tertiary truncate">{team.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-text-tertiary">
                        <Users className="w-3 h-3" /> {team.members.length}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-text-tertiary">
                        <FolderKanban className="w-3 h-3" /> {team.projects.length}
                      </span>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {/* Members section */}
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Members</span>
                          <button
                            onClick={() => setAddingMemberTo(addingMemberTo === team.id ? null : team.id)}
                            className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>

                        {addingMemberTo === team.id && (
                          <div className="mb-3 relative">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-content-bg border border-border rounded-md">
                              <Search className="w-3.5 h-3.5 text-text-tertiary" />
                              <input
                                autoFocus
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                placeholder="Search members..."
                                className="flex-1 bg-transparent text-sm outline-none"
                              />
                              <button onClick={() => { setAddingMemberTo(null); setMemberSearch(""); }}>
                                <X className="w-3 h-3 text-text-tertiary" />
                              </button>
                            </div>
                            {memberSearch && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg z-20 max-h-40 overflow-auto">
                                {allMembers
                                  .filter((m) => !team.members.some((tm) => tm.email === m.email))
                                  .filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase()))
                                  .map((m) => (
                                    <button
                                      key={m.email}
                                      onClick={() => addMember(team.id, m)}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-content-bg transition-colors"
                                    >
                                      <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center">
                                        {m.avatar}
                                      </span>
                                      <span className="text-text-primary">{m.name}</span>
                                      <span className="text-text-tertiary text-xs ml-auto">{m.email}</span>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-1">
                          {team.members.map((member) => (
                            <div key={member.email} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-content-bg/50 group">
                              <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                                {member.avatar}
                              </span>
                              <span className="text-sm text-text-primary flex-1">{member.name}</span>
                              <button
                                onClick={() => toggleRole(team.id, member.email)}
                                className={`px-2 py-0.5 text-[10px] rounded-full border font-medium ${
                                  member.role === "Lead"
                                    ? "bg-amber-50 text-amber-600 border-amber-200"
                                    : "bg-gray-50 text-gray-500 border-gray-200"
                                }`}
                              >
                                {member.role}
                              </button>
                              <button
                                onClick={() => removeMember(team.id, member.email)}
                                className="p-1 text-text-tertiary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Projects access */}
                      <div className="px-4 py-3 border-t border-border/50">
                        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-2">Project Access</span>
                        <div className="flex flex-wrap gap-2">
                          {allProjects.map((project) => {
                            const hasAccess = team.projects.includes(project);
                            return (
                              <button
                                key={project}
                                onClick={() => toggleProject(team.id, project)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors ${
                                  hasAccess
                                    ? "border-accent/50 bg-accent/5 text-accent"
                                    : "border-border text-text-tertiary hover:border-border"
                                }`}
                              >
                                {hasAccess && <Check className="w-3 h-3" />}
                                {project}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Delete team */}
                      <div className="px-4 py-2 border-t border-border/50 flex justify-end">
                        <button
                          onClick={() => removeTeam(team.id)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete team
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
