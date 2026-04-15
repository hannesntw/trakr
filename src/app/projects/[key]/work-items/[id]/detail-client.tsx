"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { TypeBadge, StateBadge, IdBadge } from "@/components/Badge";
import { InlineEdit, InlineTextarea } from "@/components/InlineEdit";
import { StateSelect } from "@/components/StateSelect";
import { AttachmentGallery } from "@/components/AttachmentGallery";
import { StatusTimeline } from "@/components/StatusTimeline";
import { ChangeHistory } from "@/components/ChangeHistory";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { WorkItemLinks } from "@/components/WorkItemLinks";
import { PointsPicker } from "@/components/PointsBadge";
import { Markdown } from "@/components/Markdown";
import { GitPullRequest, GitBranch, GitCommit, CheckCircle2, XCircle, Circle, ExternalLink, Rocket } from "lucide-react";
import { formatFullDateTime } from "@/lib/utils";
import { RelativeTime } from "@/components/RelativeTime";
import { TYPE_LABELS, type WorkItemType, type WorkflowState } from "@/lib/constants";

interface GitHubEventData {
  linked: boolean;
  repo?: string;
  branch?: string | null;
  commits?: { sha: string; message: string; createdAt: string }[];
  pullRequests?: { number: number; title: string | null; state: string | null; ciStatus: string | null }[];
  deployments?: { status: string | null; createdAt: string }[];
  ciChecks?: { sha: string | null; status: string | null; createdAt: string }[];
}

interface WorkItem {
  id: number;
  displayId: string | null;
  title: string;
  type: string;
  state: string;
  description: string | null;
  parentId: number | null;
  sprintId: number | null;
  assignee: string | null;
  points: number | null;
  createdAt: string;
  children?: WorkItem[];
}

interface Comment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
}

interface Sprint {
  id: number;
  name: string;
}

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface ParentCandidate {
  id: number;
  title: string;
  type: string;
}

