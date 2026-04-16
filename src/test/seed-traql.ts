// Deterministic seed script for TraQL integration tests
// Uses a seeded PRNG — no randomness, fully reproducible

import { projects, workItems, sprints, workflowStates, workItemLinks, statusHistory, workItemSnapshots, githubEvents } from "@/db/schema";

// Seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const ASSIGNEES_ALPHA = ["Alice", "Bob", "Carol", "Dave", "Eve"];
const ASSIGNEES_BETA = ["Alice", "Frank", "Grace", "Heidi", "Ivan"];
const STATES_STANDARD = ["new", "ready", "in_progress", "done"];
const TYPES = ["epic", "feature", "story", "bug", "task"] as const;
const FIBONACCI = [1, 2, 3, 5, 8, 13];
const DESCRIPTORS = [
  "Authentication", "Dashboard", "Notifications", "Search", "Analytics",
  "Export", "Import", "Settings", "Onboarding", "Billing",
  "Permissions", "Caching", "Logging", "Metrics", "Alerts",
  "Webhooks", "API Gateway", "Batch Processing", "Data Migration", "Archival",
];

// Base date for test data
const BASE_DATE = new Date("2025-12-01T00:00:00Z");
const FROZEN_NOW = new Date("2026-04-11T12:00:00Z");

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export async function seedTestData(db: any) {
  const now = FROZEN_NOW.toISOString();

  // --- Users ---
  // (Not creating real users — assignee is a plain string)

  // --- Projects (sequence will be updated after seeding) ---
  await db.insert(projects).values([
    { id: 1, name: "Alpha", key: "ALP", description: "Deep hierarchy test project", visibility: "public", ownerId: "test-user", sequence: 0, createdAt: now, updatedAt: now },
    { id: 2, name: "Beta", key: "BET", description: "Wide hierarchy test project", visibility: "public", ownerId: "test-user", sequence: 0, createdAt: now, updatedAt: now },
  ]);

  // --- Workflow states (Standard for both) ---
  const wfStates = [
    { slug: "new", displayName: "New", position: 0, category: "todo" as const, color: "#9CA3AF" },
    { slug: "ready", displayName: "Ready", position: 1, category: "todo" as const, color: "#F59E0B" },
    { slug: "in_progress", displayName: "In Progress", position: 2, category: "in_progress" as const, color: "#6366F1" },
    { slug: "done", displayName: "Done", position: 3, category: "done" as const, color: "#10B981" },
  ];
  for (const pid of [1, 2]) {
    await db.insert(workflowStates).values(wfStates.map(s => ({ ...s, projectId: pid, createdAt: now })));
  }

  // --- Sprints ---
  await db.insert(sprints).values([
    { id: 1, projectId: 1, name: "ALP Sprint 1", goal: "Foundation", startDate: "2026-01-05", endDate: "2026-01-18", state: "closed", createdAt: now },
    { id: 2, projectId: 1, name: "ALP Sprint 2", goal: "Core features", startDate: "2026-01-19", endDate: "2026-02-01", state: "closed", createdAt: now },
    { id: 3, projectId: 1, name: "ALP Sprint 3", goal: "Polish", startDate: "2026-03-30", endDate: "2026-04-12", state: "active", createdAt: now },
    { id: 4, projectId: 1, name: "ALP Sprint 4", goal: "Next", startDate: "2026-04-13", endDate: "2026-04-26", state: "planning", createdAt: now },
    { id: 5, projectId: 2, name: "BET Sprint 1", goal: "Launch", startDate: "2026-03-30", endDate: "2026-04-12", state: "active", createdAt: now },
    { id: 6, projectId: 2, name: "BET Sprint 2", goal: "Iterate", startDate: "2026-04-13", endDate: "2026-04-26", state: "planning", createdAt: now },
  ]);

  // --- Project ALPHA: deep hierarchy (~1000 items) ---
  const rngA = mulberry32(42);
  const alphaItems: any[] = [];
  let alphaId = 1;
  let hourOffset = 0;

  function alphaItem(title: string, type: string, parentId: string | null, depth: number) {
    const id = alphaId++;
    hourOffset += 2;
    const createdAt = addHours(BASE_DATE, hourOffset).toISOString();
    // Updated: some items stale (not updated in 14+ days), most updated recently
    const staleDays = rngA() < 0.15 ? 30 + Math.floor(rngA() * 60) : Math.floor(rngA() * 10);
    const updatedAt = addDays(new Date(createdAt), staleDays).toISOString();

    // State distribution
    let state: string;
    const r = rngA();
    if (depth === 0) state = r < 0.5 ? "new" : "in_progress"; // epics
    else if (r < 0.4) state = "done";
    else if (r < 0.6) state = "in_progress";
    else if (r < 0.8) state = "ready";
    else state = "new";

    // Sprint assignment
    let sprintId: string | null = null;
    const sr = rngA();
    if (sr < 0.25) sprintId = 1;
    else if (sr < 0.5) sprintId = 2;
    else if (sr < 0.7) sprintId = 3;
    else if (sr < 0.8) sprintId = 4;
    // else null (unsprinted)

    // Assignee
    const assignee = rngA() < 0.05 ? null : ASSIGNEES_ALPHA[Math.floor(rngA() * ASSIGNEES_ALPHA.length)];

    // Points (stories and bugs only)
    const points = (type === "story" || type === "bug") ? FIBONACCI[Math.floor(rngA() * FIBONACCI.length)] : null;

    const priority = Math.floor(rngA() * 5);

    alphaItems.push({
      id, projectId: 1, title, type, state, description: "",
      displayId: `ALP-${id}`,
      parentId, sprintId, assignee, points, priority,
      createdAt, updatedAt,
    });
    return id;
  }

  // 5 epics
  for (let e = 0; e < 5; e++) {
    const epicTitle = `ALP-Epic-${e}: ${DESCRIPTORS[e % DESCRIPTORS.length]}`;
    const epicId = alphaItem(epicTitle, "epic", null, 0);

    // 4 features per epic
    for (let f = 0; f < 4; f++) {
      const featureTitle = `ALP-Feature-${e}.${f}: ${DESCRIPTORS[(e * 4 + f) % DESCRIPTORS.length]}`;
      const featureId = alphaItem(featureTitle, "feature", epicId, 1);

      // 8 stories per feature (10% are bugs instead)
      for (let s = 0; s < 8; s++) {
        const isBug = rngA() < 0.1;
        const storyType = isBug ? "bug" : "story";
        const storyTitle = `ALP-${isBug ? "Bug" : "Story"}-${e}.${f}.${s}: ${DESCRIPTORS[(e * 32 + f * 8 + s) % DESCRIPTORS.length]}`;
        const storyId = alphaItem(storyTitle, storyType, featureId, 2);

        // 3 tasks per story
        for (let t = 0; t < 3; t++) {
          const taskTitle = `ALP-Task-${e}.${f}.${s}.${t}: ${DESCRIPTORS[(e * 96 + f * 24 + s * 3 + t) % DESCRIPTORS.length]}`;
          const taskId = alphaItem(taskTitle, "task", storyId, 3);

          // 50% of L3 tasks have 1 child
          if (rngA() < 0.5) {
            const subTitle = `ALP-SubTask-${e}.${f}.${s}.${t}: ${DESCRIPTORS[Math.floor(rngA() * DESCRIPTORS.length)]}`;
            const subId = alphaItem(subTitle, "task", taskId, 4);

            // 30% of L4 have 1 child (depth 5)
            if (rngA() < 0.3) {
              const deepTitle = `ALP-DeepTask-${e}.${f}.${s}.${t}: ${DESCRIPTORS[Math.floor(rngA() * DESCRIPTORS.length)]}`;
              alphaItem(deepTitle, "task", subId, 5);
            }
          }
        }
      }
    }
  }

  // Ensure specific data guarantees:
  // - Title containing "sprint planning" for contains query
  const spRetroId = alphaId++;
  alphaItems.push({
    id: spRetroId, projectId: 1, title: "Sprint Planning Retrospective", type: "story",
    displayId: `ALP-${spRetroId}`,
    state: "done", description: "", parentId: alphaItems[1].id, sprintId: 1,
    assignee: "Alice", points: 5, priority: 3,
    createdAt: "2026-02-15T10:00:00Z", updatedAt: "2026-02-20T10:00:00Z",
  });

  // - Item created during active sprint (2026-03-30 to 2026-04-12)
  const activeId = alphaId++;
  alphaItems.push({
    id: activeId, projectId: 1, title: "Active Sprint Item", type: "story",
    displayId: `ALP-${activeId}`,
    state: "in_progress", description: "", parentId: alphaItems[1].id, sprintId: 3,
    assignee: "Bob", points: 3, priority: 2,
    createdAt: "2026-04-02T10:00:00Z", updatedAt: "2026-04-10T10:00:00Z",
  });

  // Insert in batches
  for (let i = 0; i < alphaItems.length; i += 100) {
    await db.insert(workItems).values(alphaItems.slice(i, i + 100));
  }

  // --- Project BETA: wide/shallow (~500 items, smaller for speed) ---
  const rngB = mulberry32(137);
  const betaItems: any[] = [];
  let betaId = 2000; // offset to avoid ID collisions
  let betaSeq = 0;

  function betaItem(title: string, type: string, parentId: string | null) {
    const id = betaId++;
    betaSeq++;
    const createdAt = addHours(BASE_DATE, (id - 2000) * 3).toISOString();
    const staleDays = rngB() < 0.15 ? 30 : Math.floor(rngB() * 10);
    const updatedAt = addDays(new Date(createdAt), staleDays).toISOString();

    const r = rngB();
    const state = r < 0.35 ? "done" : r < 0.55 ? "in_progress" : r < 0.75 ? "ready" : "new";
    const sprintId = rngB() < 0.4 ? 5 : rngB() < 0.6 ? 6 : null;
    const assignee = rngB() < 0.05 ? null : ASSIGNEES_BETA[Math.floor(rngB() * ASSIGNEES_BETA.length)];
    const points = (type === "story" || type === "bug") ? FIBONACCI[Math.floor(rngB() * FIBONACCI.length)] : null;
    const priority = Math.floor(rngB() * 5);

    betaItems.push({
      id, projectId: 2, title, type, state, description: "",
      displayId: `BET-${betaSeq}`,
      parentId, sprintId, assignee, points, priority,
      createdAt, updatedAt,
    });
    return id;
  }

  // 3 epics × 10 features × 15 stories = 498
  for (let e = 0; e < 3; e++) {
    const epicId = betaItem(`BET-Epic-${e}: ${DESCRIPTORS[e]}`, "epic", null);
    for (let f = 0; f < 10; f++) {
      const featureId = betaItem(`BET-Feature-${e}.${f}: ${DESCRIPTORS[(e * 10 + f) % DESCRIPTORS.length]}`, "feature", epicId);
      for (let s = 0; s < 15; s++) {
        const isBug = rngB() < 0.1;
        betaItem(`BET-${isBug ? "Bug" : "Story"}-${e}.${f}.${s}: ${DESCRIPTORS[(e * 150 + f * 15 + s) % DESCRIPTORS.length]}`, isBug ? "bug" : "story", featureId);
      }
    }
  }

  for (let i = 0; i < betaItems.length; i += 100) {
    await db.insert(workItems).values(betaItems.slice(i, i + 100));
  }

  // --- Cross-project links ---
  const linkValues = [];
  for (let i = 0; i < 5; i++) {
    linkValues.push({ sourceId: alphaItems[i * 10 + 5]?.id ?? 5, targetId: betaItems[i * 10]?.id ?? 2000, type: "relates_to" as const, createdAt: now });
  }

  // Add "blocks" links within Alpha project for link traversal tests
  // Item 3 blocks item 4, item 5 blocks item 6
  linkValues.push({ sourceId: 3, targetId: 4, type: "blocks" as const, createdAt: now });
  linkValues.push({ sourceId: 5, targetId: 6, type: "blocks" as const, createdAt: now });
  // Item 7 blocks item 8 (item 7 is in_progress based on seed)
  linkValues.push({ sourceId: 7, targetId: 8, type: "blocks" as const, createdAt: now });

  if (linkValues.length > 0) {
    await db.insert(workItemLinks).values(linkValues);
  }

  // --- Status history for history query tests ---
  // Item 3: new -> ready -> in_progress -> done
  await db.insert(statusHistory).values([
    { workItemId: 3, fromState: "new", toState: "ready", changedAt: "2026-01-06T10:00:00Z" },
    { workItemId: 3, fromState: "ready", toState: "in_progress", changedAt: "2026-01-10T10:00:00Z" },
    { workItemId: 3, fromState: "in_progress", toState: "done", changedAt: "2026-01-15T10:00:00Z" },
  ]);

  // Item 5: new -> in_progress (during active sprint: 2026-03-30 to 2026-04-12)
  await db.insert(statusHistory).values([
    { workItemId: 5, fromState: "new", toState: "in_progress", changedAt: "2026-04-02T10:00:00Z" },
  ]);

  // Item 10: new -> ready -> in_progress (assignee changes for CHANGED tests)
  await db.insert(statusHistory).values([
    { workItemId: 10, fromState: "new", toState: "ready", changedAt: "2026-01-08T10:00:00Z" },
    { workItemId: 10, fromState: "ready", toState: "in_progress", changedAt: "2026-01-12T10:00:00Z" },
  ]);

  // --- Work item snapshots for assignee CHANGED / WAS tests ---
  // Item 10: assignee changed from Alice to Bob
  await db.insert(workItemSnapshots).values([
    {
      workItemId: 10, version: 1,
      snapshot: JSON.stringify({ id: 10, assignee: "Alice", state: "new" }),
      changedBy: "test-user", channel: "api",
      createdAt: "2026-01-06T10:00:00Z",
    },
    {
      workItemId: 10, version: 2,
      snapshot: JSON.stringify({ id: 10, assignee: "Bob", state: "ready" }),
      changedBy: "test-user", channel: "api",
      createdAt: "2026-01-08T10:00:00Z",
    },
    {
      workItemId: 10, version: 3,
      snapshot: JSON.stringify({ id: 10, assignee: "Bob", state: "in_progress" }),
      changedBy: "test-user", channel: "api",
      createdAt: "2026-01-12T10:00:00Z",
    },
  ]);

  // Item 3: snapshots for sprint history (was in closed sprint 1)
  await db.insert(workItemSnapshots).values([
    {
      workItemId: 3, version: 1,
      snapshot: JSON.stringify({ id: 3, assignee: "Alice", state: "new", sprintId: 1 }),
      changedBy: "test-user", channel: "api",
      createdAt: "2026-01-06T10:00:00Z",
    },
    {
      workItemId: 3, version: 2,
      snapshot: JSON.stringify({ id: 3, assignee: "Alice", state: "done", sprintId: 1 }),
      changedBy: "test-user", channel: "api",
      createdAt: "2026-01-15T10:00:00Z",
    },
  ]);

  // --- GitHub events for pr:, ci:, has: filter tests ---
  // Item 3: has an open PR
  await db.insert(githubEvents).values([
    {
      projectId: 1, workItemId: 3, eventType: "pull_request", action: "opened",
      prNumber: 42, prTitle: "Fix authentication", prState: "open", branch: "fix/auth",
      createdAt: "2026-04-01T10:00:00Z",
    },
  ]);
  // Item 5: has a merged PR (two events — opened then merged, latest is merged)
  await db.insert(githubEvents).values([
    {
      projectId: 1, workItemId: 5, eventType: "pull_request", action: "opened",
      prNumber: 43, prTitle: "Add search feature", prState: "open", branch: "feat/search",
      createdAt: "2026-04-01T10:00:00Z",
    },
    {
      projectId: 1, workItemId: 5, eventType: "pull_request", action: "closed",
      prNumber: 43, prTitle: "Add search feature", prState: "merged", branch: "feat/search",
      createdAt: "2026-04-03T10:00:00Z",
    },
  ]);
  // Item 7: has a closed (not merged) PR
  await db.insert(githubEvents).values([
    {
      projectId: 1, workItemId: 7, eventType: "pull_request", action: "closed",
      prNumber: 44, prTitle: "Old approach", prState: "closed", branch: "feat/old",
      createdAt: "2026-04-02T10:00:00Z",
    },
  ]);
  // Item 10: has passing CI
  await db.insert(githubEvents).values([
    {
      projectId: 1, workItemId: 10, eventType: "check_suite", action: "completed",
      ciStatus: "success", branch: "feat/metrics", sha: "abc123",
      createdAt: "2026-04-05T10:00:00Z",
    },
  ]);
  // Item 4: has failing CI (two events — first success, then failure)
  await db.insert(githubEvents).values([
    {
      projectId: 1, workItemId: 4, eventType: "check_suite", action: "completed",
      ciStatus: "success", branch: "feat/dashboard", sha: "def456",
      createdAt: "2026-04-04T10:00:00Z",
    },
    {
      projectId: 1, workItemId: 4, eventType: "check_suite", action: "completed",
      ciStatus: "failure", branch: "feat/dashboard", sha: "ghi789",
      createdAt: "2026-04-06T10:00:00Z",
    },
  ]);
  // Item 6: has pending CI
  await db.insert(githubEvents).values([
    {
      projectId: 1, workItemId: 6, eventType: "check_suite", action: "requested",
      ciStatus: "pending", branch: "feat/export", sha: "jkl012",
      createdAt: "2026-04-07T10:00:00Z",
    },
  ]);
  // Item 8: has a branch push but no PR
  await db.insert(githubEvents).values([
    {
      projectId: 1, workItemId: 8, eventType: "push", action: "push",
      branch: "feat/notifications", sha: "mno345",
      createdAt: "2026-04-03T10:00:00Z",
    },
  ]);

  // Update project sequences
  const { eq } = await import("drizzle-orm");
  await db.update(projects).set({ sequence: alphaItems.length }).where(eq(projects.id, 1));
  await db.update(projects).set({ sequence: betaSeq }).where(eq(projects.id, 2));
}

