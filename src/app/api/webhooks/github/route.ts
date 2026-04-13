import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, workItems, githubEvents, githubAutomations, workflowStates, statusHistory } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";
import { emit } from "@/lib/events";

/** Extract display-ID mentions like TRK-123 or PLS-5 from text. */
function extractDisplayIds(text: string): string[] {
  const matches = text.match(/\b([A-Z]{2,5})-(\d+)\b/g);
  return matches ? [...new Set(matches)] : [];
}

/** Collect all text fields from a webhook payload that might mention work items. */
function collectMentionTexts(eventType: string, payload: Record<string, unknown>): string[] {
  const texts: string[] = [];

  if (eventType === "pull_request") {
    const pr = payload.pull_request as Record<string, unknown> | undefined;
    if (pr) {
      if (typeof pr.title === "string") texts.push(pr.title);
      if (typeof pr.head === "object" && pr.head) {
        const ref = (pr.head as Record<string, unknown>).ref;
        if (typeof ref === "string") texts.push(ref);
      }
    }
  }

  if (eventType === "push") {
    const commits = payload.commits as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(commits)) {
      for (const c of commits) {
        if (typeof c.message === "string") texts.push(c.message);
      }
    }
    // Also check the branch name
    const ref = payload.ref;
    if (typeof ref === "string") texts.push(ref);
  }

  if (eventType === "check_suite") {
    const cs = payload.check_suite as Record<string, unknown> | undefined;
    if (cs) {
      const headBranch = cs.head_branch;
      if (typeof headBranch === "string") texts.push(headBranch);
      // Check PRs associated with the check suite
      const prs = cs.pull_requests as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(prs)) {
        for (const pr of prs) {
          if (typeof pr.title === "string") texts.push(pr.title);
          const head = pr.head as Record<string, unknown> | undefined;
          if (head && typeof head.ref === "string") texts.push(head.ref);
        }
      }
    }
  }

  if (eventType === "deployment_status") {
    const dep = payload.deployment as Record<string, unknown> | undefined;
    if (dep) {
      if (typeof dep.ref === "string") texts.push(dep.ref);
      if (typeof dep.description === "string") texts.push(dep.description);
    }
  }

  return texts;
}

/** Map a GitHub webhook event type + action to our automation rule event name. */
function mapToRuleEvent(eventType: string, action: string | undefined, payload: Record<string, unknown>): string | null {
  if (eventType === "pull_request") {
    if (action === "opened") return "pr_opened";
    if (action === "closed") {
      const pr = payload.pull_request as Record<string, unknown> | undefined;
      if (pr?.merged === true) return "pr_merged";
      return "pr_closed";
    }
  }
  if (eventType === "deployment_status") {
    const ds = payload.deployment_status as Record<string, unknown> | undefined;
    if (ds) {
      const state = typeof ds.state === "string" ? ds.state : undefined;
      if (state === "success") return "deploy_succeeded";
      if (state === "failure" || state === "error") return "deploy_failed";
    }
  }
  return null;
}

