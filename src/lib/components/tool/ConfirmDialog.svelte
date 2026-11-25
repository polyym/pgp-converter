<script lang="ts">
	let {
		isOpen,
		title,
		body,
		confirmLabel,
		cancelLabel,
		onConfirm,
		onCancel
	}: {
		isOpen: boolean;
		title: string;
		/** What will be lost by going ahead */
		body: string;
		confirmLabel: string;
		cancelLabel: string;
		onConfirm: () => void;
		/** Also called on Esc. The parent closes the dialog by setting isOpen to false. */
		onCancel: () => void;
	} = $props();

	let dialog = $state<HTMLDialogElement>();
	let cancelButton = $state<HTMLButtonElement>();

	// showModal() makes the page inert and focuses the first button, which is the
	// destructive one, so move focus to Cancel. Focus returns to the previously
	// focused element when the dialog unmounts.
	$effect(() => {
		if (!dialog) {
			return;
		}
		const previouslyFocused = document.activeElement;
		if (!dialog.open) {
			dialog.showModal();
		}
		cancelButton?.focus();
		return () => {
			if (previouslyFocused instanceof HTMLElement) {
				previouslyFocused.focus();
			}
		};
	});
</script>

<!-- Mounted only while open, so its h2 is not in the page's heading outline the rest of the time -->
{#if isOpen}
	<dialog
		bind:this={dialog}
		class="confirm"
		aria-labelledby="confirm-title"
		aria-describedby="confirm-body"
		oncancel={(e) => {
			// Esc fires cancel. Stop the browser closing the dialog itself, so that
			// isOpen stays the only thing that opens and closes it.
			e.preventDefault();
			onCancel();
		}}
	>
		<h2 id="confirm-title">{title}</h2>
		<p id="confirm-body">{body}</p>
		<div class="confirm-actions">
			<button type="button" class="btn secondary" onclick={onConfirm}>{confirmLabel}</button>
			<button type="button" class="btn primary" bind:this={cancelButton} onclick={onCancel}
				>{cancelLabel}</button
			>
		</div>
	</dialog>
{/if}

<style>
	.confirm {
		width: min(440px, calc(100vw - 32px));
		padding: 24px;
		color: var(--text);
		background: var(--surface);
		border: 1px solid var(--border-hover);
		border-radius: var(--radius-lg);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
	}

	.confirm::backdrop {
		background: rgba(9, 9, 11, 0.72);
	}

	h2 {
		margin: 0 0 10px;
		font-size: 17px;
		font-weight: 600;
		line-height: 1.35;
		letter-spacing: -0.2px;
	}

	p {
		margin: 0 0 22px;
		font-size: 14px;
		line-height: 1.65;
		color: var(--text-secondary);
	}

	.confirm-actions {
		display: flex;
		gap: 10px;
	}

	.confirm-actions .btn {
		flex: 1;
	}

	/* Two long labels do not fit side by side on a small phone. column-reverse
	   puts Cancel, the safe choice, on top. */
	@media (max-width: 420px) {
		.confirm-actions {
			flex-direction: column-reverse;
		}
	}
</style>
