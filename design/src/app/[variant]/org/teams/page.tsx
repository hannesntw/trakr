"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Users, FolderKanban, Search, ChevronRight, ChevronDown, X, Check, Trash2, UserPlus, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { Pagination, paginate } from "@/components/Pagination";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  teamRole: "Lead" | "Member";
}

interface ProjectAccess {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
}

interface TeamRow {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  projectsCount: number;
  lead: string;
  created: string;
  members: TeamMember[];
  projects: ProjectAccess[];
}

const allProjects: ProjectAccess[] = [
  { id: "p1", name: "Stori", key: "TRK", enabled: true },
  { id: "p2", name: "Pictura", key: "PIC", enabled: true },
  { id: "p3", name: "Pulsr", key: "PLS", enabled: false },
];

const memberPool: TeamMember[] = [
  { id: "m1", name: "Hannes", email: "hannes@example.com", avatar: "H", teamRole: "Lead" },
  { id: "m2", name: "Sarah Chen", email: "sarah@example.com", avatar: "S", teamRole: "Member" },
  { id: "m3", name: "Alex Rivera", email: "alex@example.com", avatar: "A", teamRole: "Member" },
  { id: "m4", name: "Peter Schmidt", email: "peter@example.com", avatar: "P", teamRole: "Member" },
  { id: "m5", name: "Maya Patel", email: "maya@example.com", avatar: "M", teamRole: "Lead" },
  { id: "m6", name: "Jordan Lee", email: "jordan@example.com", avatar: "J", teamRole: "Member" },
  { id: "m7", name: "Taylor Kim", email: "taylor@example.com", avatar: "T", teamRole: "Member" },
  { id: "m8", name: "Chris Evans", email: "chris@example.com", avatar: "C", teamRole: "Member" },
  { id: "m9", name: "Dana White", email: "dana@example.com", avatar: "D", teamRole: "Member" },
  { id: "m10", name: "Robin Park", email: "robin@example.com", avatar: "R", teamRole: "Member" },
  { id: "m11", name: "Sam Torres", email: "sam@example.com", avatar: "S", teamRole: "Member" },
  { id: "m12", name: "Jamie Nguyen", email: "jamie@example.com", avatar: "J", teamRole: "Member" },
];

function pickMembers(leadId: string, memberIds: string[]): TeamMember[] {
  return [leadId, ...memberIds].map((id) => {
    const m = memberPool.find((p) => p.id === id)!;
    return { ...m, teamRole: m.id === leadId ? "Lead" as const : "Member" as const };
  });
}

function pickProjects(enabledKeys: string[]): ProjectAccess[] {
  return allProjects.map((p) => ({ ...p, enabled: enabledKeys.includes(p.key) }));
}

const initialTeams: TeamRow[] = [
  { id: "1", name: "Platform Engineering", description: "Core infrastructure and developer tooling", membersCount: 4, projectsCount: 2, lead: "Hannes", created: "Jan 15, 2025", members: pickMembers("m1", ["m2", "m3", "m4"]), projects: pickProjects(["TRK", "PIC"]) },
  { id: "2", name: "Product Design", description: "UX research, interaction design, and design systems", membersCount: 3, projectsCount: 2, lead: "Maya Patel", created: "Feb 3, 2025", members: pickMembers("m5", ["m6", "m7"]), projects: pickProjects(["TRK", "PIC"]) },
  { id: "3", name: "Growth", description: "Marketing, analytics, and customer acquisition", membersCount: 2, projectsCount: 1, lead: "Chris Evans", created: "Mar 10, 2025", members: pickMembers("m8", ["m9"]), projects: pickProjects(["PIC"]) },
  { id: "4", name: "QA & Release", description: "Test automation, quality assurance, and release management", membersCount: 5, projectsCount: 3, lead: "Robin Park", created: "Apr 1, 2025", members: pickMembers("m10", ["m11", "m3", "m2", "m4"]), projects: pickProjects(["TRK", "PIC", "PLS"]) },
  { id: "5", name: "Backend API", description: "REST API development, database, and performance", membersCount: 5, projectsCount: 2, lead: "Alex Rivera", created: "Apr 15, 2025", members: pickMembers("m3", ["m1", "m4", "m11", "m10"]), projects: pickProjects(["TRK", "PIC"]) },
  { id: "6", name: "Mobile", description: "iOS and Android native app development", membersCount: 3, projectsCount: 1, lead: "Taylor Kim", created: "May 1, 2025", members: pickMembers("m7", ["m6", "m9"]), projects: pickProjects(["PIC"]) },
  { id: "7", name: "DevOps", description: "CI/CD pipelines, monitoring, and infrastructure automation", membersCount: 4, projectsCount: 3, lead: "Sam Torres", created: "Jun 10, 2025", members: pickMembers("m11", ["m1", "m3", "m10"]), projects: pickProjects(["TRK", "PIC", "PLS"]) },
  { id: "8", name: "Data Engineering", description: "Data pipelines, analytics infrastructure, and reporting", membersCount: 4, projectsCount: 2, lead: "Jordan Lee", created: "Jul 20, 2025", members: pickMembers("m6", ["m8", "m9", "m12"]), projects: pickProjects(["TRK", "PIC"]) },
  { id: "9", name: "Security", description: "Application security, penetration testing, and compliance", membersCount: 3, projectsCount: 2, lead: "Dana White", created: "Aug 5, 2025", members: pickMembers("m9", ["m11", "m4"]), projects: pickProjects(["TRK", "PLS"]) },
  { id: "10", name: "Customer Success", description: "Onboarding, support escalation, and feedback loops", membersCount: 3, projectsCount: 1, lead: "Peter Schmidt", created: "Sep 12, 2025", members: pickMembers("m4", ["m8", "m12"]), projects: pickProjects(["PIC"]) },
];

