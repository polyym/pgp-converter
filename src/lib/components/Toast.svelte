<script lang="ts">
  let {
    type,
    message,
    show
  }: {
    type: 'success' | 'error';
    message: string;
    show: boolean;
  } = $props();
</script>

{#if show}
  <div class="toast {type}" role={type === 'error' ? 'alert' : 'status'}>
    {#if type === 'success'}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    {:else}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    {/if}
    {message}
  </div>
{/if}
