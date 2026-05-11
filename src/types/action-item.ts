export type ActionStatus = "Todo" | "Doing" | "Blocked" | "Done";
export type HighlightColor = "#7CF3A0" | "#FF6BD6" | "#FFE600" | "#5BD7FF";

export type ActionItem = {
  id: string;
  meeting: string;
  owner: string;
  action: string;
  due: string;
  status: ActionStatus;
  highlight?: HighlightColor | null;
};
