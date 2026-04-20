<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    iconClass = '',
    onShortcutsClick,
    children
  }: {
    title: string;
    iconClass?: string;
    onShortcutsClick?: () => void;
    children: Snippet;
  } = $props();
</script>

<header class="header">
  <div class="icon {iconClass}">
    {@render children()}
  </div>
  <div class="header-text">
    <a href="/" class="brand">PGP Converter</a>
    <h1>{title}</h1>
  </div>
  {#if onShortcutsClick}
    <button class="shortcut-toggle" onclick={onShortcutsClick} aria-label="Show keyboard shortcuts" title="Keyboard shortcuts (?)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <path d="M6 10h0M10 10h0M14 10h0M18 10h0"/>
        <path d="M7 14h10"/>
      </svg>
    </button>
  {/if}
</header>
