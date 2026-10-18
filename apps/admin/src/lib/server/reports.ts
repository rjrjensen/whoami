// Saved Fit Check runs, newest first, and one run in full: its report and exactly what was pasted.
import type { FitReport } from "@ryanjensen/fit-check/report";

export type ReportRow = {
  id: string;
  created_at: string;
  role_title: string | null;
  company: string | null;
  score: number;
  cached: number;
  source: "visitor" | "ryan";
  /** The visitor's optional follow-up email, once the report carries one (not in v1). */
  follow_up_email: string | null;
};

export const PAGE_SIZE = 50;

export async function listReports(db: D1Database, page = 0): Promise<{ rows: ReportRow[]; more: boolean }> {
  const { results } = await db
    .prepare(
      `SELECT id, created_at, role_title, company, score, cached, source, json_extract(report_json, '$.followUpEmail') AS follow_up_email
       FROM fit_checks ORDER BY created_at DESC, id LIMIT ? OFFSET ?`,
    )
    .bind(PAGE_SIZE + 1, page * PAGE_SIZE)
    .all<ReportRow>();
  return { rows: results.slice(0, PAGE_SIZE), more: results.length > PAGE_SIZE };
}

export type SavedRun = Omit<ReportRow, "follow_up_email"> & {
  jd_hash: string;
  jd_text: string | null;
  extractor: string | null;
  matcher: string;
  input_tokens: number | null;
  output_tokens: number | null;
  report: FitReport;
  /** Other runs of the same posting (repeats and cache hits). */
  repeats: number;
};

export async function getRun(db: D1Database, id: string): Promise<SavedRun | null> {
  const row = await db
    .prepare(
      `SELECT id, created_at, jd_hash, jd_text, role_title, company, score, cached, source, extractor, matcher, input_tokens, output_tokens, report_json,
         (SELECT COUNT(*) - 1 FROM fit_checks f WHERE f.jd_hash = fit_checks.jd_hash) AS repeats
       FROM fit_checks WHERE id = ?`,
    )
    .bind(id)
    .first<Omit<SavedRun, "report"> & { report_json: string }>();
  if (!row) return null;
  const { report_json, ...rest } = row;
  return { ...rest, report: JSON.parse(report_json) as FitReport };
}
