"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { triggerState } from "@/lib/workflow-state";

type TriggerStatus = "idle" | "loading" | "no_event" | "error";

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState<TriggerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleTrigger() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/workflow/trigger", { method: "POST" });
      const data = await res.json();

      if (res.status === 404 && data.error === "NO_RECENT_EVENT") {
        setStatus("no_event");
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.message ?? data.error ?? "An error occurred.");
        setStatus("error");
        return;
      }

      // Save trigger result to sessionStorage and navigate to confirm screen.
      triggerState.save({ event: data.event, matches: data.matches });
      router.push("/workflow/confirm");
    } catch {
      setErrorMessage("Network error — could not reach the server.");
      setStatus("error");
    }
  }

  return (
    <div
      className="page"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <h1 className="page-title" style={{ marginBottom: 12 }}>
          Start a workflow run
        </h1>
        <p className="text-muted text-sm" style={{ marginBottom: 32 }}>
          Fetches your most recent Google Calendar event, locates the matching
          Gemini Notes Doc in Drive, and walks you through review and approval.
        </p>

        <button
          className="btn btn-primary btn-lg"
          onClick={handleTrigger}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <>
              <span className="spinner" />
              Searching…
            </>
          ) : (
            "Trigger"
          )}
        </button>

        {status === "no_event" && (
          <div
            className="alert alert-info"
            style={{ marginTop: 24, textAlign: "left" }}
          >
            <strong>No recent event found.</strong> No organizer-owned Calendar
            events were found in the past 30 days. You can select the Doc
            manually on the next screen.
            <div style={{ marginTop: 12 }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  triggerState.save({
                    event: {
                      title: "",
                      date: "",
                      start_time: "",
                      duration_minutes: 0,
                    },
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

        {status === "error" && (
          <div
            className="alert alert-error"
            style={{ marginTop: 24, textAlign: "left" }}
          >
            <strong>Error:</strong> {errorMessage}
            <div style={{ marginTop: 12 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setStatus("idle")}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
