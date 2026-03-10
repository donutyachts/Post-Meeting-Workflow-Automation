import { createServerSupabaseClient } from "../server";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from "@/types/project";

export async function listProjects(): Promise<Project[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    // PGRST116 = no rows returned by .single()
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function createProject(
  input: CreateProjectInput
): Promise<Project> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput
): Promise<Project | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

// Returns true if a row was deleted, false if the id was not found.
export async function deleteProject(id: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { error, count } = await supabase
    .from("projects")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}
