"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Users, FolderKanban, Search, ChevronRight, X, Check, Trash2, UserPlus, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { Pagination, paginate } from "@/components/Pagination";
import { useOrg } from "@/lib/use-org";
import { formatDate } from "@/lib/utils";

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { name: string | null; email: string | null };
}

interface ProjectAccess {
  id: string;
  projectId: string;
  name: string;
  key: string;
}

interface OrgMember {
  id: string;
  userId: string;
  role: string;
  user: { name: string | null; email: string | null };
}

interface OrgProject {
  id: string;
  name: string;
  key: string;
}

interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  membersCount: number;
  projectsCount: number;
  lead: string | null;
  createdAt: string;
}

interface TeamDetail extends TeamRow {
  members: TeamMember[];
  projects: ProjectAccess[];
}

export default function TeamsPage() {
  const org = useOrg();
  const isAdmin = org.role === "owner" || org.role === "admin";

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<TeamDetail | null>(null);
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

  // Org members for add-member dropdown
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  // Org projects for project access toggles
  const [orgProjects, setOrgProjects] = useState<OrgProject[]>([]);

  const fetchTeams = useCallback(async () => {
    if (!org.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${org.id}/teams`);
      if (res.ok) {
        setTeams(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [org.id]);

  const fetchOrgMembers = useCallback(async () => {
    if (!org.id) return;
    try {
      const res = await fetch(`/api/orgs/${org.id}/members?pageSize=100`);
      if (res.ok) {
        const data = await res.json();
        setOrgMembers(data.items);
      }
    } catch {
      // ignore
    }
  }, [org.id]);

  const fetchOrgProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects`);
      if (res.ok) {
        const data = await res.json();
        // data may be an array or { items: [...] }
        setOrgProjects(Array.isArray(data) ? data : data.items ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);
  useEffect(() => { fetchOrgMembers(); }, [fetchOrgMembers]);
  useEffect(() => { fetchOrgProjects(); }, [fetchOrgProjects]);

  async function fetchTeamDetail(teamId: string) {
    const res = await fetch(`/api/orgs/${org.id}/teams/${teamId}`);
    if (res.ok) {
      const detail = await res.json();
      setExpandedDetail(detail);
    }
  }

  const filtered = teams.filter((t) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.lead ?? "").toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q)
    );
  });

  const paginatedTeams = paginate(filtered, currentPage, pageSize);

  async function createTeam() {
    if (!newName.trim()) return;
    const res = await fetch(`/api/orgs/${org.id}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
    });
    if (res.ok) {
      const team = await res.json();
      setTeams([...teams, team]);
      setNewName("");
      setNewDesc("");
      setCreating(false);
    }
  }

  async function removeTeam(id: string) {
    const res = await fetch(`/api/orgs/${org.id}/teams/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTeams(teams.filter((t) => t.id !== id));
      if (expandedId === id) {
        setExpandedId(null);
        setExpandedDetail(null);
      }
      setConfirmDeleteId(null);
    }
  }

  async function removeMemberFromTeam(teamId: string, userId: string) {
    const res = await fetch(`/api/orgs/${org.id}/teams/${teamId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok && expandedDetail) {
      const newMembers = expandedDetail.members.filter((m) => m.userId !== userId);
      setExpandedDetail({ ...expandedDetail, members: newMembers });
      setTeams(teams.map((t) => t.id === teamId ? { ...t, membersCount: newMembers.length } : t));
    }
  }

  async function addMemberToTeam(teamId: string, userId: string) {
    const res = await fetch(`/api/orgs/${org.id}/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: "member" }),
    });
    if (res.ok && expandedDetail) {
      const newMember = await res.json();
      const newMembers = [...expandedDetail.members, newMember];
      setExpandedDetail({ ...expandedDetail, members: newMembers });
      setTeams(teams.map((t) => t.id === teamId ? { ...t, membersCount: newMembers.length } : t));
    }
    setMemberSearch("");
  }

  async function toggleProjectAccess(teamId: string, projectId: string, isCurrentlyEnabled: boolean) {
    if (isCurrentlyEnabled) {
      const res = await fetch(`/api/orgs/${org.id}/teams/${teamId}/projects`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok && expandedDetail) {
        const newProjects = expandedDetail.projects.filter((p) => p.projectId !== projectId);
        setExpandedDetail({ ...expandedDetail, projects: newProjects });
        setTeams(teams.map((t) => t.id === teamId ? { ...t, projectsCount: newProjects.length } : t));
      }
    } else {
      const res = await fetch(`/api/orgs/${org.id}/teams/${teamId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok && expandedDetail) {
        const newAccess = await res.json();
        const newProjects = [...expandedDetail.projects, newAccess];
        setExpandedDetail({ ...expandedDetail, projects: newProjects });
        setTeams(teams.map((t) => t.id === teamId ? { ...t, projectsCount: newProjects.length } : t));
      }
    }
  }

  function startEditing(team: TeamRow) {
    setEditingTeamId(team.id);
    setEditName(team.name);
    setEditDesc(team.description ?? "");
  }

  async function saveEditing(teamId: string) {
    const res = await fetch(`/api/orgs/${org.id}/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTeams(teams.map((t) => t.id === teamId ? { ...t, name: updated.name, description: updated.description } : t));
      if (expandedDetail?.id === teamId) {
        setExpandedDetail({ ...expandedDetail, name: updated.name, description: updated.description });
      }
    }
    setEditingTeamId(null);
  }

  function handleRowClick(teamId: string) {
    if (expandedId === teamId) {
      setExpandedId(null);
      setExpandedDetail(null);
      setEditingTeamId(null);
      setConfirmDeleteId(null);
    } else {
      setExpandedId(teamId);
      setEditingTeamId(null);
      setConfirmDeleteId(null);
      fetchTeamDetail(teamId);
    }
    setMemberSearch("");
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full capitalize">{org.role} view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <OrgTabNav />

          {/* Header with create */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Teams</h2>
              <p className="text-xs text-text-tertiary mt-0.5">{teams.length} teams in your organization</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Create Team
              </button>
            )}
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

            {loading && teams.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-text-tertiary">Loading teams...</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-text-tertiary">
                {searchText ? "No teams match your search." : "No teams yet. Create one to get started."}
              </div>
            )}

            {paginatedTeams.map((team) => {
              const isExpanded = expandedId === team.id;
              const isEditing = editingTeamId === team.id;
              const detail = isExpanded ? expandedDetail : null;

              // Members available to add (not already in team)
              const teamMemberUserIds = new Set(detail?.members.map((m) => m.userId) ?? []);
              const availableToAdd = orgMembers.filter(
                (om) =>
                  !teamMemberUserIds.has(om.userId) &&
                  (memberSearch
                    ? (om.user.name ?? "").toLowerCase().includes(memberSearch.toLowerCase()) ||
                      (om.user.email ?? "").toLowerCase().includes(memberSearch.toLowerCase())
                    : true)
              );

              // Build project access map for toggles
              const enabledProjectIds = new Set(detail?.projects.map((p) => p.projectId) ?? []);

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
                    <div className="px-3 py-2.5 text-center text-sm text-text-secondary self-center">{team.membersCount}</div>
                    <div className="px-3 py-2.5 text-center text-sm text-text-secondary self-center">{team.projectsCount}</div>
                    <div className="px-3 py-2.5 self-center">
                      <span className="text-xs text-text-secondary">{team.lead ?? "-"}</span>
                    </div>
                    <div className="px-3 py-2.5 text-xs text-text-tertiary self-center">{formatDate(team.createdAt)}</div>
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
                              <p className="text-xs text-text-tertiary">{team.description ?? "No description"}</p>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={(e) => { e.stopPropagation(); startEditing(team); }}
                                className="text-xs text-accent hover:text-accent-hover transition-colors shrink-0"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Members */}
                      <div>
                        <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-text-tertiary" />
                          Members ({detail?.members.length ?? 0})
                        </h4>
                        <div className="bg-content-bg border border-border rounded-lg overflow-hidden">
                          {!detail && (
                            <div className="px-3 py-4 text-center text-xs text-text-tertiary">Loading...</div>
                          )}
                          {detail?.members.map((member) => {
                            const displayName = member.user.name ?? member.user.email ?? "Unknown";
                            const initial = displayName.charAt(0).toUpperCase();
                            return (
                              <div key={member.id} className="flex items-center gap-2.5 px-3 py-2 border-b border-border/50 last:border-b-0 group">
                                <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {initial}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-text-primary">{displayName}</p>
                                  <p className="text-[10px] text-text-tertiary">{member.user.email}</p>
                                </div>
                                <span className={`px-1.5 py-0.5 text-[10px] rounded-full border font-medium capitalize ${
                                  member.role === "lead"
                                    ? "bg-purple-50 text-purple-600 border-purple-200"
                                    : "bg-gray-50 text-gray-500 border-gray-200"
                                }`}>
                                  {member.role}
                                </span>
                                {member.role !== "lead" && isAdmin && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeMemberFromTeam(team.id, member.userId); }}
                                    className="p-1 text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {/* Add member search */}
                          {isAdmin && (
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
                                  {availableToAdd.slice(0, 5).map((om) => {
                                    const name = om.user.name ?? om.user.email ?? "Unknown";
                                    const initial = name.charAt(0).toUpperCase();
                                    return (
                                      <button
                                        key={om.userId}
                                        onClick={(e) => { e.stopPropagation(); addMemberToTeam(team.id, om.userId); }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-content-bg transition-colors text-left"
                                      >
                                        <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[9px] font-bold flex items-center justify-center shrink-0">
                                          {initial}
                                        </span>
                                        <span className="text-text-primary">{name}</span>
                                        <span className="text-text-tertiary">{om.user.email}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {memberSearch && availableToAdd.length === 0 && (
                                <p className="mt-1 text-[10px] text-text-tertiary">No matching members to add.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Project access */}
                      <div>
                        <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                          <FolderKanban className="w-3.5 h-3.5 text-text-tertiary" />
                          Project Access
                        </h4>
                        <div className="bg-content-bg border border-border rounded-lg overflow-hidden">
                          {orgProjects.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-text-tertiary">No projects available.</div>
                          )}
                          {orgProjects.map((project) => {
                            const isEnabled = enabledProjectIds.has(project.id);
                            return (
                              <div key={project.id} className="flex items-center justify-between px-3 py-2 border-b border-border/50 last:border-b-0">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-accent/20 text-accent text-[9px] font-bold flex items-center justify-center">
                                    {project.key.charAt(0)}
                                  </span>
                                  <span className="text-sm text-text-primary">{project.name}</span>
                                  <span className="text-[10px] text-text-tertiary font-mono">{project.key}</span>
                                </div>
                                {isAdmin ? (
                                  <button onClick={(e) => { e.stopPropagation(); toggleProjectAccess(team.id, project.id, isEnabled); }}>
                                    {isEnabled
                                      ? <ToggleRight className="w-5 h-5 text-accent" />
                                      : <ToggleLeft className="w-5 h-5 text-text-tertiary" />
                                    }
                                  </button>
                                ) : (
                                  isEnabled
                                    ? <ToggleRight className="w-5 h-5 text-accent" />
                                    : <ToggleLeft className="w-5 h-5 text-text-tertiary" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Danger zone */}
                      {isAdmin && (
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
                      )}
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
