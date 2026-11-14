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
		/** The question, in a few words */
		title: string;
		/** What will be lost by going ahead */
		body: string;
		/** The button that goes ahead */
		confirmLabel: string;
		/** The button that backs out, which is also what Esc does */
		cancelLabel: string;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	let dialog = $state<HTMLDialogElement>();
	let cancelButton = $state<HTMLButtonElement>();

	// Opened as a modal, so the page behind cannot be used until it is answered.
	// Focus starts on the button that loses nothing, and goes back afterwards to
	// whatever had it.
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

<!-- Asks before something that cannot be undone. Only in the page while it is
     asking, so its heading is not part of the page's outline the rest of the time. -->
{#if isOpen}
	<dialog
		bind:this={dialog}
		class="confirm"
		aria-labelledby="confirm-title"
		aria-describedby="confirm-body"
		oncancel={(e) => {
			// Esc: back out, and leave the closing to the page
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

	/* Two long labels side by side do not fit a small phone */
	@media (max-width: 420px) {
		.confirm-actions {
			flex-direction: column-reverse;
		}
	}
</style>
