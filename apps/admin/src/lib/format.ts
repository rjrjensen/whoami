// Display helpers shared by pages.

/** D1 stores UTC as "YYYY-MM-DD HH:MM:SS". Shown in Central time, where Ryan lives. */
export const when = (sqlTime: string) =>
  new Date(`${sqlTime.replace(" ", "T")}Z`).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" });

export const STATUS_LABEL: Record<string, string> = {
  demonstrated: "Has it",
  transferable: "Related experience",
  learning: "Learning",
  unconfirmed: "Not on the resume yet",
  not_focus: "Not a focus",
};

export const ROLE_TYPE_LABEL: Record<string, string> = {
  engineering_manager: "Engineering manager",
  lead_engineer: "Lead engineer",
  individual_contributor: "Individual contributor",
  other: "Other",
};
