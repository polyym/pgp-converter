<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { FIELD_NOTE_MS } from '#lib/constants.ts';
	import { appendBlock, canReadClipboard, insertAtCursor } from '#lib/text-entry.ts';
	import { readTextFiles } from '#lib/text-files.ts';
	import { KEEP_ASSISTANTS_OUT } from '#lib/keep-out.ts';
	import type { KeyInfo } from '#lib/keys.ts';
	import Icon from '../Icon.svelte';
	import KeyDetails from './KeyDetails.svelte';

	let {
		id,
		label,
		value = $bindable(''),
		placeholder = '',
		isMonospace = false,
		canOpenFiles = false,
		keys = [],
		keysTitle = '',
		keysHint = '',
		canHoldSeveral = false,
		addHint = '',
		error = ''
	}: {
		id: string;
		label: string;
		value?: string;
		placeholder?: string;
		/** Monospaced text, for keys and PGP messages */
		isMonospace?: boolean;
		/** Offer "Open file" and accept dropped files; only for boxes that hold a PGP block */
		canOpenFiles?: boolean;
		/** The keys recognised in the box. Once there are some, the box folds into a card that names them. */
		keys?: KeyInfo[];
		/** What the keys are being used for, for example "Encrypting to" */
		keysTitle?: string;
		/** Advice shown with the keys */
		keysHint?: string;
		/**
		 * The box may hold several keys (recipients, or possible signers). Once it
		 * holds one, Paste and Open file add to it instead of replacing it.
		 */
		canHoldSeveral?: boolean;
		/** Tells the user that further keys can be added, shown with the keys */
		addHint?: string;
		/** What is wrong with the contents, shown under the box until they are changed */
		error?: string;
	} = $props();

	let textarea = $state<HTMLTextAreaElement>();
	let fileInput = $state<HTMLInputElement>();
	let canPaste = $state(false);
	let isDragging = $state(false);
	let note = $state('');
	let noteTimer: ReturnType<typeof setTimeout> | undefined;
	// While an added key is being read: what the box held before, and how many keys that was
	let pendingAdd: { value: string; count: number } | undefined;
	// True while the user is working in the box itself
	let isEditing = $state(false);
	// Set by a paste from the keyboard: fold the box as soon as the key is read
	let shouldFoldWhenRead = false;
	// The contents the current error was reported for
	let errorValue = $state('');

	$effect(() => {
		if (error) {
			errorValue = untrack(() => value);
		}
	});

	// An error stays until the contents it was about are changed
	const isErrorShown = $derived(!!error && value === errorValue);
	// A recognised key is shown by name instead of as a block of characters:
	// shorter, and a private key is not left in plain view
	const isFolded = $derived(keys.length > 0 && !isEditing && !isErrorShown);
	// Further keys join the ones already there
	const isAdding = $derived(canHoldSeveral && keys.length > 0);

	// Runs each time the keys in the box have been read again
	$effect(() => {
		settleAddition(keys.length);
	});

	// If something was added and no further key came of it, the box goes back to
	// what it held, so that nothing unreadable is left hidden behind the list of keys
	function settleAddition(count: number) {
		if (!pendingAdd) {
			return;
		}
		const before = pendingAdd;
		pendingAdd = undefined;
		if (count > before.count) {
			return;
		}
		value = before.value;
		showNote('No new key was found in that, so nothing was added.');
	}

	$effect(() => {
		if (keys.length === 0 || !shouldFoldWhenRead) {
			return;
		}

		shouldFoldWhenRead = false;
		isEditing = false;
		textarea?.blur();
	});

	// Reading the clipboard is not available in every browser; the button only
	// appears where it can work
	onMount(() => {
		canPaste = canReadClipboard();
		return () => {
			clearTimeout(noteTimer);
		};
	});

	function showNote(text: string) {
		note = text;
		clearTimeout(noteTimer);
		noteTimer = setTimeout(() => {
			note = '';
		}, FIELD_NOTE_MS);
	}

	// Adds text to a box the user writes in, where the cursor is. Putting it in
	// place of what they had typed would lose their writing, and nothing could
	// bring it back.
	function addAtCursor(text: string) {
		if (!textarea) {
			value += text;
			return;
		}
		insertAtCursor(textarea, text);
		value = textarea.value;
	}

	// Puts text into the box. A key or a PGP message replaces what was there,
	// or joins the keys already listed; in a box for the user's own writing
	// it goes in where the cursor is.
	function put(text: string) {
		note = '';
		if (!canOpenFiles && value) {
			addAtCursor(text);
			return;
		}
		if (isAdding) {
			pendingAdd = { value, count: keys.length };
			value = appendBlock(value, text);
		} else {
			value = text;
		}
		isEditing = false;
	}

	async function paste() {
		try {
			const text = await navigator.clipboard.readText();
			if (text.trim()) {
				put(text);
			} else {
				showNote('The clipboard is empty.');
			}
		} catch {
			// The browser asks the user first; saying no is not an error worth alarming anyone about
			showNote('The browser did not allow pasting. Press and hold, or use Ctrl or Command + V.');
		}
	}

	async function useFiles(list: FileList | null | undefined) {
		if (!list?.length) {
			return;
		}
		const result = await readTextFiles(list, true);
		if (result.text === undefined) {
			showNote(result.error ?? 'That file could not be read.');
		} else {
			put(result.text);
		}
	}

	function onDrop(e: DragEvent) {
		if (!canOpenFiles || !e.dataTransfer?.files.length) {
			return;
		}
		e.preventDefault();
		isDragging = false;
		void useFiles(e.dataTransfer.files);
	}

	function onDragOver(e: DragEvent) {
		// Only react to files; dragged text keeps the browser's own behaviour
		if (!canOpenFiles || !e.dataTransfer?.types.includes('Files')) {
			return;
		}
		e.preventDefault();
		isDragging = true;
	}

	async function change() {
		isEditing = true;
		await tick();
		if (!textarea) {
			return;
		}
		textarea.focus();
		if (canHoldSeveral) {
			// The cursor goes after the last key, ready for another one. Selecting
			// everything would have the next paste replace the keys already there.
			const end = textarea.value.length;
			textarea.setSelectionRange(end, end);
			textarea.scrollTop = textarea.scrollHeight;
		} else {
			textarea.select();
		}
	}

	function remove() {
		value = '';
		isEditing = false;
	}
