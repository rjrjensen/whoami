import { env } from "cloudflare:workers";
import { requireAdmin } from "#lib/server/auth.ts";
import { listReports } from "#lib/server/reports.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  requireAdmin(event);
  const page = Math.max(0, Number(event.url.searchParams.get("page")) || 0);
  return { page, ...(await listReports(env.DB, page)) };
};
