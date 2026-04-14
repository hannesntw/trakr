/**
 * GitHub integration helpers for posting status checks and PR comments.
 *
 * All functions are fire-and-forget: they log errors but never throw,
 * so the webhook handler can continue even if GitHub API calls fail.
 */

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "stori-app";
const STORI_BASE = "https://stori.zone";
const COMMENT_MARKER = "<!-- stori-bot -->";

interface WorkItemInfo {
  id: number;
  displayId: string;
  title: string;
  state: string;
  points: number | null;
  description: string | null;
}

interface SprintInfo {
  name: string;
  goal: string | null;
}

interface StatusCheckParams {
  owner: string;
  repo: string;
  sha: string;
  projectKey: string;
  workItem: WorkItemInfo;
}

interface PrCommentParams {
  owner: string;
  repo: string;
  prNumber: number;
  projectKey: string;
  workItems: WorkItemInfo[];
  sprint: SprintInfo | null;
}

function getToken(): string | null {
  return process.env.GITHUB_TOKEN ?? null;
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Post a commit status check on a SHA for a single work item.
 * Context: `stori/{displayId}` — one status per work item.
 */
export async function postStatusCheck(params: StatusCheckParams): Promise<void> {
  const token = getToken();
  if (!token) return;

  const { owner, repo, sha, projectKey, workItem } = params;
  const targetUrl = `${STORI_BASE}/projects/${projectKey}/work-items/${workItem.id}`;
  const pointsSuffix = workItem.points != null ? `, ${workItem.points}pts` : "";
  const description = `${workItem.displayId} — ${workItem.title} (${workItem.state}${pointsSuffix})`;

  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/statuses/${sha}`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        state: "success",
        target_url: targetUrl,
        description: description.slice(0, 140), // GitHub limit
        context: `stori/${workItem.displayId}`,
      }),
    });
    if (!res.ok) {
      console.error(`[github] Status check failed ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[github] Status check error:", err);
  }
}

/**
 * Extract acceptance criteria from a work item description.
 * Looks for a markdown section starting with "## Acceptance Criteria" or similar.
 */
function extractAcceptanceCriteria(description: string | null): string | null {
  if (!description) return null;
  const match = description.match(/##\s*Acceptance\s+Criteria\s*\n([\s\S]*?)(?=\n##\s|\n---|\z|$)/i);
  if (!match) return null;
  const criteria = match[1].trim();
  return criteria || null;
}

/**
 * Build the markdown body for a PR comment listing linked work items.
 */
function buildCommentBody(params: PrCommentParams): string {
  const { projectKey, workItems, sprint } = params;
  const lines: string[] = [COMMENT_MARKER, "## Stori Work Items", ""];

  // Work items table
  lines.push("| Item | Title | State | Points |");
  lines.push("|------|-------|-------|--------|");
  for (const wi of workItems) {
    const link = `[${wi.displayId}](${STORI_BASE}/projects/${projectKey}/work-items/${wi.id})`;
    const pts = wi.points != null ? String(wi.points) : "—";
    lines.push(`| ${link} | ${wi.title} | ${wi.state} | ${pts} |`);
  }
  lines.push("");

  // Acceptance criteria (from first work item that has it)
  for (const wi of workItems) {
    const ac = extractAcceptanceCriteria(wi.description);
    if (ac) {
      lines.push(`### Acceptance Criteria (${wi.displayId})`, "", ac, "");
      break;
    }
  }

  // Sprint context
  if (sprint) {
    lines.push("### Sprint", "");
    lines.push(`**${sprint.name}**`);
    if (sprint.goal) {
      lines.push(`> ${sprint.goal}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Post or update a PR comment with work item info.
 * If a comment with COMMENT_MARKER already exists, update it instead of posting a new one.
 */
export async function postPrComment(params: PrCommentParams): Promise<void> {
  const token = getToken();
  if (!token) return;

  const { owner, repo, prNumber } = params;
  const body = buildCommentBody(params);

  try {
    // Check for existing Stori comment
    const listRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`,
      { headers: headers(token) }
    );
    if (!listRes.ok) {
      console.error(`[github] List comments failed ${listRes.status}: ${await listRes.text()}`);
      return;
    }

    const comments = (await listRes.json()) as Array<{ id: number; body: string }>;
    const existing = comments.find((c) => c.body.includes(COMMENT_MARKER));

    if (existing) {
      // Update existing comment
      const updateRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/issues/comments/${existing.id}`,
        {
          method: "PATCH",
          headers: headers(token),
          body: JSON.stringify({ body }),
        }
      );
      if (!updateRes.ok) {
        console.error(`[github] Update comment failed ${updateRes.status}: ${await updateRes.text()}`);
      }
    } else {
      // Create new comment
      const createRes = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/issues/${prNumber}/comments`,
        {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify({ body }),
        }
      );
      if (!createRes.ok) {
        console.error(`[github] Create comment failed ${createRes.status}: ${await createRes.text()}`);
      }
    }
  } catch (err) {
    console.error("[github] PR comment error:", err);
  }
}

// Re-export for testing
export { COMMENT_MARKER, buildCommentBody, extractAcceptanceCriteria };
export type { WorkItemInfo, SprintInfo, StatusCheckParams, PrCommentParams };
