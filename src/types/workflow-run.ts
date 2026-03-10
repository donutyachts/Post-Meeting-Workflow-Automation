export type AiProvider = "anthropic" | "gemini";
export type ApprovalStatus = "approved" | "discarded";
export type DeliveryStatus = "success" | "failed" | "skipped";

export type WorkflowRun = {
  id: string;
  meeting_title: string;
  meeting_date: string;
  meeting_duration_minutes: number;
  gemini_doc_id: string;
  project_id: string | null;
  ai_provider: AiProvider;
  approval_status: ApprovalStatus;
  slack_status: DeliveryStatus;
  destination_status: DeliveryStatus;
  slack_thread_ts: string | null;
  created_at: string;
};

export type CreateWorkflowRunInput = Omit<WorkflowRun, "id" | "created_at">;
