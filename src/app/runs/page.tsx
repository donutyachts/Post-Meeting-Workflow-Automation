"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { triggerState } from "@/lib/workflow-state";
import type { WorkflowRun } from "@/types/workflow-run";

type TriggerStatus = "idle" | "loading" | "no_event" | "error";

export default function RunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [triggerStatus, setTriggerStatus] = useState<TriggerStatus>("idle");
  const [triggerError, setTriggerError] = useState("");

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((data) => setRuns(data.runs ?? []))
      .catch(() => setErrorMessage("Failed to load run history."))
      .finally(() => setLoading(false));
  }, []);

  async function handleTrigger() {
    setTriggerStatus("loading");
    setTriggerError("");

    try {
      const res = await fetch("/api/workflow/trigger", { method: "POST" });
      const data = await res.json();

      if (res.status === 404 && data.error === "NO_RECENT_EVENT") {
        setTriggerStatus("no_event");
        return;
      }

      if (!res.ok) {
        setTriggerError(data.message ?? data.error ?? "An error occurred.");
        setTriggerStatus("error");
        return;
      }

      triggerState.save({ event: data.event, matches: data.matches });
      router.push("/workflow/confirm");
    } catch {
      setTriggerError("Network error — could not reach the server.");
      setTriggerStatus("error");
    }
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-24">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Run history</h1>
        <button
          className="btn btn-primary"
          onClick={handleTrigger}
          disabled={triggerStatus === "loading"}
        >
          {triggerStatus === "loading" ? (
            <><span className="spinner" /> Searching…</>
          ) : (
            "Run workflow"
          )}
        </button>
      </div>

      {triggerStatus === "no_event" && (
        <div className="alert alert-info mb-16">
          <strong>No recent event found.</strong> No organizer-owned Calendar
          events were found in the past 30 days. You can select the Doc
          manually on the next screen.
          <div style={{ marginTop: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                triggerState.save({
                  event: { title: "", date: "", start_time: "", duration_minutes: 0 },
                  matches: [],
                });
                router.push("/workflow/confirm");
              }}
            >
              Select Doc manually
            </button>
          </div>
        </div>
      )}

      {triggerStatus === "error" && (
        <div className="alert alert-error mb-16">
          <strong>Error:</strong> {triggerError}
          <div style={{ marginTop: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setTriggerStatus("idle")}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error mb-16">{errorMessage}</div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
          <span className="spinner" />
        </div>
      ) : runs.length === 0 ? (
        <p className="text-muted text-sm">No workflow runs yet.</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Meeting</th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>AI</th>
                  <th>Approval</th>
                  <th>Slack</th>
                  <th>Destination</th>
                  <th>Run at</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} data-testid="run-row">
                    <td style={{ maxWidth: 240 }}>
                      <span
                        title={run.meeting_title}
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {run.meeting_title}
                      </span>
                    </td>
                    <td className="text-muted" style={{ whiteSpace: "nowrap" }}>
                      {run.meeting_date}
                    </td>
                    <td className="text-muted">
                      {run.project_id ? (
                        <ProjectName id={run.project_id} />
                      ) : (
                        <span style={{ fontStyle: "italic" }}>Deleted project</span>
                      )}
                    </td>
                    <td className="text-muted">{run.ai_provider}</td>
                    <td>
                      <ApprovalBadge status={run.approval_status} />
                    </td>
                    <td>
                      <DeliveryBadge status={run.slack_status} />
                    </td>
                    <td>
                      <DeliveryBadge status={run.destination_status} />
                    </td>
                    <td className="text-muted" style={{ whiteSpace: "nowrap" }}>
                      {formatDateTime(run.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project name lookup (cached across rows via module-level map)
// ---------------------------------------------------------------------------

const projectCache: Record<string, string> = {};

function ProjectName({ id }: { id: string }) {
  const [name, setName] = useState<string | null>(projectCache[id] ?? null);

  useEffect(() => {
    if (projectCache[id]) {
      setName(projectCache[id]);
      return;
    }
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        // Populate cache for all projects in one request
        for (const p of data.projects ?? []) {
          projectCache[p.id] = p.name;
        }
        setName(projectCache[id] ?? id.slice(0, 8) + "…");
      })
      .catch(() => setName(id.slice(0, 8) + "…"));
  }, [id]);

  if (!name) return <span className="text-muted">—</span>;
  return <span>{name}</span>;
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function ApprovalBadge({ status }: { status: WorkflowRun["approval_status"] }) {
  const cls = status === "approved" ? "badge-success" : "badge-muted";
  return <span className={`badge ${cls}`}>{status}</span>;
}

function DeliveryBadge({ status }: { status: WorkflowRun["slack_status"] }) {
  const cls =
    status === "success"
      ? "badge-success"
      : status === "failed"
      ? "badge-danger"
      : "badge-muted";
  return <span className={`badge ${cls}`}>{status}</span>;
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
