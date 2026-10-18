// Ryan's own postings: the same check as the public box, through fit-check's Admin RPC. Saved as source = 'ryan', no pushes.
import { env } from "cloudflare:workers";
import { fail, redirect } from "@sveltejs/kit";
import { requireAdmin } from "#lib/server/auth.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = (event) => {
  requireAdmin(event);
};

export const actions: Actions = {
  default: async (event) => {
    requireAdmin(event);
    const text = (await event.request.formData()).get("posting");
    if (typeof text !== "string" || !text.trim()) return fail(400, { text: "", message: "Paste the job description first." });
    let result;
    try {
      result = await env.FIT_CHECK.checkFromAdmin(text);
    } catch (err) {
      console.error("checkFromAdmin failed:", err);
      return fail(502, { text, message: "Couldn't reach Fit Check. Try again in a minute." });
    }
    if ("error" in result) return fail(result.error === "upstream" ? 502 : 400, { text, message: result.message });
    redirect(303, `/reports/${result.report.id}`);
  },
};
