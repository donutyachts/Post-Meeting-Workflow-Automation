export type DestinationType = "notion" | "sheets";

export type Project = {
  id: string;
  name: string;
  slack_channel_id: string;
  slack_channel_name: string;   // human-readable name, stored without # prefix, e.g. "brand-unification"
  destination_type: DestinationType;
  destination_id: string;
  destination_name: string;     // human-readable name, e.g. "Brand Unification DB"
  created_at: string;
  updated_at: string;
};

export type CreateProjectInput = Omit<Project, "id" | "created_at" | "updated_at">;

export type UpdateProjectInput = Partial<CreateProjectInput>;