// Export counts for test assertions
export const EXPECTED = {
  ALPHA_PROJECT_ID: 1,
  BETA_PROJECT_ID: 2,
  ACTIVE_SPRINT_ALP: 3,
  ACTIVE_SPRINT_BET: 5,
  CLOSED_SPRINT_ALP_1: 1,
  CLOSED_SPRINT_ALP_2: 2,
  PLANNING_SPRINT_ALP: 4,
  FROZEN_DATE: "2026-04-11T12:00:00Z",
  // Items with specific history for tests
  ITEM_WITH_FULL_HISTORY: 3,  // new->ready->in_progress->done
  ITEM_WITH_ACTIVE_CHANGE: 5, // state changed during active sprint
  ITEM_WITH_ASSIGNEE_CHANGE: 10, // assignee: Alice -> Bob
  // Items with blocks links
  BLOCKER_ITEM: 3,  // blocks item 4
  BLOCKED_ITEM: 4,  // blocked by item 3
  // Items with GitHub events
  ITEM_WITH_OPEN_PR: 3,
  ITEM_WITH_MERGED_PR: 5,
  ITEM_WITH_CLOSED_PR: 7,
  ITEM_WITH_PASSING_CI: 10,
  ITEM_WITH_FAILING_CI: 4,
  ITEM_WITH_PENDING_CI: 6,
  ITEM_WITH_BRANCH_ONLY: 8,  // has branch but no PR
};
