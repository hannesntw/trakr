"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Users, FolderKanban, Search, ChevronRight, X, Check, Trash2 } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";

interface TeamRow {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  projectsCount: number;
  lead: string;
  created: string;
}

const initialTeams: TeamRow[] = [
  { id: "1", name: "Platform Engineering", description: "Core infrastructure and developer tooling", membersCount: 4, projectsCount: 2, lead: "Hannes", created: "Jan 15, 2025" },
  { id: "2", name: "Product Design", description: "UX research, interaction design, and design systems", membersCount: 3, projectsCount: 2, lead: "Maya Patel", created: "Feb 3, 2025" },
  { id: "3", name: "Growth", description: "Marketing, analytics, and customer acquisition", membersCount: 2, projectsCount: 1, lead: "Chris Evans", created: "Mar 10, 2025" },
  { id: "4", name: "QA & Release", description: "Test automation, quality assurance, and release management", membersCount: 3, projectsCount: 3, lead: "Robin Park", created: "Apr 1, 2025" },
  { id: "5", name: "Backend API", description: "REST API development, database, and performance", membersCount: 5, projectsCount: 2, lead: "Alex Rivera", created: "Apr 15, 2025" },
  { id: "6", name: "Mobile", description: "iOS and Android native app development", membersCount: 3, projectsCount: 1, lead: "Taylor Kim", created: "May 1, 2025" },
  { id: "7", name: "DevOps", description: "CI/CD pipelines, monitoring, and infrastructure automation", membersCount: 2, projectsCount: 3, lead: "Sam Torres", created: "Jun 10, 2025" },
  { id: "8", name: "Data Engineering", description: "Data pipelines, analytics infrastructure, and reporting", membersCount: 4, projectsCount: 2, lead: "Jordan Lee", created: "Jul 20, 2025" },
  { id: "9", name: "Security", description: "Application security, penetration testing, and compliance", membersCount: 2, projectsCount: 2, lead: "Dana White", created: "Aug 5, 2025" },
  { id: "10", name: "Customer Success", description: "Onboarding, support escalation, and feedback loops", membersCount: 3, projectsCount: 1, lead: "Peter Schmidt", created: "Sep 12, 2025" },
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

  const filtered = teams.filter((t) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.lead.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
  });

  function createTeam() {
    if (!newName.trim()) return;
    const team: TeamRow = {
      id: String(Date.now()),
      name: newName.trim(),
      description: newDesc.trim(),
      membersCount: 0,
      projectsCount: 0,
      lead: "Hannes",
      created: "Apr 13, 2026",
    };
    setTeams([...teams, team]);
    setNewName("");
    setNewDesc("");
    setCreating(false);
  }

  function removeTeam(id: string) {
    setTeams(teams.filter((t) => t.id !== id));
    if (expandedId === id) setExpandedId(null);
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
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search teams..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-content-bg border border-border rounded-md outline-none focus:border-accent text-text-primary placeholder:text-text-tertiary"
              />
            </div>
          </div>

          {/* Teams table */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-text-tertiary uppercase">Team</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-20 text-center">
                    <span className="flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Members</span>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-20 text-center">
                    <span className="flex items-center justify-center gap-1"><FolderKanban className="w-3 h-3" /> Projects</span>
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-32">Lead</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-text-tertiary uppercase w-28">Created</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((team) => {
                  const isExpanded = expandedId === team.id;
                  return (
                    <tr
                      key={team.id}
                      className={`border-b border-border/50 transition-colors cursor-pointer ${isExpanded ? "bg-accent/5" : "hover:bg-content-bg/50"}`}
                    >
                      <td className="px-4 py-2.5" onClick={() => setExpandedId(isExpanded ? null : team.id)}>
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`w-3.5 h-3.5 text-text-tertiary transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          <div>
                            <p className="text-sm text-text-primary font-medium">{team.name}</p>
                            {isExpanded && <p className="text-xs text-text-tertiary mt-0.5">{team.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center text-sm text-text-secondary">{team.membersCount}</td>
                      <td className="px-3 py-2.5 text-center text-sm text-text-secondary">{team.projectsCount}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-text-secondary">{team.lead}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-text-tertiary">{team.created}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); removeTeam(team.id); }}
                          className="p-1 text-text-tertiary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          style={{ opacity: isExpanded ? 1 : undefined }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-text-tertiary">
            Showing {filtered.length} of {teams.length} teams
          </div>
        </div>
      </div>
    </>
  );
}
