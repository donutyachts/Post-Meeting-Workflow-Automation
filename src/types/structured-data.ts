export type RecordCategory =
  | "Conclusions"
  | "Action items"
  | "Changes"
  | "Decisions"
  | "Things to know"
  | "Risks"
  | "Problems";

export const RECORD_CATEGORIES: RecordCategory[] = [
  "Conclusions",
  "Action items",
  "Changes",
  "Decisions",
  "Things to know",
  "Risks",
  "Problems",
];

export type StructuredDataRecord = {
  category: RecordCategory;
  description: string;
  owner: string | null;
  due_date: string | null;
  meeting_title: string;
  meeting_date: string;
};
