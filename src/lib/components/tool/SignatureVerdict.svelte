<script lang="ts">
	import type { SignatureCheck } from '#lib/signatures.ts';
	import type { IconName } from '#lib/icons.ts';
	import { describeSignatures, type VerdictTone } from '#lib/verdicts.ts';
	import Icon from '../Icon.svelte';

	const ICON_FOR_TONE: Record<VerdictTone, IconName> = {
		good: 'verify',
		bad: 'failed',
		caution: 'warning',
		neutral: 'none'
	};

	let {
		signatures,
		wereKeysSupplied,
		howToCheck = '',
		isMuted = false
	}: {
		/** The result for each signature on the message; empty if it carries none */
		signatures: SignatureCheck[];
		/** Whether the user supplied a public key to check against */
		wereKeysSupplied: boolean;
		/** What to do to get a signature checked, shown when no key was supplied */
		howToCheck?: string;
		/** The verdict is about an earlier state of the form: shown without its colour, so it does not pass for a current one */
		isMuted?: boolean;
	} = $props();

	const verdicts = $derived(describeSignatures(signatures, { wereKeysSupplied, howToCheck }));
</script>

<div class={['verdicts', { muted: isMuted }]} role="status">
	{#each verdicts as verdict (verdict)}
		<div class="verdict {verdict.tone}">
			<span class="verdict-icon" aria-hidden="true">
				<Icon name={ICON_FOR_TONE[verdict.tone]} strokeWidth={2} />
			</span>
			<div class="verdict-text">
				<p class="verdict-title">{verdict.title}</p>
				<p class="verdict-body">{verdict.body}</p>
				{#if verdict.check?.signer}
					<code class="verdict-fingerprint" translate="no">{verdict.check.signer.fingerprint}</code>
				{/if}
				{#if verdict.check?.signedAt}
					<p class="verdict-meta">Signature dated {verdict.check.signedAt}</p>
				{/if}
				{#if verdict.check?.status === 'valid' && verdict.check.signer?.problem}
					<p class="verdict-meta caution-text">{verdict.check.signer.problem}</p>
				{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.verdicts {
		display: flex;
		flex-direction: column;
	}

	.verdict {
		display: flex;
		gap: 12px;
		padding: 14px 16px;
		border-top: 1px solid var(--border);
	}

	.verdict-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		flex-shrink: 0;
		color: var(--text-secondary);
		background: var(--surface-2);
	}

	.verdict.good .verdict-icon {
		color: var(--success);
		background: rgba(34, 197, 94, 0.12);
	}

	.verdict.bad .verdict-icon {
		color: var(--error);
		background: rgba(239, 68, 68, 0.12);
	}

	.verdict.caution .verdict-icon {
		color: var(--warning);
		background: rgba(245, 158, 11, 0.12);
	}

	.verdict.bad {
		background: rgba(239, 68, 68, 0.05);
	}

	.verdict-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.verdict-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		line-height: 1.4;
		color: var(--text);
		overflow-wrap: anywhere;
	}

	.verdict.good .verdict-title {
		color: var(--success);
	}

	.verdict.bad .verdict-title {
		color: var(--error);
	}

	.verdict.caution .verdict-title {
		color: var(--warning);
	}

	.verdict-body,
	.verdict-meta {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.verdict-fingerprint {
		font-family: var(--mono);
		font-size: 12px;
		color: var(--text);
		overflow-wrap: anywhere;
	}

	.caution-text {
		color: var(--warning);
	}

	/* A verdict on what the boxes held before they were changed. It keeps its
     words and loses its colour: green beside a message it never judged would
     be the one thing this component must not show. Grey, not faded, so that it
     can still be read. */
	.verdicts.muted .verdict {
		background: none;
	}

	.verdicts.muted .verdict-icon {
		color: var(--text-secondary);
		background: var(--surface-2);
	}

	.verdicts.muted .verdict-title,
	.verdicts.muted .verdict-fingerprint,
	.verdicts.muted .caution-text {
		color: var(--text-secondary);
	}
</style>
