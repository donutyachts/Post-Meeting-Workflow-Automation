import { createServerSupabaseClient } from "../server";
import type { WorkflowRun, CreateWorkflowRunInput } from "@/types/workflow-run";

export async function createWorkflowRun(
  input: CreateWorkflowRunInput
): Promise<WorkflowRun> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Updates delivery status fields on an existing run after approval/discard.
// These are the only fields mutated after initial creation.
export async function updateWorkflowRunDelivery(
  id: string,
  updates: {
    approval_status: "approved" | "discarded";
    slack_status: "success" | "failed" | "skipped";
    destination_status: "success" | "failed" | "skipped";
    slack_thread_ts?: string | null;
  }
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("workflow_runs")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

// Updates a subset of delivery status fields — used by the retry paths, where
// only one operation is re-attempted and its result must not overwrite the
// already-settled status of the other operation.
export async function patchWorkflowRunDelivery(
  id: string,
  updates: Partial<{
    slack_status: "success" | "failed" | "skipped";
    destination_status: "success" | "failed" | "skipped";
    slack_thread_ts: string | null;
  }>
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("workflow_runs")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function listWorkflowRuns(): Promise<WorkflowRun[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
