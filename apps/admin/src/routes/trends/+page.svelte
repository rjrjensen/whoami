<script lang="ts">
  import { scrollable } from "#lib/scrollable.ts";
  import { pct, pts, STATUS_LABEL, type SkillStatus } from "#lib/trends.ts";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const t = $derived(data.trends);
  const f = $derived(data.filters);

  const ROLE_LABEL: Record<string, string> = {
    engineering_manager: "Engineering manager",
    lead_engineer: "Lead engineer",
    individual_contributor: "Individual contributor",
    other: "Other",
  };
  const SOURCE_LABEL: Record<string, string> = { visitor: "Site visitors", ryan: "Added by Ryan" };
  const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  const TOP = 15;
  const chart = $derived(t.snapshot.slice(0, TOP));
  const table = $derived(t.skills.slice(0, 25));
  const hasFilters = $derived(t.options.industries.length > 0 || t.options.roleTypes.length > 1 || t.options.seniorities.length > 0 || t.options.sources.length > 1 || t.months.length > 1);
</script>

{#snippet status(s: SkillStatus)}
  <span class="chip" class:gap={s === "gap"}>{#if s === "gap"}<span aria-hidden="true">▲ </span>{/if}{STATUS_LABEL[s]}</span>
{/snippet}

<svelte:head><title>Trends · Admin</title></svelte:head>

<h1>Trends</h1>
<p class="muted">Which skills postings ask for, by month. Each posting counts once, in the month it was first pasted.</p>

{#if t.postings === 0 && !f.industry && !f.roleType && !f.seniority && !f.source}
  <section class="card">
    <h2>No postings yet</h2>
    <p>Trends start once job descriptions are checked on the site or added with <a href="/add">Add posting</a>.</p>
  </section>
{:else}
  {#if hasFilters}
    <form method="get" class="card filters" aria-labelledby="filters-title">
      <h2 id="filters-title" class="visually-hidden">Filters</h2>
      {#if t.months.length > 1}
        <div>
          <label for="f-month">Month</label>
          <select id="f-month" name="month" value={t.month ?? ""}>
            {#each t.months as m (m)}<option value={m}>{monthLabel(m)} (n = {t.monthN[m]})</option>{/each}
          </select>
        </div>
      {/if}
      {#if t.options.roleTypes.length > 1}
        <div>
          <label for="f-role">Role type</label>
          <select id="f-role" name="role" value={f.roleType ?? ""}>
            <option value="">All</option>
            {#each t.options.roleTypes as r (r)}<option value={r}>{ROLE_LABEL[r] ?? r}</option>{/each}
          </select>
        </div>
      {/if}
      {#if t.options.industries.length}
        <div>
          <label for="f-industry">Industry</label>
          <select id="f-industry" name="industry" value={f.industry ?? ""}>
            <option value="">All</option>
            {#each t.options.industries as i (i)}<option value={i}>{i}</option>{/each}
          </select>
        </div>
      {/if}
      {#if t.options.seniorities.length}
        <div>
          <label for="f-seniority">Seniority</label>
          <select id="f-seniority" name="seniority" value={f.seniority ?? ""}>
            <option value="">All</option>
            {#each t.options.seniorities as s (s)}<option value={s}>{s}</option>{/each}
          </select>
        </div>
      {/if}
      {#if t.options.sources.length > 1}
        <div>
          <label for="f-source">Source</label>
          <select id="f-source" name="source" value={f.source ?? ""}>
            <option value="">All</option>
            {#each t.options.sources as s (s)}<option value={s}>{SOURCE_LABEL[s] ?? s}</option>{/each}
          </select>
        </div>
      {/if}
      <div class="row">
        <button type="submit">Apply</button>
        <a href="/trends">Clear</a>
      </div>
    </form>
  {/if}

  {#if t.postings === 0 || !t.month}
    <section class="card"><p>No postings match these filters. <a href="/trends">Clear filters</a></p></section>
  {:else}
    <p><strong>{t.postings}</strong> postings across {t.months.length} {t.months.length === 1 ? "month" : "months"}.</p>

    <section class="card" aria-labelledby="snapshot-title">
      <h2 id="snapshot-title">Most asked for in {monthLabel(t.month)} <span class="muted">(n = {t.monthN[t.month]})</span></h2>
      <p class="legend muted">
        <span class="swatch must" aria-hidden="true"></span> Must-have
        <span class="swatch nice" aria-hidden="true"></span> Nice-to-have (striped)
      </p>
      <ul class="bars">
        {#each chart as r (r.id)}
          <li>
            <div class="bar-label">
              <span class="name">{r.name}</span>
              {@render status(r.status)}
            </div>
            <div class="track" aria-hidden="true">
              <span class="seg must" style:width={pct(r.mustShare)}></span><span class="seg nice" style:width={pct(r.niceShare)}></span>
            </div>
            <div class="bar-text">{pct(r.share)} of postings: {r.must} must, {r.nice} nice</div>
          </li>
        {/each}
      </ul>
      <details>
        <summary>Show as a table</summary>
        <div class="table-wrap" use:scrollable>
          <table>
            <caption>Skills asked for in {monthLabel(t.month)}, n = {t.monthN[t.month]} postings</caption>
            <thead><tr><th scope="col">Skill</th><th scope="col">Ryan</th><th scope="col" class="num">Share</th><th scope="col" class="num">Must</th><th scope="col" class="num">Nice</th></tr></thead>
            <tbody>
              {#each t.snapshot as r (r.id)}
                <tr><th scope="row">{r.name}</th><td>{STATUS_LABEL[r.status]}</td><td class="num">{pct(r.share)}</td><td class="num">{r.must}</td><td class="num">{r.nice}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
    </section>

    <section class="card" aria-labelledby="gaps-title">
      <h2 id="gaps-title"><span aria-hidden="true">▲</span> Top gaps in {monthLabel(t.month)}</h2>
      {#if t.gaps.length}
        <p class="muted">In-demand skills Ryan doesn't have yet, most asked for first.</p>
        <ol class="gaps">
          {#each t.gaps.slice(0, 10) as g (g.id)}
            <li><strong>{g.name}</strong>: {pct(g.share)} of postings ({g.must} must, {g.nice} nice)</li>
          {/each}
        </ol>
      {:else}
        <p>No gaps among this month's skills.</p>
      {/if}
    </section>

    <section class="card" aria-labelledby="change-title">
      <h2 id="change-title">Rising and falling</h2>
      {#if t.baseline.n === 0}
        <p>No postings in the {t.baseline.months.length} months before {monthLabel(t.month)} to compare against.</p>
      {:else}
        <p class="muted">
          {monthLabel(t.month)} (n = {t.monthN[t.month]}) compared with {monthLabel(t.baseline.months[0])}–{monthLabel(t.baseline.months.at(-1)!)} (n = {t.baseline.n}). Small n means a small sample.
        </p>
        {#each [{ title: "Rising", list: t.rising }, { title: "Falling", list: t.falling }] as group (group.title)}
          <div class="table-wrap" use:scrollable>
            <table>
              <caption>{group.title}</caption>
              <thead>
                <tr><th scope="col">Skill</th><th scope="col">Ryan</th><th scope="col" class="num">Now</th><th scope="col" class="num">Before</th><th scope="col" class="num">Change</th><th scope="col" class="num">n now / before</th></tr>
              </thead>
              <tbody>
                {#each group.list.slice(0, 10) as c (c.id)}
                  <tr>
                    <th scope="row">{c.name}</th>
                    <td>{STATUS_LABEL[c.status]}</td>
                    <td class="num">{pct(c.share)}</td>
                    <td class="num">{pct(c.baselineShare)}</td>
                    <td class="num">{pts(c.delta)}</td>
                    <td class="num">{t.monthN[t.month]} / {t.baseline.n}</td>
                  </tr>
                {:else}
                  <tr><td colspan="6">None.</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/each}
      {/if}
    </section>

    <section class="card" aria-labelledby="months-title">
      <h2 id="months-title">By month</h2>
      <p class="muted">Share of postings asking for each skill, with must-have and nice-to-have counts. The {table.length} most asked-for skills overall.</p>
      <div class="table-wrap" use:scrollable>
        <table>
          <caption>Skills by month</caption>
          <thead>
            <tr>
              <th scope="col">Skill</th>
              <th scope="col">Ryan</th>
              {#each t.months as m (m)}<th scope="col" class="num">{monthLabel(m)}<br /><span class="muted">n = {t.monthN[m]}</span></th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each table as s (s.id)}
              <tr>
                <th scope="row">{s.name}</th>
                <td>{STATUS_LABEL[s.status]}</td>
                {#each t.months as m (m)}
                  {@const c = s.byMonth[m]}
                  <td class="num">{#if c}{pct((c.must + c.nice) / t.monthN[m])}<br /><span class="muted">{c.must} must, {c.nice} nice</span>{:else}<span class="muted">0%</span>{/if}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <section class="card" aria-labelledby="industry-title">
      <h2 id="industry-title">Industry mix</h2>
      {#if t.industries.length}
        <div class="table-wrap" use:scrollable>
          <table>
            <caption>Postings by industry and month</caption>
            <thead>
              <tr><th scope="col">Industry</th>{#each t.months as m (m)}<th scope="col" class="num">{monthLabel(m)}<br /><span class="muted">n = {t.monthN[m]}</span></th>{/each}</tr>
            </thead>
            <tbody>
              {#each t.industries as i (i.name)}
                <tr>
                  <th scope="row">{i.name}</th>
                  {#each t.months as m (m)}<td class="num">{i.byMonth[m] ?? 0} <span class="muted">({pct((i.byMonth[m] ?? 0) / t.monthN[m])})</span></td>{/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p>No industry data yet (comes with the Jev pipeline).</p>
      {/if}
    </section>
  {/if}
{/if}

<style>
  .filters {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    align-items: end;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.75rem;
    align-items: center;
  }
  .swatch {
    display: inline-block;
    width: 1.25rem;
    height: 0.8rem;
    border: 1px solid var(--accent);
    border-radius: 2px;
    vertical-align: middle;
  }
  .must {
    background: var(--accent);
  }
  .nice {
    background: repeating-linear-gradient(135deg, var(--accent) 0 3px, transparent 3px 7px);
  }
  .bars {
    list-style: none;
    padding: 0;
    margin: 0 0 0.75rem;
  }
  .bars li {
    padding: 0.5rem 0;
    border-top: 1px solid var(--line);
  }
  .bar-label {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
  }
  .name {
    font-weight: 600;
  }
  .track {
    display: flex;
    height: 0.9rem;
    margin: 0.3rem 0;
    background: var(--surface-2);
    border-radius: 3px;
    overflow: hidden;
  }
  .seg {
    display: block;
    height: 100%;
  }
  .seg.nice {
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .bar-text {
    font-size: 0.9rem;
    color: var(--muted);
  }
  .chip.gap {
    border-color: var(--signal);
    color: var(--signal);
    font-weight: 600;
  }
  .gaps li {
    margin-bottom: 0.3rem;
  }
  details summary {
    cursor: pointer;
    min-height: 44px;
    display: flex;
    align-items: center;
    color: var(--accent);
  }
  .table-wrap + .table-wrap {
    margin-top: 0.75rem;
  }
</style>
