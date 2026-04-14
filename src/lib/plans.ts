export const PLANS = {
  free: { name: "Free", maxMembers: 1, maxProjects: 1, maxStorageMB: 100, githubIntegration: false, teams: false, rbac: false, sso: false, audit: false, customRoles: false },
  developer: { name: "Developer", price: 9, maxMembers: 1, maxProjects: null, maxStorageMB: 1024, githubIntegration: true, teams: false, rbac: false, sso: false, audit: false, customRoles: false },
  team: { name: "Team", pricePerUser: 15, maxMembers: null, maxProjects: null, maxStorageMB: 10240, githubIntegration: true, teams: true, rbac: true, sso: false, audit: false, customRoles: false },
  enterprise: { name: "Enterprise", pricePerUser: null, maxMembers: null, maxProjects: null, maxStorageMB: null, githubIntegration: true, teams: true, rbac: true, sso: true, audit: true, customRoles: true },
} as const;

export type PlanId = keyof typeof PLANS;

export const PERMISSIONS = [
  "projects.create", "projects.delete", "projects.settings",
  "members.manage", "members.invite",
  "billing.manage",
  "work_items.create", "work_items.edit", "work_items.delete",
  "sprints.manage",
  "integrations.manage",
  "reports.view",
] as const;

export type Permission = typeof PERMISSIONS[number];

export const DEFAULT_ROLES: Record<string, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: PERMISSIONS.filter(p => !["billing.manage"].includes(p)) as unknown as Permission[],
  member: ["projects.create", "work_items.create", "work_items.edit", "work_items.delete", "sprints.manage"],
  viewer: ["reports.view"],
  guest: [],
};
