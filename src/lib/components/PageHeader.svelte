<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    iconClass = '',
    children
  }: {
    title: string;
    iconClass?: string;
    children: Snippet;
  } = $props();
</script>

<header class="header">
  <div class="icon {iconClass}">
    {@render children()}
  </div>
  <div class="header-text">
    <h1>PGP Converter</h1>
    <span class="page-title">{title}</span>
  </div>
</header>
