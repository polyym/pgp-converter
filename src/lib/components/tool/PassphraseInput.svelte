<script lang="ts">
	import { untrack } from 'svelte';
	import { KEEP_ASSISTANTS_OUT } from '#lib/keep-out.ts';

	let {
		id,
		value = $bindable(''),
		placeholder = '',
		autocomplete,
		isInvalid = false,
		error = ''
	}: {
		id: string;
		value?: string;
		placeholder?: string;
		autocomplete: 'off' | 'new-password';
		isInvalid?: boolean;
		/** What is wrong with the passphrase, shown under the field until it is changed */
		error?: string;
	} = $props();

	let isVisible = $state(false);
	// The passphrase the current error was reported for
	let errorValue = $state('');

	$effect(() => {
		if (error) {
			errorValue = untrack(() => value);
		}
	});

	const isErrorShown = $derived(!!error && value === errorValue);

	// A cleared field goes back to hidden, so the next passphrase typed there is
	// not shown by surprise
	$effect(() => {
		if (value === '') {
			isVisible = false;
		}
	});
</script>

<div class="passphrase-field">
	<!-- Spellcheck and autocorrect stay off: once the passphrase is shown, this is
       an ordinary text field. Browser spelling services must never see what is in
       it, and a phone's keyboard must not change it. -->
	<input
		{id}
		type={isVisible ? 'text' : 'password'}
		{value}
		oninput={(e) => (value = e.currentTarget.value)}
		{placeholder}
		{autocomplete}
		class={{ invalid: isInvalid || isErrorShown }}
		aria-invalid={isInvalid || isErrorShown}
		aria-describedby={isErrorShown ? `${id}-error` : undefined}
		spellcheck="false"
		autocapitalize="off"
		autocorrect="off"
		{...KEEP_ASSISTANTS_OUT}
	/>
	<button
		type="button"
		class="visibility-toggle"
		aria-controls={id}
		aria-label={isVisible ? 'Hide passphrase' : 'Show passphrase'}
		onclick={() => (isVisible = !isVisible)}
	>
		{isVisible ? 'Hide' : 'Show'}
	</button>
</div>
{#if isErrorShown}
	<p class="passphrase-error" id="{id}-error" role="alert">{error}</p>
{/if}

<style>
	.passphrase-field {
		position: relative;
	}

	/* Room for the Show / Hide button, so long passphrases do not run under it */
	.passphrase-field input {
		padding-right: 76px;
	}

	.passphrase-field input.invalid {
		border-color: var(--error);
	}

	.passphrase-error {
		margin: 0;
		padding-left: 2px;
		font-size: 13px;
		line-height: 1.5;
		color: var(--error);
	}

	.visibility-toggle {
		position: absolute;
		top: 50%;
		right: 8px;
		transform: translateY(-50%);
		min-width: 56px;
		min-height: 36px;
		padding: 0 10px;
		font-family: var(--font);
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary);
		background: transparent;
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.visibility-toggle:hover {
		color: var(--text);
		border-color: var(--border-hover);
	}

	/* Fingers need a larger target than a mouse pointer does */
	@media (pointer: coarse) {
		.visibility-toggle {
			min-height: 44px;
		}
	}
</style>
