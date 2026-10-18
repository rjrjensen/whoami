-- Fit Check v1. See docs/fit-check.md.

-- Every check, including cache hits (cached = 1, which don't count toward the monthly cap).
CREATE TABLE fit_checks (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  jd_hash TEXT NOT NULL,
  jd_text TEXT, -- exactly what the visitor pasted, for tuning; kept permanently
  role_title TEXT,
  company TEXT,
  score INTEGER NOT NULL,
  report_json TEXT NOT NULL,
  extractor TEXT,
  matcher TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cached INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT NOT NULL
);
CREATE INDEX fit_checks_jd_hash ON fit_checks (jd_hash, created_at);
CREATE INDEX fit_checks_created_at ON fit_checks (created_at);

-- The skill registry: Ryan's own answers, which override the matcher.
CREATE TABLE skill_answers (
  skill_key TEXT PRIMARY KEY, -- lowercased skill name
  skill TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('have', 'learning', 'not_pursuing')),
  evidence_id TEXT, -- an id from apps/fit-check/src/record.json, e.g. job-hy-vee-inc
  note TEXT, -- shown to visitors as the reason
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Requirements the record couldn't confirm, for Ryan to answer (admin app, Phase 5).
CREATE TABLE skill_questions (
  skill_key TEXT PRIMARY KEY,
  skill TEXT NOT NULL,
  example TEXT NOT NULL, -- the first requirement text that raised it
  importance TEXT NOT NULL CHECK (importance IN ('must', 'nice')),
  times_asked INTEGER NOT NULL DEFAULT 1,
  first_asked_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_asked_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_fit_check_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered'))
);
