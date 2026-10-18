<script lang="ts">
  import { page } from "$app/state";
</script>

<svelte:head><title>{page.status} · Admin</title></svelte:head>

<section class="card narrow">
  <h1>{page.status === 404 ? "Not found" : page.status === 403 ? "Not allowed" : "Something went wrong"}</h1>
  <p>{page.error?.message}</p>
  <p><a href={page.status === 401 || page.status === 400 ? "/auth/login" : "/"}>{page.status === 401 || page.status === 400 ? "Sign in" : "Back to the start"}</a></p>
</section>
