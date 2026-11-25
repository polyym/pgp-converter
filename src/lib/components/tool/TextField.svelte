<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { FIELD_NOTE_MS } from '#lib/constants.ts';
	import { canReadClipboard, insertAtCursor } from '#lib/text-entry.ts';
	import { readTextFiles } from '#lib/text-files.ts';
	import { KEEP_ASSISTANTS_OUT } from '#lib/keep-out.ts';
	import { addToKeys, type AdditionOutcome, type KeyInfo } from '#lib/keys.ts';
	import Icon from '../Icon.svelte';
	import KeyDetails from './KeyDetails.svelte';

	// No note for 'new-key': the new key appears in the list
	const ADDITION_NOTES: Record<Exclude<AdditionOutcome, 'new-key'>, string> = {
		'new-details': 'No new key was found in that, but it adds to a key already in the list.',
		'private-key': 'That holds a private key, so nothing was added. Never share a private key.',
		'nothing-new': 'No new key was found in that, so nothing was added.',
		unreadable: 'Something in that could not be read as a key, so nothing was added.'
	};

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
		/** For keys and PGP messages: monospace font, dir="ltr", no autocapitalize or autocorrect */
		isMonospace?: boolean;
		/**
		 * Shows Open file and accepts dropped files. It also marks the box as holding
		 * a PGP block, so the Paste button replaces the contents instead of
		 * inserting at the cursor.
		 */
		canOpenFiles?: boolean;
		/** Keys the page parsed from the box. While there are any, the textarea folds into a KeyDetails card. */
		keys?: KeyInfo[];
		/** What the keys are being used for, for example "Encrypting to" */
		keysTitle?: string;
		keysHint?: string;
		/**
		 * The box may hold several keys (recipients, or possible signers). Once it
		 * holds one, Paste and Open file add to it instead of replacing it.
		 */
		canHoldSeveral?: boolean;
		/** Shown in the folded card when canHoldSeveral is set */
		addHint?: string;
		/** Shown under the box until the value differs from the one it was reported for */
		error?: string;
	} = $props();

	let textarea = $state<HTMLTextAreaElement>();
	let fileInput = $state<HTMLInputElement>();
	let canPaste = $state(false);
	let isDragging = $state(false);
	let note = $state('');
	let noteTimer: ReturnType<typeof setTimeout> | undefined;
	// The contents the current note was given for
	let noteValue = $state('');
	// Keeps the textarea unfolded while the user works in it
	let isEditing = $state(false);
	// Set by a paste event; the effect below folds the box once the page has
	// parsed the pasted key. A plain let, so setting it does not re-run the effect.
	let shouldFoldWhenRead = false;
	// The contents the current error was reported for
	let errorValue = $state('');

	// Re-runs only when error changes: value is untracked, so typing does not move the snapshot
	$effect(() => {
		if (error) {
			errorValue = untrack(() => value);
		}
	});

	const isErrorShown = $derived(!!error && value === errorValue);
	// Show recognised keys by user ID and fingerprint instead of as armoured
	// text: shorter, and a private key is not left on screen
	const isFolded = $derived(keys.length > 0 && !isEditing && !isErrorShown);
	// Paste and Open file append to the existing keys instead of replacing them
	const isAdding = $derived(canHoldSeveral && keys.length > 0);
	// Hide the note once the value changes (Remove, or the page's Clear). The
	// input handler also clears the note itself, so undoing back to the old value
	// does not show it, and announce it, a second time.
	const shownNote = $derived(value === noteValue ? note : '');

	$effect(() => {
		if (keys.length === 0 || !shouldFoldWhenRead) {
			return;
		}

		shouldFoldWhenRead = false;
		isEditing = false;
		textarea?.blur();
	});

	// Some browsers lack navigator.clipboard.readText, so the Paste button
	// appears only after mount and only where it exists
	onMount(() => {
		canPaste = canReadClipboard();
		return () => {
			clearTimeout(noteTimer);
		};
	});

	function showNote(text: string) {
		note = text;
		noteValue = value;
		clearTimeout(noteTimer);
		noteTimer = setTimeout(() => {
			note = '';
		}, FIELD_NOTE_MS);
	}

	// For a free-text box. Replacing the value would lose the user's writing with
	// no way to undo it; insertAtCursor edits through the browser, so undo works.
	function addAtCursor(text: string) {
		if (!textarea) {
			value += text;
			return;
		}
		insertAtCursor(textarea, text);
		value = textarea.value;
	}

	// The Paste button, Open file and drops all come through here. In a PGP box
	// the text replaces the value or, with isAdding, joins the key list; in a
	// free-text box it is inserted at the cursor.
	function put(text: string) {
		note = '';
		if (!canOpenFiles && value) {
			addAtCursor(text);
			return;
		}
		if (isAdding) {
			void addKeys(text);
		} else {
			value = text;
		}
		isEditing = false;
	}

	async function addKeys(text: string) {
		const held = value;
		const { box, outcome } = await addToKeys(held, text);
		// Drop the result if the box changed while addToKeys was running
		if (value !== held) {
			return;
		}
		value = box;
		if (outcome !== 'new-key') {
			showNote(ADDITION_NOTES[outcome]);
		}
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
			// readText rejects when the user or the browser denies clipboard access,
			// which gets a hint, not an error. A folded box has no visible textarea to
			// paste into, so the hint says to open it first.
			showNote(
				isFolded
					? 'The browser did not allow pasting. Press "Show or edit", then paste into the box.'
					: 'The browser did not allow pasting. Press and hold, or use Ctrl or Command + V.'
			);
		}
	}

	async function useFiles(list: FileList | null | undefined) {
		if (!list?.length) {
			return;
		}
		const result = await readTextFiles(list, /* requiresArmor */ true);
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
						// Reset so that choosing the same file again still fires change
						e.currentTarget.value = '';
					}}
				/>
			{/if}
		</div>
	</div>

	<!-- Folding hides the textarea with CSS instead of unmounting it, so the label
	     and bind:value keep working. spellcheck and translate are off in every box
	     because a browser's spelling and translation services can send the text to
	     a server. autocapitalize is "sentences" for a message the user writes and
	     "off" for a PGP block. -->
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
			oninput={() => (note = '')}
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

	<p class="field-note" role="status">{shownNote}</p>

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

	/* pointer-events: none lets the drop land on the textarea underneath */
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

	/* A note can name a file, and a long name with no spaces must not push the page sideways */
	.field-error,
	.field-note {
		margin: 0;
		padding-left: 2px;
		font-size: 13px;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}

	.field-error {
		color: var(--error);
	}

	.field-note {
		color: var(--warning);
	}

	.add-hint {
		margin: 10px 0 0;
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-dim);
	}

	/* Visually hidden while empty but kept in the DOM, as .live:empty in app.css */
	.field-note:empty {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
	}

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
