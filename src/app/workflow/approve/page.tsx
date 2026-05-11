"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmState,
  generateState,
  clearAllWorkflowState,
} from "@/lib/workflow-state";
import type { StructuredDataRecord, RecordCategory } from "@/types/structured-data";
import type { Project } from "@/types/project";
import { RECORD_CATEGORIES } from "@/types/structured-data";

type DeliveryStatus = "success" | "failed" | "skipped";

type DeliveryResult = {
  slack_status: DeliveryStatus;
  destination_status: DeliveryStatus;
  slack_error?: string;
  destination_error?: string;
};

type PageState = "loading" | "review" | "submitting" | "done" | "error";

export default function ApprovePage() {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // Persisted state loaded from sessionStorage
  const [runId, setRunId] = useState("");
  const [summary, setSummary] = useState("");
  const [records, setRecords] = useState<StructuredDataRecord[]>([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [project, setProject] = useState<Project | null>(null);

  // Slack thread link (optional)
  const [slackThreadLink, setSlackThreadLink] = useState("");
  const [threadLinkError, setThreadLinkError] = useState("");

  // Resolved thread_ts saved after first submission so retries can reuse it.
  const [resolvedSlackThreadTs, setResolvedSlackThreadTs] = useState<string | null>(null);

  // Result after approve; updated in-place by retry handlers.
  const [deliveryResult, setDeliveryResult] = useState<DeliveryResult | null>(null);

  // Per-operation retry loading states.
  const [retryingSlack, setRetryingSlack] = useState(false);
  const [retryingDestination, setRetryingDestination] = useState(false);

  // Inline record edit state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const summaryRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (summaryRef.current) autoResizeTextarea(summaryRef.current);
  }, [summary]);

  useEffect(() => {
    const gen = generateState.load();
    const conf = confirmState.load();

    if (!gen || !conf) {
      router.replace("/");
      return;
    }

    setRunId(gen.run_id);
    setSummary(gen.summary);
    setRecords(gen.records);
    setMeetingTitle(conf.meeting_title);
    setMeetingDate(conf.meeting_date);

    // Fetch the project for display info
    fetch(`/api/projects`)
      .then((r) => r.json())
      .then((data) => {
        const found = (data.projects as Project[])?.find(
          (p) => p.id === conf.project_id
        );
        setProject(found ?? null);
      })
      .catch(() => {/* non-fatal */})
      .finally(() => setPageState("review"));
  }, [router]);

  // ---------------------------------------------------------------------------
  // Thread link extraction
  // ---------------------------------------------------------------------------

  function extractThreadTs(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null; // blank = new top-level message

    // Already a valid thread_ts (digits.digits)
    if (/^\d+\.\d+$/.test(trimmed)) return trimmed;

    // Try extracting from a Slack deep-link URL
    // e.g. https://workspace.slack.com/archives/C.../p1234567890123456
    const match = trimmed.match(/\/p(\d{10})(\d{6})$/);
    if (match) return `${match[1]}.${match[2]}`;

    return undefined as unknown as string; // signal invalid
  }

  // ---------------------------------------------------------------------------
  // Approve (initial submission)
  // ---------------------------------------------------------------------------

  async function handleApprove() {
    if (!confirm("Post summary to Slack and write records to the destination? This cannot be undone.")) return;
    setThreadLinkError("");

    const rawThreadLink = slackThreadLink.trim();
    let slackThreadTs: string | null = null;

    if (rawThreadLink) {
      const ts = extractThreadTs(rawThreadLink);
      if (ts == null || !/^\d+\.\d+$/.test(ts)) {
        setThreadLinkError(
          "Could not extract thread_ts from this link. Paste a Slack message link or a raw thread_ts (e.g. 1234567890.123456)."
        );
        return;
      }
      slackThreadTs = ts;
    }

    // Persist for retry use.
    setResolvedSlackThreadTs(slackThreadTs);
    setPageState("submitting");

    try {
      const res = await fetch("/api/workflow/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          summary,
          records,
          slack_thread_ts: slackThreadTs,
        }),
      });

      const data = await res.json();

      if (res.status === 422) {
        setThreadLinkError(data.message ?? "Invalid Slack thread link.");
        setPageState("review");
        return;
      }

      if (!res.ok && res.status !== 207) {
        setErrorMessage(data.message ?? data.error ?? "Approval failed.");
        setPageState("error");
        return;
      }

      clearAllWorkflowState();
      setDeliveryResult(data as DeliveryResult);
      setPageState("done");
    } catch {
      setErrorMessage("Network error — could not reach the server.");
      setPageState("error");
    }
  }

  // ---------------------------------------------------------------------------
  // Retry — Slack only
  // ---------------------------------------------------------------------------

  async function handleRetrySlack() {
    setRetryingSlack(true);
    try {
      const res = await fetch("/api/workflow/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          summary,
          records,
          slack_thread_ts: resolvedSlackThreadTs,
          retry_only: "slack",
        }),
      });

      const data = await res.json();
      // Merge only the Slack fields back into deliveryResult; destination is unchanged.
      setDeliveryResult((prev) => ({
        ...prev!,
        slack_status: data.slack_status ?? prev!.slack_status,
        slack_error: data.slack_error,
      }));
    } catch {
      setDeliveryResult((prev) => ({
        ...prev!,
        slack_error: "Network error — could not reach the server.",
      }));
    } finally {
      setRetryingSlack(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Retry — destination only
  // ---------------------------------------------------------------------------

  async function handleRetryDestination() {
    setRetryingDestination(true);
    try {
      const res = await fetch("/api/workflow/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          summary,
          records,
          slack_thread_ts: resolvedSlackThreadTs,
          retry_only: "destination",
        }),
      });

      const data = await res.json();
      // Merge only the destination fields back; Slack is unchanged.
      setDeliveryResult((prev) => ({
        ...prev!,
        destination_status: data.destination_status ?? prev!.destination_status,
        destination_error: data.destination_error,
      }));
    } catch {
      setDeliveryResult((prev) => ({
        ...prev!,
        destination_error: "Network error — could not reach the server.",
      }));
    } finally {
      setRetryingDestination(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Discard
  // ---------------------------------------------------------------------------

  async function handleDiscard() {
    if (!confirm("Discard this run? Nothing will be posted or written.")) return;
    setPageState("submitting");

    try {
      const res = await fetch("/api/workflow/discard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.message ?? data.error ?? "Discard failed.");
        setPageState("error");
        return;
      }

      clearAllWorkflowState();
      router.push("/");
    } catch {
      setErrorMessage("Network error — could not reach the server.");
      setPageState("error");
    }
  }

  // ---------------------------------------------------------------------------
  // Record editing helpers
  // ---------------------------------------------------------------------------

  function updateRecord(index: number, patch: Partial<StructuredDataRecord>) {
    setRecords((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  }

  function deleteRecord(index: number) {
    setRecords((prev) => prev.filter((_, i) => i !== index));
  }

  function addRecord() {
    const newRecord: StructuredDataRecord = {
      category: "Action items",
      description: "",
      owner: null,
      due_date: null,
      meeting_title: meetingTitle,
      meeting_date: meetingDate,
    };
    setRecords((prev) => [...prev, newRecord]);
    setEditingIndex(records.length);
  }

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (pageState === "loading") {
    return (
      <div className="page" style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <span className="spinner" />
      </div>
    );
  }

  if (pageState === "done" && deliveryResult) {
    const allDone =
      deliveryResult.slack_status === "success" &&
      deliveryResult.destination_status === "success";

    return (
      <div className="page" style={{ maxWidth: 560 }}>
        <h1 className="page-title">{allDone ? "Run complete" : "Run complete — action required"}</h1>

        <div className="card mb-24" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Slack row */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <span style={{ fontWeight: 500, minWidth: 100 }}>Slack</span>
                <DeliveryBadge status={deliveryResult.slack_status} testId="slack-status" />
              </div>
              {deliveryResult.slack_status === "failed" && (
                <button
                  className="btn btn-secondary text-sm"
                  onClick={handleRetrySlack}
                  disabled={retryingSlack || retryingDestination}
                >
                  {retryingSlack ? <><span className="spinner" /> Retrying…</> : "Retry Slack"}
                </button>
              )}
            </div>
            {deliveryResult.slack_error && (
              <p className="text-sm" style={{ color: "var(--danger)", marginTop: 6 }}>
                {deliveryResult.slack_error}
              </p>
            )}
          </div>

          <hr className="divider" style={{ margin: 0 }} />

          {/* Destination row */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <span style={{ fontWeight: 500, minWidth: 100 }}>Destination</span>
                <DeliveryBadge status={deliveryResult.destination_status} testId="destination-status" />
              </div>
              {deliveryResult.destination_status === "failed" && (
                <button
                  className="btn btn-secondary text-sm"
                  onClick={handleRetryDestination}
                  disabled={retryingSlack || retryingDestination}
                >
                  {retryingDestination ? <><span className="spinner" /> Retrying…</> : "Retry destination"}
                </button>
              )}
            </div>
            {deliveryResult.destination_error && (
              <p className="text-sm" style={{ color: "var(--danger)", marginTop: 6 }}>
                {deliveryResult.destination_error}
              </p>
            )}
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => router.push("/")}>
          Start new run
        </button>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="page" style={{ maxWidth: 560 }}>
        <div className="alert alert-error mb-16">{errorMessage}</div>
        <button className="btn btn-secondary" onClick={() => setPageState("review")}>
          Back
        </button>
      </div>
    );
  }

  const isSubmitting = pageState === "submitting";

  return (
    <div className="page" style={{ maxWidth: 1280 }}>
      <div className="flex items-center justify-between mb-24">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Review &amp; approve
        </h1>
        {project && (
          <div className="text-sm text-muted" style={{ textAlign: "right" }}>
            <div>
              <strong>Slack:</strong> #{project.slack_channel_name}
            </div>
            <div>
              <strong>{project.destination_type === "notion" ? "Notion DB" : "Sheet"}:</strong>{" "}
              {project.destination_name}
            </div>
          </div>
        )}
      </div>

      {/* Summary + Records — side by side (Section 3.6) */}
      <div
        className="approve-cols mb-24"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Left column — summary editor + live preview */}
        <section style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Summary</h2>
          <textarea
            ref={summaryRef}
            data-testid="summary-textarea"
            className="form-textarea"
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              overflow: "hidden",
              resize: "none",
              minHeight: 120,
            }}
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              autoResizeTextarea(e.target);
            }}
            disabled={isSubmitting}
          />
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 8,
              }}
            >
              Preview
            </div>
            <div
              className="card card-muted"
              style={{ fontSize: 14, lineHeight: 1.7, padding: "12px 14px", minHeight: 80 }}
            >
              {renderSlackPreview(summary)}
            </div>
          </div>
        </section>

        {/* Right column — structured records */}
        <section style={{ minWidth: 0 }}>
          <div className="flex items-center justify-between mb-12">
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Structured records</h2>
            <button
              className="btn btn-secondary text-sm"
              onClick={addRecord}
              disabled={isSubmitting}
            >
              + Add record
            </button>
          </div>

          {records.length === 0 ? (
            <p className="text-muted text-sm">No records. Add one above.</p>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 120 }} />
                    <col />
                    <col style={{ width: 90 }} />
                    <col style={{ width: 96 }} />
                    <col style={{ width: 120 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th style={{ minWidth: 320 }}>Description</th>
                      <th>Owner</th>
                      <th>Due date</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, i) =>
                      editingIndex === i ? (
                        <RecordEditRow
                          key={i}
                          record={rec}
                          onChange={(patch) => updateRecord(i, patch)}
                          onDone={() => setEditingIndex(null)}
                        />
                      ) : (
                        <tr key={i}>
                          <td>
                            <span className="badge badge-muted">{rec.category}</span>
                          </td>
                          <td>{rec.description}</td>
                          <td
                            className="text-muted"
                            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {rec.owner ?? "—"}
                          </td>
                          <td
                            className="text-muted"
                            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {rec.due_date ?? "—"}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <button
                              className="btn btn-ghost"
                              onClick={() => setEditingIndex(i)}
                              disabled={isSubmitting}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ color: "var(--danger)" }}
                              onClick={() => deleteRecord(i)}
                              disabled={isSubmitting}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Slack thread link */}
      <section className="mb-24">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Slack thread link (optional)</label>
          <input
            data-testid="thread-input"
            className="form-input"
            value={slackThreadLink}
            onChange={(e) => {
              setSlackThreadLink(e.target.value);
              setThreadLinkError("");
            }}
            placeholder="Paste a Slack message link to reply in a thread"
            disabled={isSubmitting}
          />
          {threadLinkError && (
            <span className="text-sm" style={{ color: "var(--danger)", marginTop: 4 }}>
              {threadLinkError}
            </span>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-12">
        <button
          data-testid="approve-btn"
          className="btn btn-primary"
          onClick={handleApprove}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner" />
              Posting…
            </>
          ) : (
            "Approve & Post"
          )}
        </button>
        <button
          data-testid="discard-btn"
          className="btn btn-danger"
          onClick={handleDiscard}
          disabled={isSubmitting}
        >
          Discard
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Textarea auto-resize
// ---------------------------------------------------------------------------

function autoResizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

// ---------------------------------------------------------------------------
// Slack preview renderer
// ---------------------------------------------------------------------------

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*[^*\n]+\*)/);
  if (parts.length === 1) return text;
  return parts.map((p, i) =>
    p.startsWith("*") && p.endsWith("*") && p.length > 2
      ? <strong key={i}>{p.slice(1, -1)}</strong>
      : <span key={i}>{p}</span>
  );
}

function renderSlackPreview(text: string): React.ReactNode {
  if (!text.trim()) {
    return (
      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
        Nothing to preview yet.
      </span>
    );
  }

  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  const bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (!bullets.length) return;
    result.push(
      <ul key={key++} style={{ paddingLeft: 20, margin: "2px 0 6px" }}>
        {bullets.map((b, i) => <li key={i}>{renderInline(b)}</li>)}
      </ul>
    );
    bullets.length = 0;
  };

  for (const line of lines) {
    if (line.startsWith("• ") || line.startsWith("- ")) {
      bullets.push(line.slice(2));
    } else {
      flushBullets();
      if (!line.trim()) {
        result.push(<div key={key++} style={{ height: "0.5em" }} />);
      } else {
        result.push(<div key={key++}>{renderInline(line)}</div>);
      }
    }
  }
  flushBullets();

  return <>{result}</>;
}

