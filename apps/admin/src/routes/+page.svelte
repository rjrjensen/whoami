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
  const evidenceLabel = (kind: string | null, id: string | null) =>
    id ? (evidenceTitle.get(id) ?? id) : kind === "self_taught" ? "Self-taught" : kind === "testimonial" ? "A testimonial" : "No evidence linked";
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

{#snippet answerForm(prefix: string, skillKey: string, skill: string, current?: { answer: string; evidence_kind: string | null; evidence_id: string | null; close_to: string | null; note: string | null })}
  {@const errors = errorsFor(skillKey)}
  {@const values = valuesFor(skillKey)}
  {@const initial = values?.answer ?? current?.answer ?? ""}
  {@const choice = picked[prefix] ?? initial}
  {@const evidenceValue = values?.evidence ?? current?.evidence_id ?? (current?.evidence_kind === "self_taught" || current?.evidence_kind === "testimonial" ? current.evidence_kind : "")}
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
      <div>
        <label for="{prefix}-evidence">Where you used it <span class="hint">(for "I have this"; optional for now)</span></label>
        <select
          id="{prefix}-evidence"
          name="evidence"
          aria-invalid={errors?.evidence ? "true" : undefined}
          aria-describedby={errors?.evidence ? `${prefix}-evidence-error` : undefined}
        >
          <option value="" selected={evidenceValue === ""}>None yet</option>
          {#each KINDS as group (group.kind)}
            {@const items = data.evidence.filter((e) => e.kind === group.kind)}
            {#if items.length}
              <optgroup label={group.label}>
                {#each items as e (e.id)}
                  <option value={e.id} selected={evidenceValue === e.id}>{e.title}{e.dates ? ` (${e.dates})` : ""}</option>
                {/each}
              </optgroup>
            {/if}
          {/each}
          <optgroup label="Other">
            <option value="testimonial" selected={evidenceValue === "testimonial"}>A testimonial (say which in the note)</option>
            <option value="self_taught" selected={evidenceValue === "self_taught"}>Self-taught (say how in the note)</option>
          </optgroup>
        </select>
        {#if errors?.evidence}<p id="{prefix}-evidence-error" class="error-text" role="alert">{errors.evidence}</p>{/if}
      </div>
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
                <span class="chip">TODO: will be added to resume.yaml (not built yet)</span>
              {/if}
            </div>
            <p class="muted">
              Answered {day(r.answered_at)}.
              {#if r.answer === "have"}{evidenceLabel(r.evidence_kind, r.evidence_id)}.{/if}
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
  summary {
    cursor: pointer;
    min-height: 44px;
    padding: 0.5rem 0;
  }
</style>
