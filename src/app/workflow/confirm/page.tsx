"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  triggerState,
  confirmState,
  generateState,
  type WorkflowDoc,
} from "@/lib/workflow-state";
import type { Project } from "@/types/project";

type PageState = "loading" | "ready" | "generating" | "error";

export default function ConfirmPage() {
  const router = useRouter();

  // Trigger state from sessionStorage
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // Event details
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventDurationMinutes, setEventDurationMinutes] = useState(0);

  // Doc selection
  const [candidates, setCandidates] = useState<WorkflowDoc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [manualDocId, setManualDocId] = useState("");
  const [useManual, setUseManual] = useState(false);

  // Meeting title override (used when no event was found)
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");

  // Project selection
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    const state = triggerState.load();
    if (!state) {
      router.replace("/");
      return;
    }

    const { event, matches } = state;
    setEventTitle(event.title);
    setEventDate(event.date);
    setEventStartTime(event.start_time);
    setEventDurationMinutes(event.duration_minutes);
    setMeetingTitle(event.title);
    setMeetingDate(event.date);
    setCandidates(matches);

    if (matches.length === 0) {
      setUseManual(true);
    } else if (matches.length === 1) {
      setSelectedDocId(matches[0].doc_id);
    }

    setPageState("ready");
  }, [router]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects ?? []);
        if (data.projects?.length === 1) {
          setProjectId(data.projects[0].id);
        }
      })
      .catch(() => {
        // Non-fatal — user will see empty dropdown
      })
      .finally(() => setProjectsLoading(false));
  }, []);

  function resolvedDocId(): string {
    return useManual ? manualDocId.trim() : selectedDocId;
  }

  function resolvedDoc(): WorkflowDoc | null {
    const id = resolvedDocId();
    if (useManual) {
      return { doc_id: id, doc_title: id, doc_date: "", confidence: "partial" };
    }
    return candidates.find((c) => c.doc_id === id) ?? null;
  }

  async function handleGenerate() {
    const docId = resolvedDocId();
    const doc = resolvedDoc();
    const title = meetingTitle.trim();
    const date = meetingDate.trim();

    if (!docId) {
      setErrorMessage("Please select or enter a Google Doc ID.");
      return;
    }
    if (!projectId) {
      setErrorMessage("Please select a project.");
      return;
    }
    if (!title) {
      setErrorMessage("Please enter a meeting title.");
      return;
    }
    if (!date) {
      setErrorMessage("Please enter a meeting date.");
      return;
    }

    setErrorMessage("");
    setPageState("generating");

    try {
      const res = await fetch("/api/workflow/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId,
          meeting_title: title,
          meeting_date: date,
          meeting_duration_minutes: eventDurationMinutes,
          project_id: projectId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message ?? data.error ?? "Generation failed.");
        setPageState("ready");
        return;
      }

      // Save confirm + generate state; navigate to approval screen.
      confirmState.save({
        event: {
          title: eventTitle,
          date: eventDate,
          start_time: eventStartTime,
          duration_minutes: eventDurationMinutes,
        },
        doc: doc ?? { doc_id: docId, doc_title: docId, doc_date: "", confidence: "partial" },
        project_id: projectId,
        meeting_title: title,
        meeting_date: date,
      });

      generateState.save({
        run_id: data.run_id,
        summary: data.summary,
        records: data.records,
      });

      router.push("/workflow/approve");
    } catch {
      setErrorMessage("Network error — could not reach the server.");
      setPageState("ready");
    }
  }

  if (pageState === "loading") {
    return (
      <div className="page" style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <span className="spinner" />
      </div>
    );
  }

  const isGenerating = pageState === "generating";
  const noEvent = !eventTitle;

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <h1 className="page-title">Confirm Doc & assign project</h1>

      {/* Meeting details */}
      <section className="card card-muted mb-24">
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Meeting title</label>
          <input
            data-testid="meeting-title-input"
            className="form-input"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="e.g. Brand Unification Sync"
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Meeting date</label>
          <input
            data-testid="meeting-date-input"
            className="form-input"
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
          />
        </div>
        {!noEvent && (
          <p className="helper-text" style={{ marginTop: 10 }}>
            Calendar event: <strong>{eventTitle}</strong> · {formatDate(eventDate)} at{" "}
            {formatTime(eventStartTime)} · {eventDurationMinutes} min
          </p>
        )}
      </section>

      {/* Doc selection */}
      <section className="mb-24">
        <h2 className="section-heading" style={{ marginBottom: 12 }}>Gemini Notes Doc</h2>

        {candidates.length > 0 && !useManual && (
          <>
            <div className="card mb-12">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 32 }} />
                      <th>Doc title</th>
                      <th>Created</th>
                      <th>Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr
                        key={c.doc_id}
                        data-testid="doc-candidate"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedDocId(c.doc_id)}
                      >
                        <td>
                          <input
                            type="radio"
                            name="doc"
                            value={c.doc_id}
                            checked={selectedDocId === c.doc_id}
                            onChange={() => setSelectedDocId(c.doc_id)}
                          />
                        </td>
                        <td>{c.doc_title}</td>
                        <td className="text-muted">{c.doc_date ? formatDate(c.doc_date) : "—"}</td>
                        <td>
                          <span className={`badge ${c.confidence === "exact" ? "badge-success" : "badge-warning"}`}>
                            {c.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <button
              className="text-link"
              onClick={() => setUseManual(true)}
            >
              Use a different Doc
            </button>
          </>
        )}

        {(useManual || candidates.length === 0) && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Google Doc ID</label>
            <input
              data-testid="manual-doc-input"
              className="form-input"
              value={manualDocId}
              onChange={(e) => setManualDocId(e.target.value)}
              placeholder="Paste the Doc ID from the Drive URL"
            />
            {candidates.length > 0 && (
              <button
                className="text-link"
                style={{ marginTop: 4 }}
                onClick={() => {
                  setUseManual(false);
                  setManualDocId("");
                }}
              >
                ← Back to matches
              </button>
            )}
          </div>
        )}
      </section>

      {/* Project selection */}
      <section className="mb-24">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Project</label>
          {projectsLoading ? (
            <span className="text-muted text-sm">Loading projects…</span>
          ) : projects.length === 0 ? (
            <p className="text-muted text-sm">
              No projects configured.{" "}
              <a href="/projects" className="text-link">
                Create one first.
              </a>
            </p>
          ) : (
            <select
              data-testid="project-select"
              className="form-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {errorMessage && (
        <div className="alert alert-error mb-16">{errorMessage}</div>
      )}

      <div className="flex gap-12">
        <button
          data-testid="generate-btn"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spinner" />
              Generating summary…
            </>
          ) : (
            "Generate summary"
          )}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => router.push("/")}
          disabled={isGenerating}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
