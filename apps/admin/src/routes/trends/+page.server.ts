import { env } from "cloudflare:workers";
import { requireAdmin } from "#lib/server/auth.ts";
import { loadTrends } from "#lib/server/trends.ts";
import type { Filters } from "#lib/trends.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  requireAdmin(event);
  const q = event.url.searchParams;
  const pick = (name: string) => q.get(name) || undefined;
  const source = pick("source");
  const filters: Filters = {
    industry: pick("industry"),
    roleType: pick("role"),
    seniority: pick("seniority"),
    source: source === "visitor" || source === "ryan" ? source : undefined,
    month: pick("month"),
  };
  return { filters, trends: await loadTrends(env.DB, filters) };
};