export function WorkItemDetailFull({
  workItemId,
  projectId,
  projectKey,
  projectName,
}: {
  workItemId: number;
  projectId: number;
  projectKey: string;
  projectName: string;
}) {
  const [item, setItem] = useState<WorkItem | null>(null);
  const [parent, setParent] = useState<WorkItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachmentList, setAttachmentList] = useState<{id: number; filename: string; contentType: string}[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [statusChanges, setStatusChanges] = useState<{id: number; fromState: string; toState: string; changedAt: string}[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [parentCandidates, setParentCandidates] = useState<ParentCandidate[]>([]);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [newComment, setNewComment] = useState("");
  const [pageDragOver, setPageDragOver] = useState(false);
  const [githubData, setGithubData] = useState<GitHubEventData | null>(null);

  async function handleFileUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/work-items/${workItemId}/attachments`, {
      method: "POST",
      body: formData,
    });
    fetchData();
  }

  const fetchData = useCallback(async () => {
    const [itemRes, commentsRes, attachRes, sprintsRes, historyRes, membersRes, parentCandidatesRes, wfRes] = await Promise.all([
      fetch(`/api/work-items/${workItemId}`),
      fetch(`/api/work-items/${workItemId}/comments`),
      fetch(`/api/work-items/${workItemId}/attachments`),
      fetch(`/api/sprints?projectId=${projectId}`),
      fetch(`/api/work-items/${workItemId}/history`),
      fetch(`/api/projects/${projectId}/members`),
      fetch(`/api/work-items?projectId=${projectId}&type=epic`),
      fetch(`/api/projects/${projectId}/workflow`),
    ]);
    const itemData = await itemRes.json();
    setItem(itemData);
    setComments(await commentsRes.json());
    if (attachRes.ok) setAttachmentList(await attachRes.json());
    setSprints(await sprintsRes.json());
    if (historyRes.ok) setStatusChanges(await historyRes.json());
    if (membersRes.ok) setMembers(await membersRes.json());
    if (wfRes.ok) setWorkflowStates(await wfRes.json());

    // Combine epics and features as parent candidates
    const epics: ParentCandidate[] = parentCandidatesRes.ok ? await parentCandidatesRes.json() : [];
    const featureRes = await fetch(`/api/work-items?projectId=${projectId}&type=feature`);
    const features: ParentCandidate[] = featureRes.ok ? await featureRes.json() : [];
    setParentCandidates([...epics, ...features].filter((c) => c.id !== workItemId));

    const versionsRes = await fetch(`/api/work-items/${workItemId}/versions`);
    if (versionsRes.ok) setVersions(await versionsRes.json());

    if (itemData.parentId) {
      const parentRes = await fetch(`/api/work-items/${itemData.parentId}`);
      if (parentRes.ok) setParent(await parentRes.json());
    } else {
      setParent(null);
    }

    // Fetch GitHub events for this work item
    const ghRes = await fetch(`/api/work-items/${workItemId}/github`);
    if (ghRes.ok) {
      const ghData: GitHubEventData = await ghRes.json();
      setGithubData(ghData);
    } else {
      setGithubData(null);
    }
  }, [workItemId, projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useRealtimeRefresh(fetchData);

  async function updateField(field: string, value: unknown) {
    await fetch(`/api/work-items/${workItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Stori-Channel": "web" },
      body: JSON.stringify({ [field]: value }),
    });
    fetchData();
  }

  async function postComment() {
    if (!newComment.trim()) return;
    const res = await fetch(`/api/work-items/${workItemId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment.trim() }),
    });
    if (res.ok) {
      setNewComment("");
      const updated = await fetch(
        `/api/work-items/${workItemId}/comments`
      ).then((r) => r.json());
      setComments(updated);
    }
  }

  const memberOptions: ComboboxOption[] = useMemo(
    () =>
      members.map((m) => ({
        value: m.name ?? m.email ?? m.id,
        label: m.name ?? "Unknown",
        secondary: m.email ?? undefined,
        icon: (
          <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center shrink-0">
            {(m.name ?? "?")
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
        ),
      })),
    [members]
  );

  const parentOptions: ComboboxOption[] = useMemo(
    () =>
      parentCandidates.map((c) => ({
        value: String(c.id),
        label: c.title,
        secondary: `${(c as any).displayId ?? `#${c.id}`} · ${TYPE_LABELS[c.type as keyof typeof TYPE_LABELS] ?? c.type}`,
      })),
    [parentCandidates]
  );

  if (!item) {
    return (
      <>
        <Header title={projectName} subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center text-sm text-text-tertiary">
          Loading...
        </div>
      </>
    );
  }

  const sprint = item.sprintId
    ? sprints.find((s) => s.id === item.sprintId)
    : null;

  return (
    <>
      <Header title={projectName} subtitle={`${item.displayId ?? `#${item.id}`} ${item.title}`} />
      <div
        className={`flex-1 overflow-auto${pageDragOver ? " ring-2 ring-inset ring-accent/30 bg-accent/5" : ""}`}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy"; setPageDragOver(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setPageDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setPageDragOver(false); const files = e.dataTransfer.files; for (let i = 0; i < files.length; i++) { handleFileUpload(files[i]); } }}
      >
        <div className="max-w-5xl mx-auto p-6">
          <div className="grid grid-cols-[1fr_280px] gap-6">
            {/* Main Content */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <TypeBadge type={item.type as WorkItemType} />
                  <IdBadge id={item.id} displayId={item.displayId} />
                </div>
                <InlineEdit
                  value={item.title}
                  onSave={(val) => updateField("title", val)}
                  className="text-xl font-semibold text-text-primary"
                />
              </div>

              <div className="bg-surface border border-border rounded-lg p-4">
                <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Description
                </h3>
                <InlineTextarea
                  value={item.description ?? ""}
                  onSave={(val) => { updateField("description", val); fetchData(); }}
                  placeholder="Add a description..."
                  className="text-sm text-text-primary leading-relaxed"
                  workItemId={item.id}
                  attachments={attachmentList}
                />
              </div>

              {item.children && item.children.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                    Child Items
                  </h3>
                  <div className="space-y-1.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/projects/${projectKey}/work-items/${child.displayId ?? child.id}`}
                        className="flex items-center gap-3 px-3 py-2 bg-surface border border-border rounded-lg hover:border-border-hover transition-colors group"
                      >
                        <TypeBadge type={child.type as WorkItemType} />
                        <span className="text-sm text-text-primary group-hover:text-accent transition-colors flex-1">
                          {child.title}
                        </span>
                        <StateBadge state={child.state} workflowStates={workflowStates} />
                        <IdBadge id={child.id} displayId={child.displayId} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              {statusChanges.length > 0 && (
                <StatusTimeline changes={statusChanges} workflowStates={workflowStates} />
              )}

              {/* Change History */}
              {versions.length > 0 && (
                <ChangeHistory
                  versions={versions}
                  workflowStates={workflowStates}
                  onRestore={async (version) => {
                    await fetch(`/api/work-items/${workItemId}/restore`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "X-Stori-Channel": "web" },
                      body: JSON.stringify({ version }),
                    });
                    fetchData();
                  }}
                />
              )}

              {/* Comments */}
              <div>
                <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
                  Comments ({comments.length})
                </h3>

                {comments.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className="bg-surface border border-border rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center">
                            {c.author
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <span className="text-sm font-medium text-text-primary">
                            {c.author}
                          </span>
                          <RelativeTime date={c.createdAt} className="text-xs text-text-tertiary" />
                        </div>
                        <div className="text-sm text-text-secondary leading-relaxed">
                          <Markdown>{c.body}</Markdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={postComment}
                      disabled={!newComment.trim()}
                      className="px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
                <div>
                  <span className="text-xs text-text-tertiary block mb-1">
                    State
                  </span>
                  <StateSelect
                    value={item.state}
                    onChange={(s) => updateField("state", s)}
                    workflowStates={workflowStates}
                    size="md"
                  />
                </div>

                <div>
                  <span className="text-xs text-text-tertiary block mb-1">
                    Type
                  </span>
                  <TypeBadge type={item.type as WorkItemType} />
                </div>

                <div>
                  <span className="text-xs text-text-tertiary block mb-1">
                    Parent
                  </span>
                  <Combobox
                    options={parentOptions}
                    value={item.parentId ? String(item.parentId) : null}
                    onChange={(val) => updateField("parentId", val ? Number(val) : null)}
                    placeholder="No parent"
                    searchPlaceholder="Search epics & features..."
                    clearLabel="Remove parent"
                  />
                </div>

                <div>
                  <span className="text-xs text-text-tertiary block mb-1">
                    Sprint
                  </span>
                  <span className="text-sm text-text-primary">
                    {sprint ? sprint.name : "—"}
                  </span>
                </div>

                {(item.type === "story" || item.type === "bug") && (
                  <div>
                    <span className="text-xs text-text-tertiary block mb-1">
                      Points
                    </span>
                    <PointsPicker
                      value={item.points}
                      onChange={(v) => updateField("points", v)}
                    />
                  </div>
                )}

                <div>
                  <span className="text-xs text-text-tertiary block mb-1">
                    Assignee
                  </span>
                  <Combobox
                    options={memberOptions}
                    value={item.assignee}
                    onChange={(val) => updateField("assignee", val)}
                    placeholder="Unassigned"
                    searchPlaceholder="Search members..."
                    clearLabel="Unassign"
                    renderSelected={(opt) => (
                      <span className="flex items-center gap-2">
                        {opt.icon}
                        <span className="text-text-primary text-sm truncate">{opt.label}</span>
                      </span>
                    )}
                  />
                </div>

                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-text-tertiary block mb-0.5">
                    Created
                  </span>
                  <span className="text-xs text-text-secondary" title={formatFullDateTime(item.createdAt)}>
                    {new Date(item.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Attachment Gallery */}
              <div className="bg-surface border border-border rounded-lg p-4">
                <AttachmentGallery
                  workItemId={item.id}
                  attachments={attachmentList}
                  onChanged={fetchData}
                />
              </div>

              {/* Work Item Links */}
              <WorkItemLinks
                workItemId={item.id}
                projectId={projectId}
                projectKey={projectKey}
                workflowStates={workflowStates}
              />

              {/* Development — GitHub integration */}
              {githubData?.linked && (() => {
                const repo = githubData.repo!;
                const hasActivity =
                  (githubData.commits?.length ?? 0) > 0 ||
                  (githubData.pullRequests?.length ?? 0) > 0 ||
                  (githubData.deployments?.length ?? 0) > 0;

                return (
                  <div className="bg-surface border border-border rounded-lg p-4">
                    <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1 mb-3">
                      <GitBranch className="w-3 h-3" />
                      Development
                    </span>

                    {/* Branch */}
                    {githubData.branch && (
                      <div className="flex items-center gap-2 mb-3">
                        <GitBranch className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                        <code className="text-xs bg-content-bg border border-border px-2 py-1 rounded font-mono text-text-secondary truncate">
                          {githubData.branch}
                        </code>
                      </div>
                    )}

                    {/* Pull Requests */}
                    {githubData.pullRequests && githubData.pullRequests.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {githubData.pullRequests.map((pr) => (
                          <div key={pr.number} className="border border-border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <GitPullRequest className={`w-4 h-4 shrink-0 ${
                                pr.state === "merged" ? "text-purple-600" :
                                pr.state === "closed" ? "text-red-500" :
                                "text-blue-600"
                              }`} />
                              <span className="text-sm font-medium text-text-primary flex-1 truncate">
                                #{pr.number} {pr.title ?? ""}
                              </span>
                              <a
                                href={`https://github.com/${repo}/pull/${pr.number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-text-tertiary hover:text-text-secondary transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-text-tertiary">
                              <span className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${
                                  pr.state === "merged" ? "bg-purple-500" :
                                  pr.state === "closed" ? "bg-red-500" :
                                  "bg-blue-500"
                                }`} />
                                {pr.state === "merged" ? "Merged" :
                                 pr.state === "closed" ? "Closed" :
                                 "Open"}
                              </span>
                              <span>{repo}</span>
                              {pr.ciStatus && (
                                <span className={`flex items-center gap-1 ${
                                  pr.ciStatus === "success" || pr.ciStatus === "passing" ? "text-emerald-500" :
                                  pr.ciStatus === "failure" || pr.ciStatus === "failing" ? "text-red-500" :
                                  "text-amber-500"
                                }`}>
                                  {pr.ciStatus === "success" || pr.ciStatus === "passing" ? <CheckCircle2 className="w-3 h-3" /> :
                                   pr.ciStatus === "failure" || pr.ciStatus === "failing" ? <XCircle className="w-3 h-3" /> :
                                   <Circle className="w-3 h-3" />}
                                  CI {pr.ciStatus === "success" || pr.ciStatus === "passing" ? "passing" :
                                      pr.ciStatus === "failure" || pr.ciStatus === "failing" ? "failing" :
                                      "pending"}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recent commits */}
                    {githubData.commits && githubData.commits.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Recent commits</span>
                        {githubData.commits.map((c, i) => (
                          <div key={`${c.sha}-${i}`} className="flex items-center gap-2 text-xs">
                            <GitCommit className="w-3 h-3 text-text-tertiary shrink-0" />
                            <a
                              href={`https://github.com/${repo}/commit/${c.sha}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-text-tertiary font-mono hover:text-text-secondary transition-colors"
                            >
                              {c.sha.slice(0, 7)}
                            </a>
                            <span className="text-text-secondary truncate flex-1">
                              {c.message ? c.message.split("\n")[0] : ""}
                            </span>
                            <RelativeTime date={c.createdAt} className="text-text-tertiary shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Deployments */}
                    {githubData.deployments && githubData.deployments.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Deployments</span>
                        {githubData.deployments.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <Rocket className="w-3 h-3 text-text-tertiary shrink-0" />
                            <span className={`flex items-center gap-1 ${
                              d.status === "success" ? "text-emerald-500" :
                              d.status === "failure" ? "text-red-500" :
                              "text-text-tertiary"
                            }`}>
                              {d.status === "success" ? <CheckCircle2 className="w-3 h-3" /> :
                               d.status === "failure" ? <XCircle className="w-3 h-3" /> :
                               <Circle className="w-3 h-3" />}
                              Deploy {d.status ?? "unknown"}
                            </span>
                            <RelativeTime date={d.createdAt} className="text-text-tertiary ml-auto shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty state */}
                    {!hasActivity && (
                      <p className="text-xs text-text-tertiary">No development activity</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
