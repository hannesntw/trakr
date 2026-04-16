"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/Markdown";
import { ImagePlus } from "lucide-react";

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineEdit({
  value,
  onSave,
  placeholder = "Click to edit...",
  className,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft.trim() !== value) {
      onSave(draft.trim());
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn(
          "w-full bg-transparent border-b-2 border-accent outline-none",
          className
        )}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-pointer rounded px-0.5 -mx-0.5 hover:bg-accent/5 transition-colors border-b border-transparent",
        !value && "text-text-tertiary italic",
        className
      )}
    >
      {value || placeholder}
    </div>
  );
}

interface Attachment {
  id: string;
  filename: string;
  contentType: string;
}

interface InlineTextareaProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  workItemId?: string;
  attachments?: Attachment[];
}

export function InlineTextarea({
  value,
  onSave,
  placeholder = "Click to edit...",
  className,
  workItemId,
  attachments = [],
}: InlineTextareaProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    setPickerOpen(false);
    if (draft !== value) {
      onSave(draft);
    }
  }

  function insertAttachment(att: Attachment) {
    const imageMarkdown = `\n![${att.filename}](/api/attachments/${att.id})\n`;
    const ta = textareaRef.current;
    if (ta) {
      const pos = ta.selectionStart;
      const newDraft =
        draft.slice(0, pos) + imageMarkdown + draft.slice(pos);
      setDraft(newDraft);
    } else {
      setDraft(draft + imageMarkdown);
    }
    setPickerOpen(false);
  }

  async function handlePasteImage(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items || !workItemId) return;

    let imageFile: File | null = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        imageFile = items[i].getAsFile();
        break;
      }
    }
    if (!imageFile) return;

    e.preventDefault();

    // Remember cursor position before upload
    const ta = textareaRef.current;
    const cursorPos = ta ? ta.selectionStart : draft.length;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile, imageFile.name || "pasted-image.png");
      const res = await fetch(`/api/work-items/${workItemId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const att = await res.json();

      const imageMarkdown = `\n![${att.filename}](/api/attachments/${att.id})\n`;
      const newDraft = draft.slice(0, cursorPos) + imageMarkdown + draft.slice(cursorPos);
      setDraft(newDraft);

      // Auto-save with the new content
      onSave(newDraft);
    } catch {
      // Silently fail — user can retry
    } finally {
      setUploading(false);
    }
  }

  const imageAttachments = attachments.filter((a) =>
    a.contentType.startsWith("image/")
  );

  if (editing) {
    return (
      <div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onPaste={handlePasteImage}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
              setPickerOpen(false);
            }
          }}
          className={cn(
            "w-full bg-transparent border border-accent rounded-md p-2 outline-none resize-none min-h-[120px] font-mono text-xs",
            className
          )}
        />
        {uploading && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-accent">
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading image...
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {workItemId && imageAttachments.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen(!pickerOpen)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-accent border border-border rounded hover:border-accent transition-colors"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Insert image
              </button>
              {pickerOpen && (
                <div className="absolute bottom-full left-0 mb-1 bg-surface border border-border rounded-lg shadow-xl z-50 p-2 w-64">
                  <p className="text-[10px] text-text-tertiary mb-1.5 px-1">
                    Select an attachment to insert
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-auto">
                    {imageAttachments.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => insertAttachment(a)}
                        className="aspect-square rounded border border-border overflow-hidden hover:border-accent hover:ring-2 hover:ring-accent/20 transition-all"
                        title={a.filename}
                      >
                        <img
                          src={`/api/attachments/${a.id}`}
                          alt={a.filename}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex-1" />
          <button
            onClick={commit}
            className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => {
              setDraft(value);
              setEditing(false);
              setPickerOpen(false);
            }}
            className="px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-pointer rounded p-2 -m-2 hover:bg-accent/5 transition-colors min-h-[40px]",
        !value && "text-text-tertiary italic",
        className
      )}
    >
      {value ? (
        <Markdown>{value}</Markdown>
      ) : (
        placeholder
      )}
    </div>
  );
}
