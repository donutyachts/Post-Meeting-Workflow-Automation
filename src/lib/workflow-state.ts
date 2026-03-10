// sessionStorage keys and typed helpers for passing workflow state between screens.
// All values are serialised as JSON. Helpers return null if the key is absent
// or the stored value cannot be parsed.

import type { StructuredDataRecord } from "@/types/structured-data";

// ---------------------------------------------------------------------------
// Shape definitions
// ---------------------------------------------------------------------------

export type WorkflowEvent = {
  title: string;
  date: string;        // ISO 8601 date, e.g. "2026-03-04"
  start_time: string;  // ISO 8601 datetime
  duration_minutes: number;
};

export type WorkflowDoc = {
  doc_id: string;
  doc_title: string;
  doc_date: string;    // ISO 8601 datetime (Drive createdTime)
  confidence: "exact" | "partial";
};

// Persisted after the trigger step; read on the confirm screen.
export type TriggerState = {
  event: WorkflowEvent;
  matches: WorkflowDoc[];
};

// Persisted after the confirm step; read on the approve screen.
export type ConfirmState = {
  event: WorkflowEvent;
  doc: WorkflowDoc;
  project_id: string;
  meeting_title: string;
  meeting_date: string;
};

// Persisted after the generate step; read on the approve screen.
export type GenerateState = {
  run_id: string;
  summary: string;
  records: StructuredDataRecord[];
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const KEYS = {
  trigger: "wf:trigger",
  confirm: "wf:confirm",
  generate: "wf:generate",
} as const;

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function save<T>(key: string, value: T): void {
  sessionStorage.setItem(key, JSON.stringify(value));
}

function load<T>(key: string): T | null {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function remove(key: string): void {
  sessionStorage.removeItem(key);
}

// ---------------------------------------------------------------------------
// Typed accessors
// ---------------------------------------------------------------------------

export const triggerState = {
  save: (v: TriggerState) => save(KEYS.trigger, v),
  load: () => load<TriggerState>(KEYS.trigger),
  clear: () => remove(KEYS.trigger),
};

export const confirmState = {
  save: (v: ConfirmState) => save(KEYS.confirm, v),
  load: () => load<ConfirmState>(KEYS.confirm),
  clear: () => remove(KEYS.confirm),
};

export const generateState = {
  save: (v: GenerateState) => save(KEYS.generate, v),
  load: () => load<GenerateState>(KEYS.generate),
  clear: () => remove(KEYS.generate),
};

// Clears all workflow state — call after a run completes or is discarded.
export function clearAllWorkflowState(): void {
  Object.values(KEYS).forEach(remove);
}
