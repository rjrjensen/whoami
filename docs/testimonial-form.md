# Testimonial Form ("Vouch for Ryan")

Will live at `ryanjensen.dev/vouch` as a short, mobile-friendly form. Submissions go to the admin app for Ryan to approve. Nothing is published until he approves it **and** the submitter has consented.

## Questions

| # | Question | Type | Required | Shown publicly? |
| --- | --- | --- | --- | --- |
| 1 | Your name | text | yes | per consent (Q10) |
| 2 | Your current title and company | text | yes | per consent |
| 3 | How did you work with Ryan? | choice: his manager · peer · reported to him · mentored by him · client · he interviewed/hired me · other | yes | yes |
| 4 | Where and when? | choice from Ryan's jobs + year range | yes | yes |
| 5 | What did Ryan do that made the biggest difference to you or your team? | long text | yes | yes (may be excerpted) |
| 6 | Which of these would you vouch for? | checkboxes: his skill list + leadership traits + "other" | no | yes, as "vouched by N people" on each skill |
| 7 | In one or two sentences, how would you describe working with Ryan? | text, max 300 chars | no | yes (pull quote) |
| 8 | Is there anything Ryan could grow in? | long text | no | **never**: private, for Ryan only |
| 9 | Would you be willing to be a reference? If yes, best email | checkbox + email | no | **never**: private |
| 10 | How can Ryan use this? | choice: name + title · anonymized (e.g. "Senior Engineer, Hy-Vee") · private, for Ryan only | yes | — |
| 11 | LinkedIn profile URL (optional, lets visitors verify you) | url | no | per consent |

Takes about 3–5 minutes. Has a progress indicator, autosaves a draft in the browser, and is fully keyboard and screen-reader accessible.

## How submissions are used

- **Testimonials section:** approved quotes (Q5/Q7) with attribution per Q10.
- **Skills with evidence:** Q6 adds "vouched by" counts to skills, a third kind of evidence next to jobs and projects.
- **Fit Check:** an approved testimonial can be cited as evidence for a requirement (e.g. "mentoring" → quote from a former intern).
- **Private:** Q8 and Q9 are only ever shown in the admin app.

## Importing existing feedback (Small Improvements)

Praise in Small Improvements was given inside the company and wasn't written for a public site. Before using any of it publicly:

1. Export or copy the entries into `data/testimonials.yaml` with `consent: pending`.
2. Send each person the vouch form link (or a short message asking to quote them). Their answer sets the consent level.
3. Until then, the entries can still feed **private** use: skill evidence counts and memory-jogging for Fit Check gaps. Their text and names are never shown publicly.

## Message to send to peers (draft)

> Hi [name], I'm building a personal site to showcase my work, and I'd love a short note from you about working together at [company]. It takes about 3 minutes: ryanjensen.dev/vouch. You choose whether your name is shown, anonymized, or kept private. Thank you!
