-- One-time alerts already sent, e.g. "20 postings saved, time to label evals".
CREATE TABLE milestones (
  name TEXT PRIMARY KEY,
  reached_at TEXT NOT NULL DEFAULT (datetime('now'))
);
