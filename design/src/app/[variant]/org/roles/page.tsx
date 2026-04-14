"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Check, X, Pencil, Trash2, Shield, Copy } from "lucide-react";
import { OrgTabNav } from "@/components/OrgTabNav";

type PermissionKey =
  | "create_project"
  | "delete_project"
  | "manage_members"
  | "manage_billing"
  | "create_work_items"
  | "edit_work_items"
  | "delete_work_items"
  | "manage_sprints"
  | "configure_workflows"
  | "view_reports"
  | "manage_integrations"
  | "api_access";

interface Permission {
  key: PermissionKey;
  label: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  permissions: Set<PermissionKey>;
  memberCount: number;
}

const permissions: Permission[] = [
  { key: "create_project", label: "Create project", description: "Create new projects in the org", category: "Projects" },
  { key: "delete_project", label: "Delete project", description: "Delete projects and all data", category: "Projects" },
  { key: "manage_members", label: "Manage members", description: "Invite, remove, and change roles", category: "Organization" },
  { key: "manage_billing", label: "Manage billing", description: "View invoices and change plans", category: "Organization" },
  { key: "create_work_items", label: "Create work items", description: "Create stories, bugs, tasks", category: "Work Items" },
  { key: "edit_work_items", label: "Edit work items", description: "Edit title, description, state", category: "Work Items" },
  { key: "delete_work_items", label: "Delete work items", description: "Permanently delete work items", category: "Work Items" },
  { key: "manage_sprints", label: "Manage sprints", description: "Create, start, complete sprints", category: "Planning" },
  { key: "configure_workflows", label: "Configure workflows", description: "Add, remove, reorder states", category: "Planning" },
  { key: "view_reports", label: "View reports", description: "Access velocity and burndown charts", category: "Reports" },
  { key: "manage_integrations", label: "Manage integrations", description: "Connect GitHub, SSO, webhooks", category: "Integrations" },
  { key: "api_access", label: "API access", description: "Generate and use API keys", category: "Integrations" },
];

const permissionCategories = [...new Set(permissions.map((p) => p.category))];

const allPerms = new Set<PermissionKey>(permissions.map((p) => p.key));

const initialRoles: Role[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Full access to everything. Cannot be removed.",
    isDefault: true,
    permissions: new Set(allPerms),
    memberCount: 1,
  },
  {
    id: "admin",
    name: "Admin",
    description: "Full access except billing and org deletion.",
    isDefault: true,
    permissions: new Set<PermissionKey>(["create_project", "delete_project", "manage_members", "create_work_items", "edit_work_items", "delete_work_items", "manage_sprints", "configure_workflows", "view_reports", "manage_integrations", "api_access"]),
    memberCount: 2,
  },
  {
    id: "member",
    name: "Member",
    description: "Can work on projects they have access to.",
    isDefault: true,
    permissions: new Set<PermissionKey>(["create_work_items", "edit_work_items", "manage_sprints", "view_reports", "api_access"]),
    memberCount: 7,
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to assigned projects.",
    isDefault: true,
    permissions: new Set<PermissionKey>(["view_reports"]),
    memberCount: 1,
  },
  {
    id: "guest",
    name: "Guest",
    description: "Limited access for external collaborators.",
    isDefault: true,
    permissions: new Set<PermissionKey>(["create_work_items", "edit_work_items"]),
    memberCount: 1,
  },
];

export default function RolesPage() {
  const params = useParams();
  const variant = params.variant as string;
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  function togglePermission(roleId: string, perm: PermissionKey) {
    setRoles(roles.map((r) => {
      if (r.id !== roleId || r.id === "owner") return r;
      const next = new Set(r.permissions);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return { ...r, permissions: next };
    }));
  }

  function createRole() {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const role: Role = {
      id,
      name: newName.trim(),
      description: newDesc.trim(),
      isDefault: false,
      permissions: new Set<PermissionKey>(["create_work_items", "edit_work_items"]),
      memberCount: 0,
    };
    setRoles([...roles, role]);
    setNewName("");
    setNewDesc("");
    setCreating(false);
  }

  function duplicateRole(roleId: string) {
    const source = roles.find((r) => r.id === roleId);
    if (!source) return;
    const role: Role = {
      id: source.id + "_copy_" + Date.now(),
      name: source.name + " (copy)",
      description: source.description,
      isDefault: false,
      permissions: new Set(source.permissions),
      memberCount: 0,
    };
    setRoles([...roles, role]);
  }

  function deleteRole(roleId: string) {
    setRoles(roles.filter((r) => r.id !== roleId));
  }

  return (
    <>
      <header className="h-14 px-6 flex items-center border-b border-border bg-surface shrink-0">
        <h1 className="text-sm font-semibold text-text-primary">Organization</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">Owner view</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-8">
          <OrgTabNav variant={variant} activeTab="roles" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Roles & Permissions</h2>
              <p className="text-xs text-text-tertiary mt-0.5">Define what each role can do across your organization</p>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create Custom Role
            </button>
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
                <div className="flex-1">
                  <label className="text-xs text-text-tertiary block mb-1">Description</label>
                  <input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="What this role is for..."
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }} className="px-3 py-1.5 text-sm text-text-tertiary hover:text-text-secondary">
                  Cancel
                </button>
                <button onClick={createRole} disabled={!newName.trim()} className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm rounded-md transition-colors">
                  Create
                </button>
              </div>
            </div>
          )}

          {/* RBAC Matrix */}
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
                          <span className="text-xs font-medium text-text-primary">{role.name}</span>
                        </div>
                        <span className="text-[10px] text-text-tertiary">{role.memberCount} member{role.memberCount !== 1 ? "s" : ""}</span>
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
                  <>
                    <tr key={cat}>
                      <td colSpan={roles.length + 1} className="px-4 py-2 bg-content-bg/50">
                        <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{cat}</span>
                      </td>
                    </tr>
                    {permissions
                      .filter((p) => p.category === cat)
                      .map((perm) => (
                        <tr key={perm.key} className="border-b border-border/30 hover:bg-content-bg/30 transition-colors">
                          <td className="px-4 py-2 sticky left-0 bg-surface">
                            <p className="text-xs text-text-primary font-medium">{perm.label}</p>
                            <p className="text-[10px] text-text-tertiary">{perm.description}</p>
                          </td>
                          {roles.map((role) => {
                            const has = role.permissions.has(perm.key);
                            const isOwner = role.id === "owner";
                            return (
                              <td key={role.id} className="px-3 py-2 text-center">
                                <button
                                  onClick={() => !isOwner && togglePermission(role.id, perm.key)}
                                  className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                                    has
                                      ? "bg-accent/10 text-accent"
                                      : "bg-content-bg text-transparent hover:text-text-tertiary"
                                  } ${isOwner ? "cursor-default" : "cursor-pointer"}`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
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
        </div>
      </div>
    </>
  );
}
