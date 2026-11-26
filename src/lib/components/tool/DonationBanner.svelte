<!--
@component
Donation prompt under a tool's result. It stays in the page flow and is never fixed or floating,
on any screen size.
-->
<script lang="ts">
	import Icon from '../Icon.svelte';

	let {
		isVisible,
		onDismiss
	}: {
		isVisible: boolean;
		onDismiss: () => void;
	} = $props();
</script>

{#if isVisible}
	<div class="donation-banner">
		<p class="donation-text">
			<strong>PGP Converter is free and has no ads.</strong> If it has been useful to you, you can support
			it with a donation.
		</p>
		<div class="donation-actions">
			<a href="/donate" class="donate-btn">Donate</a>
			<button class="dismiss-btn" onclick={onDismiss} aria-label="Dismiss donation banner">
				<Icon name="close" size={14} strokeWidth={2} />
			</button>
		</div>
	</div>
{/if}

<style>
	.donation-banner {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 16px;
		padding: 14px 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		animation: appear 0.25s ease;
	}

	@keyframes appear {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.donation-text {
		flex: 1;
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.donation-text strong {
		color: var(--text);
		font-weight: 600;
	}

	.donation-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.donate-btn {
		display: inline-flex;
		align-items: center;
		min-height: 36px;
		padding: 8px 16px;
		font-family: var(--font);
		font-size: 13px;
		font-weight: 600;
		color: #000;
		background: var(--text);
		border-radius: var(--radius);
		text-decoration: none;
		transition: background 0.15s ease;
		white-space: nowrap;
	}

	.donate-btn:hover {
		background: #e4e4e7;
	}

	.donate-btn:active {
		background: #d4d4d8;
	}

	.dismiss-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.dismiss-btn:hover {
		color: var(--text);
		border-color: var(--border-hover);
	}

	@media (max-width: 480px) {
		.donation-banner {
			flex-direction: column;
			align-items: stretch;
		}

		.donation-actions {
			justify-content: flex-end;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.donation-banner {
			animation: none;
		}
	}

	@media (pointer: coarse) {
		.donate-btn {
			min-height: 44px;
		}

		.dismiss-btn {
			width: 44px;
			height: 44px;
		}
	}
</style>