export default function TeamsPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [teams, setTeams] = useState<TeamRow[]>(initialTeams);
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = teams.filter((t) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.lead.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  const paginatedTeams = paginate(filtered, currentPage, pageSize);

  function createTeam() {
    if (!newName.trim()) return;
    const team: TeamRow = {
      id: String(Date.now()),
      name: newName.trim(),
      description: newDesc.trim(),
      membersCount: 1,
      projectsCount: 0,
      lead: "Hannes",
      created: "Apr 13, 2026",
      members: [{ id: "m1", name: "Hannes", email: "hannes@example.com", avatar: "H", teamRole: "Lead" }],
      projects: allProjects.map((p) => ({ ...p, enabled: false })),
    };
    setTeams([...teams, team]);
    setNewName("");
    setNewDesc("");
    setCreating(false);
  }

  function removeTeam(id: string) {
    setTeams(teams.filter((t) => t.id !== id));
    if (expandedId === id) setExpandedId(null);
    setConfirmDeleteId(null);
  }

  function removeMemberFromTeam(teamId: string, memberId: string) {
    setTeams(teams.map((t) => {
      if (t.id !== teamId) return t;
      const newMembers = t.members.filter((m) => m.id !== memberId);
      return { ...t, members: newMembers, membersCount: newMembers.length };
    }));
  }

  function toggleProjectAccess(teamId: string, projectId: string) {
    setTeams(teams.map((t) => {
      if (t.id !== teamId) return t;
      const newProjects = t.projects.map((p) => p.id === projectId ? { ...p, enabled: !p.enabled } : p);
      return { ...t, projects: newProjects, projectsCount: newProjects.filter((p) => p.enabled).length };
    }));
  }

  function startEditing(team: TeamRow) {
    setEditingTeamId(team.id);
    setEditName(team.name);
    setEditDesc(team.description);
  }

  function saveEditing(teamId: string) {
    setTeams(teams.map((t) => t.id === teamId ? { ...t, name: editName.trim() || t.name, description: editDesc.trim() } : t));
    setEditingTeamId(null);
  }

  function addMemberToTeam(teamId: string, member: TeamMember) {
    setTeams(teams.map((t) => {
      if (t.id !== teamId) return t;
      if (t.members.some((m) => m.id === member.id)) return t;
      const newMembers = [...t.members, { ...member, teamRole: "Member" as const }];
      return { ...t, members: newMembers, membersCount: newMembers.length };
    }));
    setMemberSearch("");
  }

  function handleRowClick(teamId: string) {
    if (expandedId === teamId) {
      setExpandedId(null);
      setEditingTeamId(null);
      setConfirmDeleteId(null);
    } else {
      setExpandedId(teamId);
      setEditingTeamId(null);
      setConfirmDeleteId(null);
    }
    setMemberSearch("");
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">Owner view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav variant={variant} activeTab="teams" />

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

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                placeholder="Search teams..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>

          {/* Teams list */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_80px_80px_120px_100px_40px] border-b border-border">
              <div className="px-4 py-2.5 text-xs font-medium text-text-tertiary uppercase">Team</div>
              <div className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase text-center flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Members</div>
              <div className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase text-center flex items-center justify-center gap-1"><FolderKanban className="w-3 h-3" /> Projects</div>
              <div className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase">Lead</div>
              <div className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase">Created</div>
              <div />
            </div>

            {paginatedTeams.map((team) => {
              const isExpanded = expandedId === team.id;
              const isEditing = editingTeamId === team.id;
              const availableToAdd = memberPool.filter(
                (mp) => !team.members.some((tm) => tm.id === mp.id) &&
                  (memberSearch ? mp.name.toLowerCase().includes(memberSearch.toLowerCase()) || mp.email.toLowerCase().includes(memberSearch.toLowerCase()) : true)
              );

              return (
                <div key={team.id} className={`border-b border-border/50 last:border-b-0 ${isExpanded ? "bg-accent/5" : ""}`}>
                  {/* Team row */}
                  <div
                    className={`grid grid-cols-[1fr_80px_80px_120px_100px_40px] cursor-pointer transition-colors ${isExpanded ? "" : "hover:bg-content-bg/50"}`}
                    onClick={() => handleRowClick(team.id)}
                  >
                    <div className="px-4 py-2.5 flex items-center gap-2">
                      <ChevronRight className={`w-3.5 h-3.5 text-text-tertiary transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                      <div>
                        <p className="text-sm text-text-primary font-medium">{team.name}</p>
                        {!isExpanded && <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{team.description}</p>}
                      </div>
                    </div>
                    <div className="px-3 py-2.5 text-center text-sm text-text-secondary self-center">{team.members.length}</div>
                    <div className="px-3 py-2.5 text-center text-sm text-text-secondary self-center">{team.projects.filter((p) => p.enabled).length}</div>
                    <div className="px-3 py-2.5 self-center">
                      <span className="text-xs text-text-secondary">{team.lead}</span>
                    </div>
                    <div className="px-3 py-2.5 text-xs text-text-tertiary self-center">{team.created}</div>
                    <div className="px-3 py-2.5 self-center" />
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-5">
                      {/* Team name & description (editable) */}
                      <div className="space-y-2">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs text-text-tertiary block mb-1">Team Name</label>
                              <input
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full max-w-md px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-text-tertiary block mb-1">Description</label>
                              <input
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full max-w-md px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveEditing(team.id)} className="px-3 py-1 bg-accent hover:bg-accent-hover text-white text-xs rounded-md transition-colors flex items-center gap-1">
                                <Check className="w-3 h-3" /> Save
                              </button>
                              <button onClick={() => setEditingTeamId(null)} className="px-3 py-1 text-xs text-text-tertiary hover:text-text-secondary">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs text-text-tertiary">{team.description}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditing(team); }}
                              className="text-xs text-accent hover:text-accent-hover transition-colors shrink-0"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Members */}
                      <div>
                        <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-text-tertiary" />
                          Members ({team.members.length})
                        </h4>
                        <div className="bg-content-bg border border-border rounded-lg overflow-hidden">
                          {team.members.map((member) => (
                            <div key={member.id} className="flex items-center gap-2.5 px-3 py-2 border-b border-border/50 last:border-b-0 group">
                              <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                                {member.avatar}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-text-primary">{member.name}</p>
                                <p className="text-[10px] text-text-tertiary">{member.email}</p>
                              </div>
                              <span className={`px-1.5 py-0.5 text-[10px] rounded-full border font-medium ${
                                member.teamRole === "Lead"
                                  ? "bg-purple-50 text-purple-600 border-purple-200"
                                  : "bg-gray-50 text-gray-500 border-gray-200"
                              }`}>
                                {member.teamRole}
                              </span>
                              {member.teamRole !== "Lead" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeMemberFromTeam(team.id, member.id); }}
                                  className="p-1 text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Add member search */}
                          <div className="px-3 py-2 bg-surface/50">
                            <div className="relative">
                              <UserPlus className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                              <input
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                placeholder="Add member..."
                                className="w-full h-7 pl-8 pr-3 text-xs bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            {memberSearch && availableToAdd.length > 0 && (
                              <div className="mt-1 bg-surface border border-border rounded-md shadow-md max-h-32 overflow-auto">
                                {availableToAdd.slice(0, 5).map((mp) => (
                                  <button
                                    key={mp.id}
                                    onClick={(e) => { e.stopPropagation(); addMemberToTeam(team.id, mp); }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-content-bg transition-colors text-left"
                                  >
                                    <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[9px] font-bold flex items-center justify-center shrink-0">
                                      {mp.avatar}
                                    </span>
                                    <span className="text-text-primary">{mp.name}</span>
                                    <span className="text-text-tertiary">{mp.email}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {memberSearch && availableToAdd.length === 0 && (
                              <p className="mt-1 text-[10px] text-text-tertiary">No matching members to add.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Project access */}
                      <div>
                        <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                          <FolderKanban className="w-3.5 h-3.5 text-text-tertiary" />
                          Project Access
                        </h4>
                        <div className="bg-content-bg border border-border rounded-lg overflow-hidden">
                          {team.projects.map((project) => (
                            <div key={project.id} className="flex items-center justify-between px-3 py-2 border-b border-border/50 last:border-b-0">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-accent/20 text-accent text-[9px] font-bold flex items-center justify-center">
                                  {project.key.charAt(0)}
                                </span>
                                <span className="text-sm text-text-primary">{project.name}</span>
                                <span className="text-[10px] text-text-tertiary font-mono">{project.key}</span>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); toggleProjectAccess(team.id, project.id); }}>
                                {project.enabled
                                  ? <ToggleRight className="w-5 h-5 text-accent" />
                                  : <ToggleLeft className="w-5 h-5 text-text-tertiary" />
                                }
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Danger zone */}
                      <div className="border border-red-200 rounded-lg p-3">
                        <h4 className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Danger Zone
                        </h4>
                        {confirmDeleteId === team.id ? (
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-red-600">Are you sure? This will remove all team assignments.</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeTeam(team.id); }}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md transition-colors"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                              className="px-3 py-1 text-xs text-text-tertiary hover:text-text-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(team.id); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> Delete Team
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Pagination
            totalItems={filtered.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            noun="teams"
          />
        </div>
      </div>
    </>
  );
}
