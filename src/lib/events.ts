// Simple in-process event emitter for SSE-based real-time updates.
// API routes call emit() after mutations; the SSE endpoint streams to clients.

type Listener = (event: ChangeEvent) => void;

export interface ChangeEvent {
  type: "work-item" | "sprint" | "comment" | "attachment" | "link" | "project" | "workflow" | "github-event";
  action: "created" | "updated" | "deleted";
  id: number;
  projectId?: number; // allows clients to filter by project
  workItemId?: number; // for comments/attachments
}

const listeners = new Set<Listener>();

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function emit(event: ChangeEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}
