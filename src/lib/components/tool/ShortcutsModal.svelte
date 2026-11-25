<script lang="ts">
	let {
		isOpen,
		shortcuts,
		onClose
	}: {
		isOpen: boolean;
		shortcuts: { label: string; keys: string[] }[];
		onClose: () => void;
	} = $props();

	let closeButton = $state<HTMLButtonElement>();

	// Focus Close on open, and restore the previous focus on close
	$effect(() => {
		if (!isOpen || !closeButton) {
			return;
		}
		const previouslyFocused = document.activeElement;
		closeButton.focus();
		return () => {
			if (previouslyFocused instanceof HTMLElement) {
				previouslyFocused.focus();
			}
		};
	});

	function keepFocusInDialog(e: KeyboardEvent) {
		// Focus trap: Close is the only focusable control (the backdrop button has tabindex="-1")
		if (e.key === 'Tab') {
			e.preventDefault();
		}
	}
</script>

{#if isOpen}
	<div class="shortcuts-overlay" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
		<button class="overlay-close" onclick={onClose} aria-label="Close dialog" tabindex="-1"
		></button>
		<div class="shortcuts-modal">
			<h3 id="shortcuts-title">Keyboard Shortcuts</h3>
			<div class="shortcut-list">
				{#each shortcuts as shortcut (shortcut.label)}
					<div class="shortcut-item">
						<span>{shortcut.label}</span>
						<div class="keys">
							{#each shortcut.keys as key (key)}
								<kbd>{key}</kbd>
							{/each}
						</div>
					</div>
				{/each}
			</div>
			<button
				class="close-btn"
				bind:this={closeButton}
				onclick={onClose}
				onkeydown={keepFocusInDialog}>Close</button
			>
		</div>
	</div>
{/if}
