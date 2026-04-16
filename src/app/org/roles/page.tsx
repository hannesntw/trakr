"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Plus, Check, X, Shield, Copy, Trash2 } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";
import { useOrg } from "@/lib/use-org";
import { PERMISSIONS } from "@/lib/plans";

type PermissionKey = typeof PERMISSIONS[number];

interface Role {
  id: string;
  name: string;
  isDefault: boolean;
  permissions: PermissionKey[];
}

interface PermissionDef {
  key: PermissionKey;
  label: string;
  description: string;
  category: string;
}

const permissionDefs: PermissionDef[] = [
  { key: "projects.create", label: "Create project", description: "Create new projects in the org", category: "Projects" },
  { key: "projects.delete", label: "Delete project", description: "Delete projects and all data", category: "Projects" },
  { key: "projects.settings", label: "Project settings", description: "Modify project configuration", category: "Projects" },
  { key: "members.manage", label: "Manage members", description: "Change roles and remove members", category: "Organization" },
  { key: "members.invite", label: "Invite members", description: "Send organization invitations", category: "Organization" },
  { key: "billing.manage", label: "Manage billing", description: "View invoices and change plans", category: "Organization" },
  { key: "work_items.create", label: "Create work items", description: "Create stories, bugs, tasks", category: "Work Items" },
  { key: "work_items.edit", label: "Edit work items", description: "Edit title, description, state", category: "Work Items" },
  { key: "work_items.delete", label: "Delete work items", description: "Permanently delete work items", category: "Work Items" },
  { key: "sprints.manage", label: "Manage sprints", description: "Create, start, complete sprints", category: "Planning" },
  { key: "integrations.manage", label: "Manage integrations", description: "Connect GitHub, SSO, webhooks", category: "Integrations" },
  { key: "reports.view", label: "View reports", description: "Access velocity and burndown charts", category: "Reports" },
];

const permissionCategories = [...new Set(permissionDefs.map((p) => p.category))];

export default function RolesPage() {
  const org = useOrg();
  const [roles, setRoles] = useState<Role[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!org.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${org.id}/roles`);
      if (res.ok) {
        setRoles(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [org.id]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  async function togglePermission(roleId: string, perm: PermissionKey) {
    const role = roles.find((r) => r.id === roleId);
    if (!role || role.name === "owner") return;

    const has = role.permissions.includes(perm);
    const newPerms = has
      ? role.permissions.filter((p) => p !== perm)
      : [...role.permissions, perm];

    const res = await fetch(`/api/orgs/${org.id}/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: newPerms }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRoles((prev) => prev.map((r) => (r.id === roleId ? updated : r)));
    }
  }

  async function createRole() {
    if (!newName.trim()) return;
    const res = await fetch(`/api/orgs/${org.id}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), permissions: ["work_items.create", "work_items.edit"] }),
    });
    if (res.ok) {
      const role = await res.json();
      setRoles([...roles, role]);
      setNewName("");
      setCreating(false);
    }
  }

  async function duplicateRole(roleId: string) {
    const source = roles.find((r) => r.id === roleId);
    if (!source) return;
    const res = await fetch(`/api/orgs/${org.id}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${source.name} (copy)`, permissions: source.permissions }),
    });
    if (res.ok) {
      const role = await res.json();
      setRoles([...roles, role]);
    }
  }

  async function deleteRole(roleId: string) {
    const res = await fetch(`/api/orgs/${org.id}/roles/${roleId}`, { method: "DELETE" });
    if (res.ok) {
      setRoles(roles.filter((r) => r.id !== roleId));
    }
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full capitalize">{org.role} view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-8">
          <OrgTabNav />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Roles & Permissions</h2>
              <p className="text-xs text-text-tertiary mt-0.5">Define what each role can do across your organization</p>
            </div>
            {(org.role === "owner" || org.role === "admin") && (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Create Custom Role
              </button>
            )}
          </div>

          {/* Create form */}
          {creating && (
            <div className="bg-surface border border-accent/30 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-text-primary">New Custom Role</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-text-tertiary block mb-1">Role Name</label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createRole()}
                    placeholder="e.g. Tech Lead"
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setCreating(false); setNewName(""); }} className="px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary">
                  Cancel
                </button>
                <button onClick={createRole} disabled={!newName.trim()} className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors">
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && roles.length === 0 && (
            <div className="text-center py-12 text-sm text-text-tertiary">Loading roles...</div>
          )}

          {/* RBAC Matrix */}
          {roles.length > 0 && (
            <div className="bg-surface border border-border rounded-lg overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase sticky left-0 bg-surface min-w-[200px]">
                      Permission
                    </th>
                    {roles.map((role) => (
                      <th key={role.id} className="px-3 py-3 text-center min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-text-tertiary" />
                            <span className="text-xs font-medium text-text-primary capitalize">{role.name}</span>
                          </div>
                          {!role.isDefault && (
                            <div className="flex gap-1 mt-0.5">
                              <button onClick={() => duplicateRole(role.id)} className="p-0.5 text-text-tertiary hover:text-accent" title="Duplicate">
                                <Copy className="w-3 h-3" />
                              </button>
                              <button onClick={() => deleteRole(role.id)} className="p-0.5 text-text-tertiary hover:text-red-500" title="Delete">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {role.isDefault && (
                            <span className="text-[9px] text-text-tertiary">default</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionCategories.map((cat) => (
                    <Fragment key={cat}>
                      <tr>
                        <td colSpan={roles.length + 1} className="px-4 py-2 bg-content-bg/50">
                          <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{cat}</span>
                        </td>
                      </tr>
                      {permissionDefs
                        .filter((p) => p.category === cat)
                        .map((perm) => (
                          <tr key={perm.key} className="border-b border-border/30 hover:bg-content-bg/30 transition-colors">
                            <td className="px-4 py-2 sticky left-0 bg-surface">
                              <p className="text-xs text-text-primary font-medium">{perm.label}</p>
                              <p className="text-[10px] text-text-tertiary">{perm.description}</p>
                            </td>
                            {roles.map((role) => {
                              const has = role.permissions.includes(perm.key);
                              const isOwner = role.name === "owner";
                              const canEdit = (org.role === "owner" || org.role === "admin") && !isOwner;
                              return (
                                <td key={role.id} className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => canEdit && togglePermission(role.id, perm.key)}
                                    className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                      has
                                        ? "bg-accent/10 text-accent"
                                        : "bg-content-bg text-transparent hover:text-text-tertiary"
                                    } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          {roles.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-text-tertiary">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-accent/10 text-accent flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                <span>Permission granted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-content-bg flex items-center justify-center">
                  <X className="w-3 h-3 text-text-tertiary/30" />
                </div>
                <span>Permission denied</span>
              </div>
              <span className="ml-auto">Click a cell to toggle. Owner permissions cannot be changed.</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

