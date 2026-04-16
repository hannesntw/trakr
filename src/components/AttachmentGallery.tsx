"use client";

import { useState, useRef } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";

interface Attachment {
  id: string;
  filename: string;
  contentType: string;
}

interface AttachmentGalleryProps {
  workItemId: string;
  attachments: Attachment[];
  onChanged: () => void;
}

export function AttachmentGallery({
  workItemId,
  attachments,
  onChanged,
}: AttachmentGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/work-items/${workItemId}/attachments`, {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    onChanged();
  }

  async function handleDelete(attachmentId: string) {
    setDeleting(attachmentId);
    await fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
    setDeleting(null);
    onChanged();
  }

  const images = attachments.filter((a) => a.contentType.startsWith("image/"));

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        handleUpload(files[i]);
      }
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={dragOver ? "ring-2 ring-accent/40 rounded-lg bg-accent/5 transition-colors" : "transition-colors"}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
          Attachments ({images.length})
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-accent border border-border rounded hover:border-accent transition-colors disabled:opacity-50"
        >
          <Upload className="w-3 h-3" />
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {images.map((a) => (
            <div key={a.id} className="relative group">
              <a
                href={`/api/attachments/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square rounded-md border border-border overflow-hidden hover:border-accent transition-colors"
              >
                <img
                  src={`/api/attachments/${a.id}`}
                  alt={a.filename}
                  className="w-full h-full object-cover"
                />
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(a.id);
                }}
                disabled={deleting === a.id}
                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-black/50 text-[9px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {a.filename}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-text-tertiary hover:border-accent hover:text-accent cursor-pointer transition-colors"
        >
          <ImagePlus className="w-5 h-5 mx-auto mb-1 opacity-50" />
          Drop or click to upload
        </div>
      )}
    </div>
  );
}
