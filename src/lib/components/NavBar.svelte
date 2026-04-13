<script lang="ts">
  type Page = 'encrypt' | 'decrypt' | 'generate' | 'about' | 'donate';

  let {
    currentPage,
    showShortcutsToggle = true,
    isTouchDevice = false,
    onToggleShortcuts
  }: {
    currentPage: Page;
    showShortcutsToggle?: boolean;
    isTouchDevice?: boolean;
    onToggleShortcuts?: () => void;
  } = $props();

  const navItems = [
    {
      href: '/',
      page: null,
      label: 'Home',
      icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
    },
    {
      href: '/encrypt',
      page: 'encrypt',
      label: 'Encrypt',
      icon: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
    },
    {
      href: '/decrypt',
      page: 'decrypt',
      label: 'Decrypt',
      icon: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'
    },
    {
      href: '/generate',
      page: 'generate',
      label: 'Generate',
      icon: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>'
    }
  ];

  const filteredItems = $derived(navItems.filter(item => item.page !== currentPage));
</script>

<nav class="nav">
  <div class="nav-group">
    {#each filteredItems as item}
      <a href={item.href} class="nav-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          {@html item.icon}
        </svg>
        <span class="nav-label">{item.label}</span>
      </a>
    {/each}
    {#if showShortcutsToggle && !isTouchDevice && onToggleShortcuts}
      <button class="nav-link shortcut-toggle" onclick={onToggleShortcuts} aria-label="Show keyboard shortcuts">
        <kbd>?</kbd>
      </button>
    {/if}
  </div>
</nav>
