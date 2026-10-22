-- Alerts that can repeat, unlike milestones: when Claude last refused for lack of Anthropic credit, and when a
-- visitor's "Nudge" last pushed that to Ryan (at most once an hour). See claimNudge in src/db.ts.
CREATE TABLE alert_times (
  name TEXT PRIMARY KEY,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
