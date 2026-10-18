<script lang="ts">
  import { enhance } from "$app/forms";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const errorFor = (id: number, action: string) => (form && "error" in form && form.id === id && form.action === action ? form.error : undefined);
  const SOURCES: Record<string, string> = { seed: "from the resume", code: "matched in code", jev: "matched by Jev", ryan: "set by you" };
</script>

<svelte:head><title>Skills · Admin</title></svelte:head>

<h1>Skill names</h1>
<p class="muted">
  Each skill has one display name. Every spelling a posting uses is saved as an alias, and trends count by skill. Rename a skill, or move an alias to another
  skill to merge or split them.
</p>

<form method="GET" class="card row" role="search">
  <div style="flex: 1 1 14rem">
    <label for="skill-search">Find a skill or alias</label>
    <input type="search" id="skill-search" name="q" value={data.q} />
  </div>
  <button type="submit" class="secondary" style="align-self: flex-end">Search</button>
</form>

<div aria-live="polite" role="status">
  {#if form && "done" in form}<p class="card">{form.done}</p>{/if}
</div>

<datalist id="skill-names">
  {#each data.names as name (name)}<option value={name}></option>{/each}
</datalist>

<p class="muted">{data.skills.length} {data.skills.length === 1 ? "skill" : "skills"}{data.q ? ` matching "${data.q}"` : ""}.</p>

<ul class="stack" style="list-style: none; padding: 0; margin: 0">
  {#each data.skills as s (s.id)}
    {@const renameError = errorFor(s.id, "rename")}
    {@const moveError = errorFor(s.id, "move")}
    <li class="card">
      <h2 style="margin-bottom: 0.25rem">{s.name}</h2>
      {#if s.aliases.length}
        <ul class="row" aria-label="Aliases of {s.name}" style="list-style: none; padding: 0; margin: 0 0 0.5rem">
          {#each s.aliases as a (a.alias)}
            <li class="chip" title={SOURCES[a.source] ?? a.source}>{a.alias}<span class="visually-hidden"> ({SOURCES[a.source] ?? a.source})</span></li>
          {/each}
        </ul>
      {:else}
        <p class="muted">No aliases.</p>
      {/if}

      <details open={!!renameError}>
        <summary>Rename <span class="visually-hidden">{s.name}</span></summary>
        <form method="POST" action="?/rename" use:enhance class="stack">
          <input type="hidden" name="id" value={s.id} />
          <div>
            <label for="rename-{s.id}">New display name</label>
            <input
              type="text"
              id="rename-{s.id}"
              name="name"
              value={s.name}
              maxlength="80"
              required
              aria-invalid={renameError ? "true" : undefined}
              aria-describedby={renameError ? `rename-${s.id}-error` : undefined}
            />
            {#if renameError}<p id="rename-{s.id}-error" class="error-text" role="alert">{renameError}</p>{/if}
          </div>
          <button type="submit">Rename</button>
        </form>
      </details>

      {#if s.aliases.length}
        <details open={!!moveError}>
          <summary>Move an alias <span class="visually-hidden">of {s.name}</span></summary>
          <form method="POST" action="?/move" use:enhance class="stack">
            <input type="hidden" name="id" value={s.id} />
            <div>
              <label for="alias-{s.id}">Alias</label>
              <select id="alias-{s.id}" name="alias" required>
                {#each s.aliases as a (a.alias)}<option value={a.alias}>{a.alias}</option>{/each}
              </select>
            </div>
            <div>
              <label for="to-{s.id}">Move to skill <span class="hint">(an existing name, or a new one)</span></label>
              <input
                type="text"
                id="to-{s.id}"
                name="to"
                list="skill-names"
                maxlength="80"
                required
                aria-invalid={moveError ? "true" : undefined}
                aria-describedby={moveError ? `to-${s.id}-error` : undefined}
              />
              {#if moveError}<p id="to-{s.id}-error" class="error-text" role="alert">{moveError}</p>{/if}
            </div>
            <button type="submit">Move alias</button>
          </form>
        </details>
      {/if}
    </li>
  {/each}
</ul>

<style>
  summary {
    cursor: pointer;
    min-height: 44px;
    padding: 0.5rem 0;
    color: var(--accent);
  }
  h2 {
    font-size: 1.1rem;
  }
</style>