</script>

<div class="field">
	<div class="field-head">
		<label for={id}>{label}</label>
		<div class="field-tools">
			{#if canPaste}
				<button
					type="button"
					class="field-tool"
					onclick={() => {
						void paste();
					}}
					aria-label={isAdding ? `Paste another key into ${label}` : `Paste into ${label}`}
				>
					<Icon name="paste" size={14} strokeWidth={1.75} />
					Paste
				</button>
			{/if}
			{#if canOpenFiles}
				<button
					type="button"
					class="field-tool"
					onclick={() => fileInput?.click()}
					aria-label={isAdding
						? `Open file, to add another key to ${label}`
						: `Open file for ${label}`}
				>
					<Icon name="file" size={14} strokeWidth={1.75} />
					Open file
				</button>
				<input
					bind:this={fileInput}
					type="file"
					class="sr-only"
					tabindex="-1"
					aria-hidden="true"
					multiple
					accept=".asc,.txt,.key,.pgp,.gpg,.pub,.sig,text/plain,application/pgp-keys,application/pgp-encrypted,application/pgp-signature"
					onchange={(e) => {
						void useFiles(e.currentTarget.files);
						// So that choosing the same file again is noticed
						e.currentTarget.value = '';
					}}
				/>
			{/if}
		</div>
	</div>

	<!-- The box stays in the page while folded, so its label and value still work.
	     A phone's keyboard capitalises sentences in a message the user writes, and
	     leaves a PGP block exactly as it is. -->
	<div class={['drop-zone', { dragging: isDragging, folded: isFolded }]}>
		<textarea
			bind:this={textarea}
			{id}
			bind:value
			{placeholder}
			rows="4"
			class={{ mono: isMonospace, invalid: isErrorShown }}
			aria-invalid={isErrorShown}
			aria-describedby={isErrorShown ? `${id}-error` : undefined}
			spellcheck="false"
			autocomplete="off"
			autocapitalize={isMonospace ? 'off' : 'sentences'}
			autocorrect={isMonospace ? 'off' : undefined}
			translate="no"
			dir={isMonospace ? 'ltr' : 'auto'}
			{...KEEP_ASSISTANTS_OUT}
			onfocus={() => (isEditing = true)}
			onblur={() => (isEditing = false)}
			onpaste={() => (shouldFoldWhenRead = true)}
			ondragover={onDragOver}
			ondragleave={() => (isDragging = false)}
			ondrop={onDrop}></textarea>
		{#if isDragging}
			<div class="drop-hint" aria-hidden="true">Drop the file here</div>
		{/if}
	</div>

	{#if isErrorShown}
		<p class="field-error" id="{id}-error" role="alert">{error}</p>
	{/if}

	<p class="field-note" role="status">{note}</p>

	<KeyDetails title={keysTitle} {keys} hint={keysHint}>
		{#if isFolded}
			{#if canHoldSeveral && addHint}
				<p class="add-hint">{addHint}</p>
			{/if}
			<div class="card-actions">
				<button type="button" class="field-tool" onclick={change}>Show or edit</button>
				<button type="button" class="field-tool" onclick={remove}>Remove</button>
			</div>
		{/if}
	</KeyDetails>
</div>

<style>
	.field-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 28px;
	}

	.field-tools,
	.card-actions {
		display: flex;
		gap: 4px;
	}

	.card-actions {
		margin-top: 12px;
	}

	.field-tool {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 28px;
		padding: 4px 10px;
		font-family: var(--font);
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 999px;
		cursor: pointer;
		/* On a narrow phone the label gives way and wraps, not the buttons */
		white-space: nowrap;
		flex-shrink: 0;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.field-tool:hover {
		color: var(--text);
		background: var(--surface);
		border-color: var(--border-hover);
	}

	.field-tool:active {
		background: var(--surface-2);
	}

	.drop-zone {
		position: relative;
		display: flex;
	}

	.drop-zone.folded {
		display: none;
	}

	.drop-zone.dragging textarea {
		border-style: dashed;
		border-color: var(--text-secondary);
	}

	.drop-zone textarea.invalid {
		border-color: var(--error);
	}

	/* Sits over the box while a file is held above it; lets the drop through */
	.drop-hint {
		position: absolute;
		inset: 1px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: 500;
		color: var(--text);
		background: rgba(9, 9, 11, 0.82);
		border-radius: var(--radius-lg);
		pointer-events: none;
	}

	.field-error,
	.field-note {
		margin: 0;
		padding-left: 2px;
		font-size: 13px;
		line-height: 1.5;
	}

	.field-error {
		color: var(--error);
	}

	.field-note {
		color: var(--warning);
	}

	/* Says that the list of keys can grow; quieter than the advice above it */
	.add-hint {
		margin: 10px 0 0;
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-dim);
	}

	/* Takes no room until there is something to say, but stays in the page: a
     screen reader announces a change to a place it already knew about */
	.field-note:empty {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
	}

	/* Fingers need a larger target than a mouse pointer does */
	@media (pointer: coarse) {
		.field-head {
			min-height: 44px;
		}

		.field-tool {
			min-height: 44px;
			padding: 6px 14px;
			font-size: 13px;
		}
	}
</style>
