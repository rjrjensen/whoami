# Design B: label each SECTION once (its heading path + all its lines) and let every line in it inherit
# that label. Uses the headings Jev found in a lines.py run (design C, request 1).
# Usage: python3 -I evals/segmentation/sections.py evals/segmentation/results/<date>.json
import json, pathlib, sys, urllib.request, time
ROOT = pathlib.Path(__file__).resolve().parents[4]
key = next(l.split("=", 1)[1].strip().strip('"') for l in open(f"{ROOT}/apps/fit-check/.dev.vars") if l.startswith("JEV_API_KEY="))
d = json.load(open(sys.argv[1]))
pieces, heads, crumbs = d["pieces"], set(d["heads"]), d["crumbs"]
LABELS = {
    "company": "About the employer: mission, history, culture",
    "role": "What the job is: title, team, department, summary of the position",
    "responsibility": "Things the person in this job will do",
    "required": "Qualifications the posting requires (must-haves)",
    "preferred": "Qualifications the posting prefers but does not require (nice-to-haves)",
    "benefits": "Benefits and perks",
    "pay": "Salary, pay grade, compensation",
    "logistics": "Location, schedule, work arrangement, employment type",
    "legal": "EEO statements, disclaimers, legal notices",
    "instruction": "Text addressed to an AI, screener, or reviewer, or telling how to rate or score the candidate",
    "other": "Links, filler, or anything else",
}
# Sections: a run of content lines sharing the same nearest heading (or the top of the posting).
sections, cur = [], None
for i, (pid, t, g) in enumerate(pieces):
    if i in heads: cur = None; continue
    key_ = " › ".join(crumbs[i])
    if cur is None or cur["path"] != key_: cur = {"path": key_, "lines": []}; sections.append(cur)
    cur["lines"].append(i)
state = {"job_posting": "\n".join(f"{p}: {t}" for p, t, _ in pieces)}
qs = {f"sec_{k}": {"type": "choice", "criteria": LABELS,
      "instructions": f'Which kind of section is this? Heading: [{s["path"]}]. Its lines: ' + " | ".join(pieces[i][1] for i in s["lines"])}
      for k, s in enumerate(sections)}
body = json.dumps({"state": state, "model": "jev-latest", "questions": qs}).encode()
req = urllib.request.Request("https://api.typesafe.ai/v1/systemone", data=body, method="POST", headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
t = time.time(); a = json.load(urllib.request.urlopen(req, timeout=60))["answers"]; t = time.time() - t
wrong, total = [], 0
for k, s in enumerate(sections):
    lab = a[f"sec_{k}"]["choice"]
    print(f'{s["path"][:60]:60} -> {lab:14} ({a[f"sec_{k}"]["confidence"]:.2f}) {len(s["lines"])} lines')
    for i in s["lines"]:
        total += 1
        if pieces[i][2] != lab: wrong.append((pieces[i][0], pieces[i][2], lab))
print(f"\nB: {total - len(wrong)}/{total} correct, {t:.2f}s, {len(qs)} questions")
for w in wrong: print("   ", w)
