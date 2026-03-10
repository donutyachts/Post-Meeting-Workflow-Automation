"use client";

import { useEffect, useState } from "react";
import type { WorkflowRun } from "@/types/workflow-run";

export default function RunsPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((data) => setRuns(data.runs ?? []))
      .catch(() => setErrorMessage("Failed to load run history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">Run history</h1>

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