/** Verify the GitHub webhook HMAC-SHA256 signature. */
function verifySignature(secret: string, body: string, signature: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Extract common fields from the payload based on event type. */
function extractEventFields(eventType: string, action: string | undefined, payload: Record<string, unknown>) {
  const fields: {
    action?: string;
    prNumber?: number;
    prTitle?: string;
    prState?: string;
    branch?: string;
    sha?: string;
    ciStatus?: string;
  } = { action };

  if (eventType === "pull_request") {
    const pr = payload.pull_request as Record<string, unknown> | undefined;
    if (pr) {
      fields.prNumber = typeof pr.number === "number" ? pr.number : undefined;
      fields.prTitle = typeof pr.title === "string" ? pr.title : undefined;
      fields.prState = typeof pr.state === "string" ? pr.state : undefined;
      if (pr.merged === true) fields.prState = "merged";
      const head = pr.head as Record<string, unknown> | undefined;
      if (head) {
        fields.branch = typeof head.ref === "string" ? head.ref : undefined;
        fields.sha = typeof head.sha === "string" ? head.sha : undefined;
      }
    }
  }

  if (eventType === "push") {
    const ref = payload.ref;
    if (typeof ref === "string") fields.branch = ref.replace("refs/heads/", "");
    const after = payload.after;
    if (typeof after === "string") fields.sha = after;
  }

  if (eventType === "check_suite") {
    const cs = payload.check_suite as Record<string, unknown> | undefined;
    if (cs) {
      fields.branch = typeof cs.head_branch === "string" ? cs.head_branch : undefined;
      fields.sha = typeof cs.head_sha === "string" ? cs.head_sha : undefined;
      fields.ciStatus = typeof cs.conclusion === "string" ? cs.conclusion : undefined;
    }
  }

  if (eventType === "deployment_status") {
    const ds = payload.deployment_status as Record<string, unknown> | undefined;
    const dep = payload.deployment as Record<string, unknown> | undefined;
    if (ds) {
      fields.ciStatus = typeof ds.state === "string" ? ds.state : undefined;
    }
    if (dep) {
      fields.branch = typeof dep.ref === "string" ? dep.ref : undefined;
      fields.sha = typeof dep.sha === "string" ? dep.sha : undefined;
    }
  }

  return fields;
}

export async function POST(request: NextRequest) {
  // Read the raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const eventType = request.headers.get("x-github-event") ?? "";

  if (!eventType) {
    return NextResponse.json({ error: "Missing X-GitHub-Event header" }, { status: 400 });
  }

  // Ping events just need an OK
  if (eventType === "ping") {
    return NextResponse.json({ ok: true });
  }

  // Only handle known event types
  const supportedEvents = ["pull_request", "push", "check_suite", "deployment_status"];
  if (!supportedEvents.includes(eventType)) {
    return NextResponse.json({ ignored: true, reason: `Unsupported event: ${eventType}` });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Determine which repo this is for
  const repo = payload.repository as Record<string, unknown> | undefined;
  if (!repo) {
    return NextResponse.json({ error: "No repository in payload" }, { status: 400 });
  }
  const owner = (repo.owner as Record<string, unknown>)?.login as string | undefined;
  const repoName = repo.name as string | undefined;

  if (!owner || !repoName) {
    return NextResponse.json({ error: "Cannot determine repo owner/name" }, { status: 400 });
  }

  // Find all projects linked to this repo
  const linkedProjects = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.githubOwner, owner),
        eq(projects.githubRepo, repoName)
      )
    );

  if (linkedProjects.length === 0) {
    return NextResponse.json({ ignored: true, reason: "No linked project" });
  }

  const action = typeof payload.action === "string" ? payload.action : undefined;
  const results: Array<{ projectId: number; eventsCreated: number }> = [];

  for (const project of linkedProjects) {
    // Verify HMAC signature using this project's webhook secret
    if (!project.githubWebhookSecret) continue;
    if (!verifySignature(project.githubWebhookSecret, rawBody, signature)) {
      continue; // Signature mismatch — skip this project
    }

    // Extract mentions from all relevant text fields
    const texts = collectMentionTexts(eventType, payload);
    const allMentionedIds = texts.flatMap(extractDisplayIds);
    const uniqueIds = [...new Set(allMentionedIds)];

    // Look up work items by displayId within this project
    let matchedItems: Array<{ id: number; displayId: string | null }> = [];
    if (uniqueIds.length > 0) {
      matchedItems = await db
        .select({ id: workItems.id, displayId: workItems.displayId })
        .from(workItems)
        .where(
          and(
            eq(workItems.projectId, project.id),
            inArray(workItems.displayId, uniqueIds)
          )
        );
    }

    const fields = extractEventFields(eventType, action, payload);

    // If we matched work items, create one event per work item
    // If no matches, still create one event with null workItemId
    const targets = matchedItems.length > 0
      ? matchedItems.map((item) => item.id)
      : [null];

    let eventsCreated = 0;
    for (const workItemId of targets) {
      await db.insert(githubEvents).values({
        projectId: project.id,
        workItemId,
        eventType,
        action: fields.action ?? null,
        prNumber: fields.prNumber ?? null,
        prTitle: fields.prTitle ?? null,
        prState: fields.prState ?? null,
        branch: fields.branch ?? null,
        sha: fields.sha ?? null,
        ciStatus: fields.ciStatus ?? null,
        payload: rawBody,
      });
      eventsCreated++;

      // Emit SSE event so the UI can update in real-time
      emit({
        type: "github-event",
        action: "created",
        id: workItemId ?? 0,
        projectId: project.id,
        workItemId: workItemId ?? undefined,
      });
    }

    // Execute automation rules: transition matched work items to the target state
    const ruleEvent = mapToRuleEvent(eventType, action, payload);
    let automationsApplied = 0;

    if (ruleEvent && matchedItems.length > 0) {
      // Find enabled automation rules for this event
      const rules = await db
        .select({
          id: githubAutomations.id,
          targetStateId: githubAutomations.targetStateId,
        })
        .from(githubAutomations)
        .where(
          and(
            eq(githubAutomations.projectId, project.id),
            eq(githubAutomations.event, ruleEvent),
            eq(githubAutomations.enabled, true)
          )
        );

      if (rules.length > 0) {
        // Use the first matching rule (there should typically be one per event)
        const rule = rules[0];

        // Look up the target state slug
        const [targetState] = await db
          .select({ slug: workflowStates.slug })
          .from(workflowStates)
          .where(eq(workflowStates.id, rule.targetStateId));

        if (targetState) {
          for (const item of matchedItems) {
            // Get the current state of the work item
            const [currentItem] = await db
              .select({ id: workItems.id, state: workItems.state, projectId: workItems.projectId })
              .from(workItems)
              .where(eq(workItems.id, item.id));

            if (currentItem && currentItem.state !== targetState.slug) {
              // Update the work item state
              await db
                .update(workItems)
                .set({ state: targetState.slug, updatedAt: new Date().toISOString() })
                .where(eq(workItems.id, item.id));

              // Record in status_history
              await db.insert(statusHistory).values({
                workItemId: item.id,
                fromState: currentItem.state,
                toState: targetState.slug,
              });

              // Emit SSE event for the state change
              emit({
                type: "work-item",
                action: "updated",
                id: item.id,
                projectId: project.id,
              });

              automationsApplied++;
            }
          }
        }
      }
    }

    results.push({ projectId: project.id, eventsCreated, automationsApplied });
  }

  return NextResponse.json({ ok: true, results });
}
