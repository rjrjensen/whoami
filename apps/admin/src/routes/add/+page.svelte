<script lang="ts">
  import { enhance } from "$app/forms";
  import type { PageProps } from "./$types";

  let { form }: PageProps = $props();
  let busy = $state(false);
</script>

<svelte:head><title>Add posting · Admin</title></svelte:head>

<h1>Add posting</h1>
<p class="muted">Run a posting you found through Fit Check. It counts in trends and adds skill questions, but sends no push.</p>

<form
  method="POST"
  class="card stack"
  aria-busy={busy}
  use:enhance={() => {
    busy = true;
    return async ({ update }) => {
      await update({ reset: false });
      busy = false;
    };
  }}
>
  <div>
    <label for="posting">Job description</label>
    <textarea id="posting" name="posting" required aria-describedby="posting-hint{form?.message ? ' posting-error' : ''}" aria-invalid={form?.message ? "true" : undefined}
      >{form?.text ?? ""}</textarea
    >
    <p id="posting-hint" class="hint">Paste the whole posting, including its requirements.</p>
    {#if form?.message}<p id="posting-error" class="error-text" role="alert">{form.message}</p>{/if}
  </div>
  <button type="submit" disabled={busy}>{busy ? "Checking…" : "Run Fit Check"}</button>
</form>
