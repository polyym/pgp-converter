<script lang="ts">
	import Icon from '../Icon.svelte';

	let {
		type,
		message
	}: {
		type: 'success' | 'error';
		/** What to say; nothing is shown while this is empty */
		message: string;
	} = $props();
</script>

<!-- The place stays in the page while there is nothing to say, so that a
     screen reader hears the message when one arrives -->
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
