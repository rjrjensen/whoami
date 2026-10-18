// Questions: skills the record couldn't confirm, for Ryan to answer.
import { env } from "cloudflare:workers";
import { fail } from "@sveltejs/kit";
import { requireAdmin } from "#lib/server/auth.ts";
import { answered, EVIDENCE, openQuestions, parseAnswer, saveAnswer, type AnswerErrors } from "#lib/server/questions.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  requireAdmin(event);
  const db = env.DB;
  const [open, done] = await Promise.all([openQuestions(db), answered(db)]);
  return { open, answered: done, evidence: EVIDENCE.map((e) => ({ id: e.id, kind: e.kind, title: e.title, dates: e.dates })) };
};

export const actions: Actions = {
  answer: async (event) => {
    requireAdmin(event);
    const form = await event.request.formData();
    const skillKey = String(form.get("skill_key") ?? "");
    const values = Object.fromEntries([...form].map(([k, v]) => [k, String(v)]));
    const parsed = parseAnswer(form);
    if (!parsed.ok) return fail(400, { skillKey, errors: parsed.errors, values });
    if (!(await saveAnswer(env.DB, parsed.value))) {
      const errors: AnswerErrors = { form: "That question no longer exists. Reload the page." };
      return fail(404, { skillKey, errors, values });
    }
    return { saved: skillKey };
  },
};