// ---------------------------------------------------------------------------
// Inline record edit row
// ---------------------------------------------------------------------------

function RecordEditRow({
  record,
  onChange,
  onDone,
}: {
  record: StructuredDataRecord;
  onChange: (patch: Partial<StructuredDataRecord>) => void;
  onDone: () => void;
}) {
  return (
    <tr style={{ background: "var(--surface)" }}>
      <td>
        <select
          className="form-select"
          style={{ minWidth: 140 }}
          value={record.category}
          onChange={(e) => onChange({ category: e.target.value as RecordCategory })}
        >
          {RECORD_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="form-input"
          value={record.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </td>
      <td>
        <input
          className="form-input"
          value={record.owner ?? ""}
          placeholder="—"
          onChange={(e) => onChange({ owner: e.target.value || null })}
        />
      </td>
      <td>
        <input
          className="form-input"
          type="date"
          value={record.due_date ?? ""}
          onChange={(e) => onChange({ due_date: e.target.value || null })}
        />
      </td>
      <td>
        <button className="btn btn-secondary text-sm" onClick={onDone}>
          Done
        </button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Delivery badge
// ---------------------------------------------------------------------------

function DeliveryBadge({ status, testId }: { status: DeliveryStatus; testId?: string }) {
  const cls =
    status === "success"
      ? "badge-success"
      : status === "failed"
      ? "badge-danger"
      : "badge-muted";
  return <span className={`badge ${cls}`} data-testid={testId}>{status}</span>;
}
