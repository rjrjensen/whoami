<script lang="ts">
  import "@fontsource-variable/geist";
  import "@fontsource/instrument-serif";
  import "../app.css";
  import { page } from "$app/state";
  import type { LayoutProps } from "./$types";

  let { children, data }: LayoutProps = $props();

  const nav = [
    { href: "/", label: "Questions" },
    { href: "/reports", label: "Reports" },
    { href: "/trends", label: "Trends" },
    { href: "/skills", label: "Skills" },
    { href: "/resume", label: "Resume" },
    { href: "/add", label: "Add posting" },
  ];
  const current = (href: string) => (href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(href));
</script>

<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="bar">
    <a class="brand" href="/">Admin</a>
    {#if data.signedIn}
      <form method="POST" action="/auth/logout">
        <button class="link-button" type="submit">Sign out</button>
      </form>
    {/if}
  </div>
  {#if data.signedIn}
    <nav aria-label="Main">
      <ul>
        {#each nav as item (item.href)}
          <li><a href={item.href} aria-current={current(item.href) ? "page" : undefined}>{item.label}</a></li>
        {/each}
      </ul>
    </nav>
  {/if}
</header>

<main id="main" tabindex="-1">
  {@render children()}
</main>
