<script lang="ts">
  import { scrollable } from "#lib/scrollable.ts";
  import { when } from "#lib/format.ts";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head><title>Reports · Admin</title></svelte:head>

<h1>Reports</h1>
<p class="muted">Every Fit Check run, newest first. Cached runs reused an earlier report of the same posting.</p>

{#if data.rows.length === 0}
  <p class="card">No reports yet. <a href="/add">Add a posting</a> to run the first one.</p>
{:else}
  <div class="table-wrap" use:scrollable>
    <table>
      <caption class="visually-hidden">Fit Check reports</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Role</th>
          <th scope="col" class="num">Score</th>
          <th scope="col">Cached</th>
          <th scope="col">Follow-up email</th>
        </tr>
      </thead>
      <tbody>
        {#each data.rows as r (r.id)}
          <tr>
            <td>{when(r.created_at)}</td>
            <td>
              <a href="/reports/{r.id}">{r.role_title ?? "Untitled role"}</a>
              {#if r.company}<br /><span class="muted">{r.company}</span>{/if}
              {#if r.source === "ryan"}<br /><span class="chip">Added by you</span>{/if}
            </td>
            <td class="num">{r.score}</td>
            <td>{r.cached ? "Yes" : "No"}</td>
            <td>{#if r.follow_up_email}<a href="mailto:{r.follow_up_email}">{r.follow_up_email}</a>{:else}<span class="muted">None</span>{/if}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <nav class="row" aria-label="More reports" style="margin-top: 1rem">
    {#if data.page > 0}<a class="button secondary" href="?page={data.page - 1}">Newer</a>{/if}
    {#if data.more}<a class="button secondary" href="?page={data.page + 1}">Older</a>{/if}
  </nav>
{/if}
