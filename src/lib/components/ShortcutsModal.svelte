<script lang="ts">
  let {
    show,
    shortcuts,
    onClose
  }: {
    show: boolean;
    shortcuts: Array<{ label: string; keys: string[] }>;
    onClose: () => void;
  } = $props();

  let closeButton = $state<HTMLButtonElement>();

  // Move focus into the dialog when it opens and hand it back when it closes
  $effect(() => {
    if (!show || !closeButton) return;
    const previouslyFocused = document.activeElement;
    closeButton.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  });

  function keepFocusInDialog(e: KeyboardEvent) {
    // Close is the only control in the dialog, so Tab has nowhere else to go
    if (e.key === 'Tab') e.preventDefault();
  }
</script>

{#if show}
  <div class="shortcuts-overlay" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
    <button class="overlay-close" onclick={onClose} aria-label="Close dialog" tabindex="-1"></button>
    <div class="shortcuts-modal">
      <h3 id="shortcuts-title">Keyboard Shortcuts</h3>
      <div class="shortcut-list">
        {#each shortcuts as shortcut}
          <div class="shortcut-item">
            <span>{shortcut.label}</span>
            <div class="keys">
              {#each shortcut.keys as key}
                <kbd>{key}</kbd>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      <button class="close-btn" bind:this={closeButton} onclick={onClose} onkeydown={keepFocusInDialog}>Close</button>
    </div>
  </div>
{/if}
