<script lang="ts">
  import { onMount } from "svelte";
  import { enhance } from "$app/forms";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const LABELS = {
    have: "I have this",
    close: "Something close I haven't listed",
    learning: "I'm learning it",
    dont_have: "I don't have it",
    not_pursuing: "Not for me",
  } as const;
  type Answer = keyof typeof LABELS;
  const ANSWERS = Object.keys(LABELS) as Answer[];
  const KINDS = [
    { kind: "job", label: "Jobs" },
    { kind: "project", label: "Projects" },
    { kind: "education", label: "Education" },
    { kind: "certificate", label: "Certificates" },
  ];

  // Without JS every field shows; with JS only the ones the picked answer needs.
  let js = $state(false);
  onMount(() => (js = true));
  let picked = $state<Record<string, string>>({});

  const evidenceTitle = $derived(new Map(data.evidence.map((e) => [e.id, e.title])));
  const errorsFor = (key: string) => (form && "errors" in form && form.skillKey === key ? form.errors : undefined);
  const valuesFor = (key: string) => (form && "values" in form && form.skillKey === key ? form.values : undefined);
  const OTHER = [
    { id: "testimonial", label: "A testimonial (say which in the note)" },
    { id: "self_taught", label: "Self-taught (say how in the note)" },
  ];
  const evidenceLabel = (ids: string[]) =>
    ids.length
      ? ids.map((id) => (id === "self_taught" ? "Self-taught" : id === "testimonial" ? "A testimonial" : (evidenceTitle.get(id) ?? id)).replace(/\.$/, "")).join("; ")
      : "No evidence linked";
  const day = (sqlTime: string) => sqlTime.slice(0, 10);
</script>

<svelte:head><title>Questions · Admin</title></svelte:head>

<h1>Skill questions</h1>
<p class="muted">Skills postings asked for that your record doesn't show yet. Must-haves come first.</p>

