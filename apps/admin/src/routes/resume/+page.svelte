<script lang="ts">
  import { enhance } from "$app/forms";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const queued = $derived(data.rows.filter((r) => r.resume_pr === null));
  const inPr = $derived(Object.entries(Object.groupBy(data.rows.filter((r) => r.resume_pr !== null), (r) => String(r.resume_pr))));
  const why = (r: (typeof data.rows)[number]) => (r.answer === "close" ? `Something close to ${r.skill}` : "I have this");
</script>

<svelte:head><title>Resume · Admin</title></svelte:head>

<h1>Resume additions</h1>
<p class="muted">
  Skills you confirmed, waiting to go into <code>data/resume.yaml</code>. Check the ones to send, give each a group, and send them as one pull request; they go live when you merge it.
  Each job you named as evidence also gets the skill in its technologies.
</p>

<div aria-live="polite" role="status">
  {#if form && "opened" in form && form.opened}
    <p class="card">
      Opened <a href={form.opened.url}>pull request #{form.opened.number}</a>.
      {#each form.opened.outcomes as o (o.skill)}<br />{o.skill}: {o.changes.join("; ")}.{/each}
    </p>
  {:else if form && "skipped" in form}
    <p class="card">{form.skipped} won't be added.</p>
  {/if}
</div>
{#if form && "error" in form}<p class="error-text" role="alert">{form.error}</p>{/if}
{#if data.syncError}<p class="error-text" role="alert">{data.syncError}</p>{/if}
{#if !data.connected}
  <p class="card">Sending needs <code>GITHUB_REPO_TOKEN</code> on the admin Worker. The steps are in <code>docs/todo.md</code> → Admin app.</p>
{/if}

<section aria-labelledby="queued-heading">
  <h2 id="queued-heading">Ready to send ({queued.length})</h2>
  {#if queued.length === 0}
    <p class="card muted">Nothing waiting. Answer "I have this" or "Something close" on the Questions page to add skills here.</p>
  {:else}
    <form id="send" method="POST" action="?/send" use:enhance></form>
    <ul class="stack" style="list-style: none; padding: 0; margin: 0">
      {#each queued as r (r.skill_key)}
        <li class="card stack">
          <div class="row">
            <label class="choice" style="margin: 0">
              <input type="checkbox" name="send" value={r.skill_key} form="send" checked />
              <span><strong>{r.skill}</strong> <span class="visually-hidden">: send</span></span>
            </label>
            <span class="chip accent">{why(r)}</span>
          </div>
          <p class="muted">
            Answered {r.answered_at.slice(0, 10)}. {r.evidence.length ? `Evidence: ${r.evidence.map((e) => e.replace(/\.$/, "")).join("; ")}.` : "No evidence linked."}
            {#if r.note}Note: {r.note}{/if}
          </p>
          <div>
            <label for="name-{r.skill_key}">Name on the resume</label>
            <input type="text" id="name-{r.skill_key}" name="name-{r.skill_key}" form="send" maxlength="120" value={r.name} />
          </div>
          <div>
            <label for="group-{r.skill_key}">Skills group</label>
            <select id="group-{r.skill_key}" name="group-{r.skill_key}" form="send">
              <option value="" selected>Pick a group</option>
              {#each data.groups as g (g)}<option value={g}>{g}</option>{/each}
            </select>
          </div>
          <form method="POST" action="?/skip" use:enhance>
            <input type="hidden" name="skill_key" value={r.skill_key} />
            <input type="hidden" name="skill" value={r.skill} />
            <button type="submit" class="secondary">Don't add <span class="visually-hidden">{r.skill}</span></button>
          </form>
        </li>
      {/each}
    </ul>
    <p><button type="submit" form="send" disabled={!data.connected}>Open pull request</button></p>
  {/if}
</section>

{#if inPr.length}
  <section aria-labelledby="pr-heading" style="margin-top: 2rem">
    <h2 id="pr-heading">In a pull request</h2>
    <ul class="stack" style="list-style: none; padding: 0; margin: 0">
      {#each inPr as [number, rows] (number)}
        <li class="card">
          <a href="https://github.com/rjrjensen/whoami/pull/{number}">Pull request #{number}</a>:
          {rows?.map((r) => r.name).join(", ")}
        </li>
      {/each}
    </ul>
  </section>
{/if}
