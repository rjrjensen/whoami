<script lang="ts">
  import { scrollable } from "#lib/scrollable.ts";
  import { ROLE_TYPE_LABEL, STATUS_LABEL, when } from "#lib/format.ts";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const run = $derived(data.run);
  const report = $derived(run.report);
</script>

<svelte:head><title>{run.role_title ?? "Report"} · Admin</title></svelte:head>

<p><a href="/reports">← All reports</a></p>
<h1>{report.role.title}</h1>
<p class="muted">
  {report.role.company ?? "Company not stated"} · {ROLE_TYPE_LABEL[report.role.type] ?? report.role.type} · checked {when(run.created_at)}
</p>

<section class="card" aria-labelledby="summary">
  <h2 id="summary">Score {report.score}: {report.label}</h2>
  <p>{report.explanation}</p>
  <ul class="row" style="list-style: none; padding: 0; margin: 0">
    <li class="chip">Matcher: {report.matcher}</li>
    <li class="chip">Cached: {run.cached ? "yes" : "no"}</li>
    <li class="chip">Source: {run.source === "ryan" ? "added by you" : "visitor"}</li>
    <li class="chip">Extractor: {run.extractor ?? "none (cached)"}</li>
    {#if run.input_tokens != null}<li class="chip">Tokens: {run.input_tokens} in, {run.output_tokens} out</li>{/if}
    {#if run.repeats > 0}<li class="chip">Same posting run {run.repeats} other {run.repeats === 1 ? "time" : "times"}</li>{/if}
  </ul>
  <p style="margin-top: 0.75rem"><a href="https://ryanjensen.dev/fit-check?id={run.id}">Public report</a></p>
</section>

<section aria-labelledby="reqs">
  <h2 id="reqs">Requirements ({report.items.length})</h2>
  <div class="table-wrap" use:scrollable>
    <table>
      <caption class="visually-hidden">Each requirement and how Ryan's record covers it</caption>
      <thead>
        <tr><th scope="col">Requirement</th><th scope="col">Skill</th><th scope="col">Status</th><th scope="col">Why</th></tr>
      </thead>
      <tbody>
        {#each report.items as item, i (i)}
          <tr>
            <td>{item.requirement} <span class="chip" class:must={item.importance === "must"}>{item.importance === "must" ? "Must" : "Nice"}</span></td>
            <td>{item.skill}</td>
            <td>{STATUS_LABEL[item.status] ?? item.status}{item.inferred ? " (inferred)" : ""}</td>
            <td>
              {item.reason}
              {#if item.evidence.length}<br /><span class="muted">{item.evidence.map((e) => e.title).join("; ")}</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<section class="card" aria-labelledby="pasted" style="margin-top: 1rem">
  <h2 id="pasted">Exactly what was pasted</h2>
  {#if run.jd_text}
    <pre use:scrollable role="region" aria-labelledby="pasted">{run.jd_text}</pre>
  {:else}
    <p class="muted">Not saved for this run.</p>
  {/if}
</section>

<details class="card">
  <summary>report_json</summary>
  <pre use:scrollable role="region" aria-label="report_json">{JSON.stringify(report, null, 2)}</pre>
</details>
