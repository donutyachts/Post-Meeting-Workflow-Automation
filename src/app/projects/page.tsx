"use client";

import { useEffect, useState } from "react";
import type { Project, CreateProjectInput, DestinationType } from "@/types/project";

type FormState = {
  name: string;
  slack_channel_id: string;
  slack_channel_name: string;
  destination_type: DestinationType;
  destination_id: string;
  destination_name: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  slack_channel_id: "",
  slack_channel_name: "",
  destination_type: "notion",
  destination_id: "",
  destination_name: "",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch {
      setErrorMessage("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSaving(true);

    try {
      const body: CreateProjectInput = {
        name: form.name.trim(),
        slack_channel_id: form.slack_channel_id.trim(),
        slack_channel_name: form.slack_channel_name.trim(),
        destination_type: form.destination_type,
        destination_id: form.destination_id.trim(),
        destination_name: form.destination_name.trim(),
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message ?? data.error ?? "Failed to create project.");
        return;
      }

      setProjects((prev) => [data.project, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      flash("Project created.");
    } catch {
      setErrorMessage("Network error.");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Edit / Update
  // ---------------------------------------------------------------------------

  function startEdit(project: Project) {
    setEditingId(project.id);
    setEditForm({
      name: project.name,
      slack_channel_id: project.slack_channel_id,
      slack_channel_name: project.slack_channel_name,
      destination_type: project.destination_type,
      destination_id: project.destination_id,
      destination_name: project.destination_name,
    });
    setErrorMessage("");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setErrorMessage("");
    setEditSaving(true);

    try {
      const res = await fetch(`/api/projects/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          slack_channel_id: editForm.slack_channel_id.trim(),
          slack_channel_name: editForm.slack_channel_name.trim(),
          destination_type: editForm.destination_type,
          destination_id: editForm.destination_id.trim(),
          destination_name: editForm.destination_name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message ?? data.error ?? "Failed to update project.");
        return;
      }

      setProjects((prev) =>
        prev.map((p) => (p.id === editingId ? data.project : p))
      );
      setEditingId(null);
      flash("Project updated.");
    } catch {
      setErrorMessage("Network error.");
    } finally {
      setEditSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? Run history will be preserved.")) return;
    setDeletingId(id);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.status === 204) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        flash("Project deleted.");
        return;
      }
      const data = await res.json();
      setErrorMessage(data.message ?? data.error ?? "Failed to delete project.");
    } catch {
      setErrorMessage("Network error.");
    } finally {
      setDeletingId(null);
    }
  }

  function flash(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3000);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-24">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Projects
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
        >
          + New project
        </button>
      </div>

      {errorMessage && (
        <div className="alert alert-error mb-16">{errorMessage}</div>
      )}
      {successMessage && (
        <div className="alert alert-success mb-16">{successMessage}</div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card mb-24">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            New project
          </h2>
          <form onSubmit={handleCreate}>
            <ProjectFormFields form={form} onChange={setForm} />
            <div className="flex gap-12 mt-16">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? <><span className="spinner" /> Saving…</> : "Create"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
          <span className="spinner" />
        </div>
      ) : projects.length === 0 ? (
        <p className="text-muted text-sm">
          No projects yet. Create one to get started.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {projects.map((project) =>
            editingId === project.id ? (
              // Inline edit form
              <div key={project.id} className="card">
                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
                  Edit {project.name}
                </h2>
                <form onSubmit={handleUpdate}>
                  <ProjectFormFields form={editForm} onChange={setEditForm} />
                  <div className="flex gap-12 mt-16">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={editSaving}
                    >
                      {editSaving ? <><span className="spinner" /> Saving…</> : "Save"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditingId(null)}
                      disabled={editSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Read-only card
              <div key={project.id} className="card">
                <div className="flex items-center justify-between mb-8">
                  <strong style={{ fontSize: 15 }}>{project.name}</strong>
                  <div className="flex gap-8">
                    <button
                      className="btn btn-secondary text-sm"
                      onClick={() => startEdit(project)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger text-sm"
                      onClick={() => handleDelete(project.id)}
                      disabled={deletingId === project.id}
                    >
                      {deletingId === project.id ? (
                        <span className="spinner" />
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "max-content 1fr",
                    gap: "6px 24px",
                    fontSize: 13,
                  }}
                >
                  <span className="text-muted">Slack channel</span>
                  <span>#{project.slack_channel_name} <span className="text-muted">({project.slack_channel_id})</span></span>
                  <span className="text-muted">Destination</span>
                  <span>
                    {project.destination_name}{" "}
                    <span className="text-muted">
                      ({project.destination_type === "notion" ? "Notion" : "Google Sheets"})
                    </span>
                  </span>
                  <span className="text-muted">Destination ID</span>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: 12,
                      wordBreak: "break-all",
                    }}
                  >
                    {project.destination_id}
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared form fields component
// ---------------------------------------------------------------------------

function ProjectFormFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
}) {
  function set(key: keyof FormState, value: string) {
    onChange({ ...form, [key]: value });
  }

  return (
    <>
      <div className="form-group">
        <label className="form-label">Project name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Brand Unification"
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Slack channel ID</label>
        <input
          className="form-input"
          value={form.slack_channel_id}
          onChange={(e) => set("slack_channel_id", e.target.value)}
          placeholder="e.g. C08J9PLE20J"
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Slack channel name</label>
        <input
          className="form-input"
          value={form.slack_channel_name}
          onChange={(e) => set("slack_channel_name", e.target.value)}
          placeholder="e.g. brand-unification (without #)"
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Destination type</label>
        <select
          className="form-select"
          value={form.destination_type}
          onChange={(e) => set("destination_type", e.target.value)}
        >
          <option value="notion">Notion</option>
          <option value="sheets">Google Sheets</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">
          {form.destination_type === "notion" ? "Notion database ID" : "Google Sheets spreadsheet ID"}
        </label>
        <input
          className="form-input"
          value={form.destination_id}
          onChange={(e) => set("destination_id", e.target.value)}
          placeholder={
            form.destination_type === "notion"
              ? "e.g. 1a2b3c4d-..."
              : "e.g. 1BxiMVs0XRA..."
          }
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">
          {form.destination_type === "notion" ? "Notion database name" : "Sheet name"}
        </label>
        <input
          className="form-input"
          value={form.destination_name}
          onChange={(e) => set("destination_name", e.target.value)}
          placeholder={
            form.destination_type === "notion"
              ? "e.g. Brand Unification DB"
              : "e.g. Meeting Notes"
          }
          required
        />
      </div>
    </>
  );
}
