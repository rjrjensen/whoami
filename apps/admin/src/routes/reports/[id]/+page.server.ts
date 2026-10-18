import { env } from "cloudflare:workers";
import { error } from "@sveltejs/kit";
import { requireAdmin } from "#lib/server/auth.ts";
import { getRun } from "#lib/server/reports.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  requireAdmin(event);
  const run = await getRun(env.DB, event.params.id);
  if (!run) error(404, "No report with that id.");
  return { run };
};
