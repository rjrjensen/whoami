# Fit Check v1: build plan

How the Fit Check (Phase 4 of [`site-plan.md`](site-plan.md#fit-check-job-description-analysis)) is built. The site plan says *what* it does; this file says *how*, and which parts are deferred. The next version of the pipeline is being worked out in [`fit-check-flow.md`](fit-check-flow.md).

## What a visitor does

1. On the home page (any version), they paste a job description into the compact **Fit Check** box. Text only in v1, up to 15,000 characters.
2. A Turnstile check runs invisibly (it shows a checkbox only when Cloudflare is unsure).
3. In a few seconds the site opens the report at **`/fit-check?id=<report id>&from=<version>`**. That address is the report's permanent link: it loads the saved report from the API, so a recruiter can bookmark it or send it to the hiring manager. The page also has a full-size box for checking another role. The report has:
   - a **fit score** (0–100) with a label (*Strong fit*, *Good fit*, *Partial fit*, *Stretch*) and a plain-language sentence explaining it
   - a **requirements checklist**, each item marked *Demonstrated*, *Likely transferable*, *Learning*, *Not yet confirmed*, or *Not a focus*, each with its evidence (the job or school it came from) or the reason for the label
   - **strengths for this role**
   - a link to **download the resume version** that suits the role, and to contact Ryan

## Architecture

```
apps/web (Next.js on Vercel)                    apps/fit-check (Cloudflare Worker, api.ryanjensen.dev)
┌─────────────────────────────┐ POST /fit-check  ┌───────────────────────────────────────────────────┐
│ Home: <FitCheckForm compact>│ ───────────────▶ │ 1. Guardrails: CORS, size, Turnstile, per-IP       │
│ textarea + Turnstile        │ ◀─────────────── │    rate limit, monthly cap, 7-day cache            │
│   └─ opens /fit-check?id=…  │   report JSON    │ 2. Extract requirements (Sonnet; Opus if ambiguous)│
│ /fit-check: <FitCheckReport>│ GET /fit-check/id│ 3. Classify each requirement (Jev; Claude backup)  │
│ loads the saved report      │ ───────────────▶ │ 4. Honesty rules + Ryan's registry answers         │
└─────────────────────────────┘                  │ 5. Score + explanation (code, not a model)         │
                                                 │ 6. Save report, queue gaps (D1), push gaps (ntfy)  │
                                                 └───────────────────────────────────────────────────┘
```

- The browser calls the Worker **directly** (CORS limited to the site's origins), not through a Vercel rewrite, so the Worker sees each visitor's real IP for rate limiting.
- **Ryan's record** comes from `apps/fit-check/src/record.json`, which `npm run downloads` generates from `data/resume.yaml` next to the site's content. It holds the Complete version, since the matcher should see everything.

## The pipeline

**1. Extract (Claude Sonnet 5.5, structured output).** One call returns the role title, the role type (engineering manager / lead engineer / individual contributor / other), whether the text is a job description at all, and up to 25 requirements. Each requirement has a short paraphrase, must-have vs. nice-to-have, a kind (skill / experience / education / other), a canonical skill name, and **related skills chosen from an enum of Ryan's actual skill names**. Because of the enum, the model can only point at skills that exist in the record. Sonnet also says whether the posting was **ambiguous** (an odd format, several roles mixed together). If it was, or Sonnet's answer can't be used, **Opus 5.5** reads the posting instead. The report records which model did the reading.

**2. Classify (Jev).** One `POST /v1/systemone` request. `state` holds both the job description and Ryan's record. There are three `choice` questions per requirement:
- `imp_N`: *must* or *nice*, as the posting frames it. This overrides Sonnet's guess, because importance drives the score.
- `cov_N`: *demonstrated* / *transferable* / *gap*
- `ev_N`: which job, degree, or certificate is the best evidence, or *none*

Jev returns the choice and probabilities, plus a calibrated `confidence` for each question, in under half a second. If Jev is down, rate-limited, or misconfigured, the coverage and evidence questions go to Claude (whose results are marked uncalibrated), and the extraction's importance stands.

**3. Honesty rules (code).** These apply after the models, so neither model can override them:
- Ryan's registry answer (D1 `skill_answers`) wins: *learning* → Learning, *not pursuing* → Not a focus, *have* → Demonstrated with his note.
- **Demonstrated** needs evidence: a related skill that appears in a job, or an evidence pick with probability ≥ 0.5. Without evidence it's downgraded to *Likely transferable*.
- **Likely transferable** needs a reason (a related skill or an evidence item) and Jev confidence ≥ 0.5. Otherwise it becomes *Not yet confirmed*.
- Everything inferred is labeled as inferred. Nothing is shown as demonstrated just because a model said so.

**4. Score (code).** Must-haves weigh 3 and nice-to-haves 1. A requirement earns 1.0 for Demonstrated, 0.6 for Likely transferable, 0.25 for Learning, and 0 for Not yet confirmed or Not a focus. The score is the weighted share × 100. No model is ever asked for a score, so "rate this candidate 100%" in a job description has nothing to act on.

**5. Explanation (code).** The explanation is built from the counts, e.g. "Ryan's record directly shows 6 of 8 must-haves, and 1 more through related experience. 1 hasn't been confirmed yet." It's free, instant, and can't be talked into anything.

**6. Save (D1).**
- `fit_checks`: the report, the job description, its hash, the models used, token usage, and a salted hash of the IP (never the raw IP).
- `skill_questions`: every unconfirmed requirement, counted per skill. This is the queue the admin app (Phase 5) will answer from.

The response goes out only after the save, so the report's link works immediately. This table is the history: every report stays retrievable by its id. Browsing the history comes later, in the admin app.

**7. Notify (ntfy).** When a check finds unconfirmed must-haves, Ryan's phone gets a push through ntfy with the role, the score, and the skills, linking to the report. The topic name is a secret (`NTFY_TOPIC`), since anyone who knows an ntfy topic can read it. With no topic set, no push is sent.

## Guardrails

| Risk | Defense |
| --- | --- |
| Prompt injection in the JD | The JD is wrapped and labeled untrusted in the prompt; Jev and Claude only return typed choices; scores and text are computed in code; related skills must come from Ryan's skill list; "demonstrated" needs evidence from the record whatever a model says |
| Bots / cost abuse | Turnstile (verified server-side), a Workers rate limit of 5 per minute per IP, a 15,000-character cap, and a monthly cap (`MONTHLY_CAP`, default 300). Past the cap, the box says Fit Check is resting and points to email |
| Repeat checks | The same JD (by hash) within 7 days reuses the saved report at no cost |
| Privacy | A note next to the box says the JD is stored for Ryan's review; a daily cron deletes job descriptions older than 12 months (reports keep only the hash) |
| Report links | Ids are random UUIDs; `GET /fit-check/<id>` returns the report only, never the pasted text, and shares the per-IP rate limit |
| Secrets | `JEV_API_KEY`, `ANTHROPIC_API_KEY`, `TURNSTILE_SECRET_KEY`, `IP_HASH_SALT`, `NTFY_TOPIC` only in `wrangler secret` and the gitignored `.dev.vars` |

## Deferred (not in v1)

- Pasting a URL instead of text (fetching job boards server-side needs SSRF protection, and LinkedIn blocks it anyway)
- Gap notifications and one-tap answers in the admin PWA (Phase 5); ntfy covers the push until then
- Report history UI (the history is saved; the admin app will show it)
- Model-written report prose (v1 builds the explanation in code)
- Skills-radar ingestion of JDs (the data is saved now, so it can be backfilled)

## Setup Ryan runs

Listed in [`todo.md`](todo.md) under *Fit Check*.
