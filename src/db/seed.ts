import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { projects, workItems, sprints, comments } from "./schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Track per-project sequence counters for displayId generation
const sequenceCounters = new Map<string, { key: string; seq: number }>();

function nextDisplayId(projectId: string): string {
  const entry = sequenceCounters.get(projectId);
  if (!entry) throw new Error(`Unknown project ${projectId}`);
  entry.seq += 1;
  return `${entry.key}-${entry.seq}`;
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(comments);
  await db.delete(workItems);
  await db.delete(sprints);
  await db.delete(projects);

  // --- Projects ---
  const [pictura] = await db
    .insert(projects)
    .values({
      name: "Pictura",
      key: "PIC",
      description:
        "Photo sharing platform — Instagram-inspired social app for sharing moments.",
    })
    .returning();

  const [stori] = await db
    .insert(projects)
    .values({
      name: "Stori",
      key: "TRK",
      description:
        "Project management tool — agile work item tracking with boards, backlogs, and sprints.",
    })
    .returning();

  // Initialize sequence counters
  sequenceCounters.set(pictura.id, { key: "PIC", seq: 0 });
  sequenceCounters.set(stori.id, { key: "TRK", seq: 0 });

  // --- Sprints ---
  const [picSprint1] = await db
    .insert(sprints)
    .values({
      projectId: pictura.id,
      name: "PIC Sprint 1 — Core Feed",
      goal: "Users can browse a photo feed, like posts, and view profiles.",
      startDate: "2026-03-30",
      endDate: "2026-04-13",
      state: "closed",
    })
    .returning();

  const [picSprint2] = await db
    .insert(sprints)
    .values({
      projectId: pictura.id,
      name: "PIC Sprint 2 — Upload & Explore",
      goal: "Users can upload photos and discover content through the explore page.",
      startDate: "2026-04-14",
      endDate: "2026-04-27",
      state: "active",
    })
    .returning();

  const [picSprint3] = await db
    .insert(sprints)
    .values({
      projectId: pictura.id,
      name: "PIC Sprint 3 — Direct Messaging",
      goal: "Users can send direct messages to each other.",
      startDate: "2026-04-28",
      endDate: "2026-05-11",
      state: "planning",
    })
    .returning();

  const [trkSprint1] = await db
    .insert(sprints)
    .values({
      projectId: stori.id,
      name: "TRK Sprint 1 — Foundation",
      goal: "Core work item CRUD, board view, and backlog table.",
      startDate: "2026-03-30",
      endDate: "2026-04-13",
      state: "closed",
    })
    .returning();

  const [trkSprint2] = await db
    .insert(sprints)
    .values({
      projectId: stori.id,
      name: "TRK Sprint 2 — Sprint Planning",
      goal: "Sprint management and planning view.",
      startDate: "2026-04-14",
      endDate: "2026-04-27",
      state: "active",
    })
    .returning();

  // === PICTURA WORK ITEMS ===

  // Epic: Core Features
  const [picEpic1] = await db
    .insert(workItems)
    .values({
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "Pictura Core Features",
      type: "epic",
      state: "active",
      description:
        "Core photo sharing features that form the foundation of the Pictura platform.",
      priority: 1,
    })
    .returning();

  // Feature: Photo Feed
  const [picFeatFeed] = await db
    .insert(workItems)
    .values({
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "Photo Feed Experience",
      type: "feature",
      state: "active",
      parentId: picEpic1.id,
      description:
        "A scrollable feed of photo posts from followed users, with interactions.",
      priority: 1,
    })
    .returning();

  // Stories under Photo Feed
  await db.insert(workItems).values([
    {
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "View Photo Feed",
      type: "story",
      state: "done",
      parentId: picFeatFeed.id,
      sprintId: picSprint1.id,
      assignee: "Alex Rivera",
      description:
        "As a user, I want to see a scrollable feed of photos from accounts I follow so I can stay up to date with their posts.\n\n### Acceptance Criteria\n* GIVEN I am on the home page WHEN the feed loads THEN I see posts in reverse chronological order\n* GIVEN a post has an image WHEN it renders THEN the image fills the full width of the feed\n* GIVEN I scroll down WHEN more posts exist THEN additional posts load automatically",
      priority: 1,
    },
    {
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "Like a Photo",
      type: "story",
      state: "done",
      parentId: picFeatFeed.id,
      sprintId: picSprint1.id,
      assignee: "Alex Rivera",
      description:
        "As a user, I want to like a photo by tapping the heart icon so I can show appreciation for content I enjoy.\n\n### Acceptance Criteria\n* GIVEN I see a post WHEN I tap the heart icon THEN the heart fills red and the like count increments\n* GIVEN I already liked a post WHEN I tap the heart again THEN the like is removed and the count decrements\n* GIVEN I double-tap the photo WHEN it registers THEN the photo is liked with a heart animation overlay",
      priority: 2,
    },
    {
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "Comment on a Photo",
      type: "story",
      state: "done",
      parentId: picFeatFeed.id,
      sprintId: picSprint1.id,
      assignee: "Jordan Chen",
      description:
        "As a user, I want to comment on photos so I can engage in conversations about shared content.\n\n### Acceptance Criteria\n* GIVEN I tap the comment icon WHEN the comment input appears THEN I can type and submit a comment\n* GIVEN a post has comments WHEN I view it THEN I see the two most recent comments\n* GIVEN a post has more than 2 comments WHEN I tap 'View all' THEN I see the full comment thread",
      priority: 3,
    },
  ]);

  // Feature: User Profiles
  const [picFeatProfiles] = await db
    .insert(workItems)
    .values({
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "User Profiles",
      type: "feature",
      state: "active",
      parentId: picEpic1.id,
      description: "User profile pages with photo grids, stats, and bio.",
      priority: 2,
    })
    .returning();

  await db.insert(workItems).values([
    {
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "View User Profile",
      type: "story",
      state: "done",
      parentId: picFeatProfiles.id,
      sprintId: picSprint1.id,
      assignee: "Jordan Chen",
      description:
        "As a user, I want to view another user's profile to see their photos and bio.\n\n### Acceptance Criteria\n* GIVEN I tap a username WHEN the profile loads THEN I see their avatar, bio, and stats (posts, followers, following)\n* GIVEN I am on a profile WHEN I look at the grid THEN I see a 3-column grid of their photos",
      priority: 1,
    },
  ]);

  // Feature: Photo Upload
  const [picFeatUpload] = await db
    .insert(workItems)
    .values({
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "Photo Upload",
      type: "feature",
      state: "in_progress",
      parentId: picEpic1.id,
      description: "Allow users to upload photos with captions.",
      priority: 3,
    })
    .returning();

  await db.insert(workItems).values([
    {
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "Upload a Photo",
      type: "story",
      state: "in_progress",
      parentId: picFeatUpload.id,
      sprintId: picSprint2.id,
      assignee: "Alex Rivera",
      description:
        "As a user, I want to upload a photo with a caption so I can share moments with my followers.\n\n### Acceptance Criteria\n* GIVEN I tap the upload icon WHEN the upload page opens THEN I can select or drag an image\n* GIVEN I selected an image WHEN I add a caption and tap Share THEN the photo appears at the top of my feed\n* GIVEN an upload is in progress WHEN it completes THEN I am redirected to the home feed",
      priority: 1,
    },
  ]);

  // Feature: Explore
  const [picFeatExplore] = await db
    .insert(workItems)
    .values({
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "Explore and Discovery",
      type: "feature",
      state: "in_progress",
      parentId: picEpic1.id,
      description: "Browse trending and recommended photos from the community.",
      priority: 4,
    })
    .returning();

  await db.insert(workItems).values([
    {
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "Browse Explore Grid",
      type: "story",
      state: "ready",
      parentId: picFeatExplore.id,
      sprintId: picSprint2.id,
      assignee: "Jordan Chen",
      description:
        "As a user, I want to browse an explore page to discover new content and accounts.\n\n### Acceptance Criteria\n* GIVEN I tap the search icon WHEN the explore page loads THEN I see a grid of trending photos\n* GIVEN I tap a photo in the grid WHEN the detail opens THEN I see the post with likes and comments",
      priority: 1,
    },
  ]);

  // Epic: Direct Messaging (future — for the demo)
  const [picEpic2] = await db
    .insert(workItems)
    .values({
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "Direct Messaging",
      type: "epic",
      state: "new",
      description:
        "Enable users to send private messages to each other, supporting text, photo sharing, and reactions.",
      priority: 2,
    })
    .returning();

  const [picFeatDM] = await db
    .insert(workItems)
    .values({
      projectId: pictura.id,
      displayId: nextDisplayId(pictura.id),
      title: "Basic Direct Messages",
      type: "feature",
      state: "new",
      parentId: picEpic2.id,
      description:
        "One-on-one text messaging between users. Foundation for the messaging experience.",
      priority: 1,
    })
    .returning();

  // === STORI WORK ITEMS ===

  // Epic: Stori Core
  const [trkEpic1] = await db
    .insert(workItems)
    .values({
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "Stori Core",
      type: "epic",
      state: "active",
      description:
        "Core project management capabilities: work items, board, backlog, and sprint planning.",
      priority: 1,
    })
    .returning();

  // Feature: Work Item Management
  const [trkFeatWI] = await db
    .insert(workItems)
    .values({
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "Work Item Management",
      type: "feature",
      state: "active",
      parentId: trkEpic1.id,
      description:
        "CRUD operations on work items with type hierarchy (epic > feature > story), state management, and assignment.",
      priority: 1,
    })
    .returning();

  await db.insert(workItems).values([
    {
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "Create Work Item",
      type: "story",
      state: "done",
      parentId: trkFeatWI.id,
      sprintId: trkSprint1.id,
      assignee: "Sam Taylor",
      description:
        "As a product manager, I want to create epics, features, and stories so I can build out the product backlog.\n\n### Acceptance Criteria\n* GIVEN I am on any page WHEN I click the + button THEN a dialog opens for creating a work item\n* GIVEN I am creating a work item WHEN I select a type and enter a title THEN the item is saved and appears in the backlog\n* GIVEN I am creating a story WHEN I select a parent feature THEN the story is nested under that feature in the hierarchy",
      priority: 1,
    },
    {
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "View Sprint Board",
      type: "story",
      state: "done",
      parentId: trkFeatWI.id,
      sprintId: trkSprint1.id,
      assignee: "Sam Taylor",
      description:
        "As a team member, I want to see a kanban board of the current sprint so I can track progress at a glance.\n\n### Acceptance Criteria\n* GIVEN I navigate to the board WHEN it loads THEN I see columns for New, Active, Ready, In Progress, and Done\n* GIVEN items are in the sprint WHEN I view the board THEN each item appears as a card in its state column\n* GIVEN a card is on the board WHEN I click the state dropdown THEN I can move it to a different state",
      priority: 2,
    },
    {
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "View Backlog Table",
      type: "story",
      state: "done",
      parentId: trkFeatWI.id,
      sprintId: trkSprint1.id,
      assignee: "Morgan Lee",
      description:
        "As a product manager, I want to see all work items in a table so I can manage the backlog.\n\n### Acceptance Criteria\n* GIVEN I navigate to the backlog WHEN it loads THEN I see a table with columns: ID, Type, Title, State, Sprint, Assignee\n* GIVEN items exist WHEN I click a row THEN I navigate to the work item detail page",
      priority: 3,
    },
    {
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "View Work Item Detail",
      type: "story",
      state: "in_progress",
      parentId: trkFeatWI.id,
      sprintId: trkSprint2.id,
      assignee: "Sam Taylor",
      description:
        "As a team member, I want to view and edit a work item's details so I can update its description, state, and assignment.\n\n### Acceptance Criteria\n* GIVEN I click a work item WHEN the detail page loads THEN I see the title, description, metadata, and children\n* GIVEN I am on the detail page WHEN I edit the description THEN the change is saved\n* GIVEN the item has children WHEN I view the detail THEN I see a list of child items",
      priority: 4,
    },
  ]);

  // Feature: Sprint Planning
  const [trkFeatSprint] = await db
    .insert(workItems)
    .values({
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "Sprint Planning",
      type: "feature",
      state: "in_progress",
      parentId: trkEpic1.id,
      description:
        "Sprint creation, planning view, and item assignment to sprints.",
      priority: 2,
    })
    .returning();

  await db.insert(workItems).values([
    {
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "Plan Sprint",
      type: "story",
      state: "in_progress",
      parentId: trkFeatSprint.id,
      sprintId: trkSprint2.id,
      assignee: "Morgan Lee",
      description:
        "As a scrum master, I want to plan a sprint by moving backlog items into it so the team knows what to work on.\n\n### Acceptance Criteria\n* GIVEN I am on the sprint planning page WHEN it loads THEN I see two panels: backlog items (left) and sprint items (right)\n* GIVEN an item is in the backlog panel WHEN I assign it to the sprint THEN it moves to the sprint panel\n* GIVEN the sprint has items WHEN I view the sprint header THEN I see the sprint name, dates, and goal",
      priority: 1,
    },
    {
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "Create and Manage Sprints",
      type: "story",
      state: "ready",
      parentId: trkFeatSprint.id,
      sprintId: trkSprint2.id,
      assignee: "Sam Taylor",
      description:
        "As a scrum master, I want to create, start, and close sprints so the team works in defined iterations.\n\n### Acceptance Criteria\n* GIVEN I am on the sprints page WHEN I click 'New Sprint' THEN a dialog opens for sprint creation with name, dates, and goal\n* GIVEN a sprint is in planning WHEN I click 'Start Sprint' THEN it becomes the active sprint\n* GIVEN a sprint is active WHEN I click 'Close Sprint' THEN it moves to closed and items not done return to backlog",
      priority: 2,
    },
  ]);

  // Feature: Comments
  const [trkFeatComments] = await db
    .insert(workItems)
    .values({
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "Work Item Comments",
      type: "feature",
      state: "new",
      parentId: trkEpic1.id,
      description: "Threaded comments on work items for team discussion.",
      priority: 3,
    })
    .returning();

  await db.insert(workItems).values([
    {
      projectId: stori.id,
      displayId: nextDisplayId(stori.id),
      title: "Add and View Comments",
      type: "story",
      state: "new",
      parentId: trkFeatComments.id,
      assignee: "Morgan Lee",
      description:
        "As a team member, I want to leave comments on work items so I can discuss implementation details with my team.\n\n### Acceptance Criteria\n* GIVEN I am on a work item detail page WHEN I scroll to the comments section THEN I see existing comments with author and timestamp\n* GIVEN I type a comment WHEN I click Post THEN the comment appears at the bottom of the thread",
      priority: 1,
    },
  ]);

  // --- Comments on work items ---
  // Get a few work item IDs to attach comments to
  const allItems = await db.select().from(workItems);
  const viewFeed = allItems.find((i) => i.title === "View Photo Feed");
  const createWI = allItems.find((i) => i.title === "Create Work Item");
  const planSprint = allItems.find((i) => i.title === "Plan Sprint");

  if (viewFeed) {
    await db.insert(comments).values([
      {
        workItemId: viewFeed.id,
        author: "Alex Rivera",
        body: "Feed infinite scroll is working. Using intersection observer for loading triggers.",
        createdAt: "2026-04-02T10:30:00Z",
      },
      {
        workItemId: viewFeed.id,
        author: "Jordan Chen",
        body: "Looks great! Should we add a skeleton loader while images are fetching?",
        createdAt: "2026-04-02T11:15:00Z",
      },
      {
        workItemId: viewFeed.id,
        author: "Alex Rivera",
        body: "Good call — I'll add shimmer placeholders for the image and text areas.",
        createdAt: "2026-04-02T11:45:00Z",
      },
    ]);
  }

  if (createWI) {
    await db.insert(comments).values([
      {
        workItemId: createWI.id,
        author: "Sam Taylor",
        body: "Dialog is done. Supports all three types with parent selection for features and stories.",
        createdAt: "2026-04-05T14:00:00Z",
      },
      {
        workItemId: createWI.id,
        author: "Morgan Lee",
        body: "Can we add keyboard shortcuts? Ctrl+N for new item would be nice.",
        createdAt: "2026-04-05T16:30:00Z",
      },
    ]);
  }

  if (planSprint) {
    await db.insert(comments).values([
      {
        workItemId: planSprint.id,
        author: "Morgan Lee",
        body: "Working on the two-panel layout. Using a simple click-to-assign approach instead of drag-and-drop for now.",
        createdAt: "2026-04-16T09:00:00Z",
      },
    ]);
  }

  // Update project sequence counters
  for (const [projectId, entry] of sequenceCounters) {
    await db.update(projects).set({ sequence: entry.seq }).where(eq(projects.id, projectId));
  }

  console.log("Seed complete!");
  console.log(
    `  Projects: ${pictura.id} (${pictura.key}), ${stori.id} (${stori.key})`
  );
  const itemCount = await db.select().from(workItems);
  const sprintCount = await db.select().from(sprints);
  const commentCount = await db.select().from(comments);
  console.log(`  Work items: ${itemCount.length}`);
  console.log(`  Sprints: ${sprintCount.length}`);
  console.log(`  Comments: ${commentCount.length}`);
}

seed().catch(console.error);
