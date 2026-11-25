<script lang="ts">
	import Icon from '../Icon.svelte';

	let {
		type,
		message
	}: {
		type: 'success' | 'error';
		/** An empty string hides the toast */
		message: string;
	} = $props();
</script>

<!-- Live region stays mounted while empty, so the message is announced when it arrives -->
<div role={type === 'error' ? 'alert' : 'status'}>
	{#if message}
		<div class="toast {type}">
			{#if type === 'success'}
				<Icon name="check" size={14} strokeWidth={2} />
			{:else}
				<Icon name="error" size={14} strokeWidth={2} />
			{/if}
			{message}
		</div>
	{/if}
</div>