<div aria-live="polite" role="status">
  {#if form && "saved" in form}
    <p class="card">Saved. Reports recompute with your answer.</p>
  {/if}
</div>

{#snippet answerForm(prefix: string, skillKey: string, skill: string, current?: { answer: string; evidence_ids: string[]; close_to: string | null; note: string | null })}
  {@const errors = errorsFor(skillKey)}
  {@const values = valuesFor(skillKey)}
  {@const initial = values?.answer ?? current?.answer ?? ""}
  {@const choice = picked[prefix] ?? initial}
  {@const evidenceChecked = new Set(values?.evidence ?? current?.evidence_ids ?? [])}
  <form method="POST" action="?/answer" use:enhance class="stack">
    <input type="hidden" name="skill_key" value={skillKey} />
    {#if errors?.form}<p class="error-text" role="alert">{errors.form}</p>{/if}
    <fieldset aria-describedby={errors?.answer ? `${prefix}-answer-error` : undefined}>
      <legend>Your answer about {skill}</legend>
      {#each ANSWERS as a (a)}
        <label class="choice">
          <input type="radio" name="answer" value={a} checked={initial === a} required onchange={(e) => (picked[prefix] = e.currentTarget.value)} />
          {LABELS[a]}
        </label>
      {/each}
      {#if errors?.answer}<p id="{prefix}-answer-error" class="error-text" role="alert">{errors.answer}</p>{/if}
    </fieldset>

    {#if !js || choice === "have"}
      <fieldset
        class="evidence"
        aria-describedby={errors?.evidence ? `${prefix}-evidence-error` : undefined}
      >
        <legend>Where you used it <span class="hint">(for "I have this"; pick all that apply, optional for now)</span></legend>
        {#each KINDS as group (group.kind)}
          {@const items = data.evidence.filter((e) => e.kind === group.kind)}
          {#if items.length}
            <p class="evidence-group" aria-hidden="true">{group.label}</p>
            {#each items as e (e.id)}
              <label class="choice">
                <input type="checkbox" name="evidence" value={e.id} checked={evidenceChecked.has(e.id)} />
                <span>{e.title}{e.dates ? ` (${e.dates})` : ""}<span class="visually-hidden">, {group.label.toLowerCase()}</span></span>
              </label>
            {/each}
          {/if}
        {/each}
        <p class="evidence-group" aria-hidden="true">Other</p>
        {#each OTHER as o (o.id)}
          <label class="choice">
            <input type="checkbox" name="evidence" value={o.id} checked={evidenceChecked.has(o.id)} />
            {o.label}
          </label>
        {/each}
        {#if errors?.evidence}<p id="{prefix}-evidence-error" class="error-text" role="alert">{errors.evidence}</p>{/if}
      </fieldset>
    {/if}

    {#if !js || choice === "close"}
      <div>
        <label for="{prefix}-close">What you have instead <span class="hint">(for "Something close")</span></label>
        <input
          type="text"
          id="{prefix}-close"
          name="close_to"
          maxlength="120"
          value={values?.close_to ?? current?.close_to ?? ""}
          required={js && choice === "close"}
          aria-invalid={errors?.closeTo ? "true" : undefined}
          aria-describedby={errors?.closeTo ? `${prefix}-close-error` : undefined}
        />
        {#if errors?.closeTo}<p id="{prefix}-close-error" class="error-text" role="alert">{errors.closeTo}</p>{/if}
      </div>
    {/if}

    <div>
      <label for="{prefix}-note">Note <span class="hint">(optional; shown on reports as the reason for "I have this", "I'm learning it", and "Not for me")</span></label>
      <input
        type="text"
        id="{prefix}-note"
        name="note"
        maxlength="500"
        value={values?.note ?? current?.note ?? ""}
        aria-invalid={errors?.note ? "true" : undefined}
        aria-describedby={errors?.note ? `${prefix}-note-error` : undefined}
      />
      {#if errors?.note}<p id="{prefix}-note-error" class="error-text" role="alert">{errors.note}</p>{/if}
    </div>

    <button type="submit">Save answer</button>
  </form>
{/snippet}

<section aria-labelledby="open-heading">
  <h2 id="open-heading">Waiting for you ({data.open.length})</h2>
  {#if data.open.length === 0}
    <p class="card muted">Nothing to answer right now.</p>
  {:else}
    <ul class="stack" style="list-style: none; padding: 0; margin: 0">
      {#each data.open as q, i (q.skill_key)}
        <li class="card">
          <article aria-labelledby="q{i}-title">
            <div class="row">
              <h3 id="q{i}-title" style="margin: 0">{q.skill}</h3>
              <span class="chip {q.importance === 'must' ? 'must' : ''}">{q.importance === "must" ? "Must-have" : "Nice to have"}</span>
              <span class="chip">Asked {q.times_asked} {q.times_asked === 1 ? "time" : "times"}</span>
            </div>
            <p class="muted">"{q.example}"</p>
            {#if q.last_fit_check_id}
              <p><a href="/reports/{q.last_fit_check_id}">Latest report that asked <span class="visually-hidden">about {q.skill}</span></a></p>
            {/if}
            {@render answerForm(`q${i}`, q.skill_key, q.skill)}
          </article>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section aria-labelledby="answered-heading" style="margin-top: 2rem">
  <details>
    <summary><h2 id="answered-heading" style="display: inline">Answered ({data.answered.length})</h2></summary>
    {#if data.answered.length === 0}
      <p class="muted">No answers yet.</p>
    {:else}
      <ul class="stack" style="list-style: none; padding: 0; margin: 0.75rem 0 0">
        {#each data.answered as r, i (r.skill_key)}
          <li class="card">
            <div class="row">
              <h3 style="margin: 0">{r.skill}</h3>
              <span class="chip accent">{LABELS[r.answer as Answer] ?? r.answer}</span>
              {#if r.resume_status === "todo"}
                <a class="chip" href="/resume">{r.resume_pr ? `In pull request #${r.resume_pr}` : "Ready to add to the resume"}</a>
              {:else if r.resume_status === "done"}
                <span class="chip">On the resume</span>
              {/if}
            </div>
            <p class="muted">
              Answered {day(r.answered_at)}.
              {#if r.answer === "have"}{evidenceLabel(r.evidence_ids)}.{/if}
              {#if r.close_to}Instead: {r.close_to}.{/if}
              {#if r.note}Note: {r.note}{/if}
            </p>
            <details>
              <summary>Change answer <span class="visually-hidden">for {r.skill}</span></summary>
              {@render answerForm(`a${i}`, r.skill_key, r.skill, r)}
            </details>
          </li>
        {/each}
      </ul>
    {/if}
  </details>
</section>

<style>
  .evidence-group {
    margin: 0.75rem 0 0.25rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
  }
  .evidence .choice input {
    flex-shrink: 0;
  }
  summary {
    cursor: pointer;
    min-height: 44px;
    padding: 0.5rem 0;
  }
</style>
