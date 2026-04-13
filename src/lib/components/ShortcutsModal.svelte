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
</script>

{#if show}
  <div class="shortcuts-overlay" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
    <button class="overlay-close" onclick={onClose} aria-label="Close dialog"></button>
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
      <button class="close-btn" onclick={onClose}>Close</button>
    </div>
  </div>
{/if}
