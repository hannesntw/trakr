"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, ExternalLink, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TypeBadge, StateBadge, IdBadge } from "@/components/Badge";
import { InlineEdit, InlineTextarea } from "@/components/InlineEdit";
import { StateSelect } from "@/components/StateSelect";
import { AttachmentGallery } from "@/components/AttachmentGallery";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { Markdown } from "@/components/Markdown";
import { RelativeTime } from "@/components/RelativeTime";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { WorkItemType, WorkflowState } from "@/lib/constants";

interface WorkItem {
  id: string;
  displayId: string | null;
  projectId: string;
  title: string;
  type: string;
  state: string;
  description: string | null;
  parentId: string | null;
  sprintId: string | null;
  assignee: string | null;
  createdAt: string;
  children?: WorkItem[];
}

interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface DetailPanelProps {
  workItemId: string | null;
  projectKey: string;
  projectId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function DetailPanel({
  workItemId,
  projectKey,
  projectId,
  onClose,
  onUpdated,
}: DetailPanelProps) {
  const [item, setItem] = useState<WorkItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachmentList, setAttachmentList] = useState<{id: string; filename: string; contentType: string}[]>([]);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [panelDragOver, setPanelDragOver] = useState(false);

  async function handleFileUpload(file: File) {
    if (!workItemId) return;
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/work-items/${workItemId}/attachments`, {
      method: "POST",
      body: formData,
    });
    fetchItem();
    onUpdated();
  }

  const fetchItem = useCallback(async () => {
    if (!workItemId) return;
    setLoading(true);
    const [itemRes, commentsRes, attachRes, wfRes, membersRes] = await Promise.all([
      fetch(`/api/work-items/${workItemId}`),
      fetch(`/api/work-items/${workItemId}/comments`),
      fetch(`/api/work-items/${workItemId}/attachments`),
      fetch(`/api/projects/${projectId}/workflow`),
      fetch(`/api/projects/${projectId}/members`),
    ]);
    if (itemRes.ok) setItem(await itemRes.json());
    if (commentsRes.ok) setComments(await commentsRes.json());
    if (attachRes.ok) setAttachmentList(await attachRes.json());
    if (wfRes.ok) setWorkflowStates(await wfRes.json());
    if (membersRes.ok) setMembers(await membersRes.json());
    setLoading(false);
  }, [workItemId, projectId]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  useRealtimeRefresh(fetchItem);

  async function updateField(field: string, value: unknown) {
    if (!workItemId) return;
    await fetch(`/api/work-items/${workItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    fetchItem();
    onUpdated();
  }

  async function postComment() {
    if (!workItemId || !newComment.trim()) return;
    const res = await fetch(`/api/work-items/${workItemId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment.trim() }),
    });
    if (res.ok) {
      setNewComment("");
      fetchItem();
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

  if (!workItemId) return null;

  return (
    <div
      className={`fixed inset-y-0 right-0 w-[480px] bg-surface border-l border-border shadow-2xl z-40 flex flex-col${panelDragOver ? " ring-2 ring-inset ring-accent/30 bg-accent/5" : ""}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy"; setPanelDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setPanelDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setPanelDragOver(false); const files = e.dataTransfer.files; for (let i = 0; i < files.length; i++) { handleFileUpload(files[i]); } }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          {item && (
            <>
              <TypeBadge type={item.type as WorkItemType} />
              <IdBadge id={item.id} displayId={item.displayId} />
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/projects/${projectKey}/work-items/${item?.displayId ?? workItemId}`}
            className="p-1.5 rounded hover:bg-content-bg transition-colors"
            title="Open full page"
          >
            <ExternalLink className="w-3.5 h-3.5 text-text-tertiary" />
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-content-bg transition-colors"
          >
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>
      </div>

      {loading && !item ? (
        <div className="flex-1 flex items-center justify-center text-sm text-text-tertiary">
          Loading...
        </div>
      ) : item ? (
        <div className="flex-1 overflow-auto">
          <div className="p-5 space-y-5">
            {/* Title (inline editable) */}
            <InlineEdit
              value={item.title}
              onSave={(val) => updateField("title", val)}
              className="text-lg font-semibold text-text-primary"
            />

            {/* State */}
            <div className="flex items-center gap-4">
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
            </div>

            {/* Description (inline editable) */}
            <div>
              <span className="text-xs text-text-tertiary block mb-1.5">
                Description
              </span>
              <InlineTextarea
                value={item.description ?? ""}
                onSave={(val) => { updateField("description", val); fetchItem(); }}
                placeholder="Add a description..."
                className="text-sm text-text-primary leading-relaxed"
                workItemId={item.id}
                attachments={attachmentList}
              />
            </div>

            {/* Attachments */}
            <AttachmentGallery
              workItemId={item.id}
              attachments={attachmentList}
              onChanged={fetchItem}
            />

            {/* Children */}
            {item.children && item.children.length > 0 && (
              <div>
                <span className="text-xs text-text-tertiary block mb-1.5">
                  Child Items
                </span>
                <div className="space-y-1">
                  {item.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-border/50 text-xs"
                    >
                      <TypeBadge type={child.type as WorkItemType} />
                      <span className="flex-1 truncate text-text-primary">
                        {child.title}
                      </span>
                      <StateBadge state={child.state} workflowStates={workflowStates} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-xs text-text-tertiary">
                  Comments ({comments.length})
                </span>
              </div>

              {comments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="bg-content-bg rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-medium text-text-primary">
                          {c.author}
                        </span>
                        <RelativeTime date={c.createdAt} className="text-[10px] text-text-tertiary" />
                      </div>
                      <div className="text-xs text-text-secondary leading-relaxed">
                        <Markdown>{c.body}</Markdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-1.5">
                  <textarea
                    placeholder="Write a comment... (Markdown supported)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                    rows={2}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-border rounded-md bg-content-bg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                  />
                  <button
                    onClick={postComment}
                    disabled={!newComment.trim()}
                    className="px-2.5 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs font-medium rounded-md transition-colors self-end"
                  >
                    Post
                  </button>
                </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
