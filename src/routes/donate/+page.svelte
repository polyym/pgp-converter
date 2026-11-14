<script lang="ts">
	import { Icon, PageFrame, PageHeader, SEO } from '#lib/components/index.ts';
	import { truncateAddress } from '#lib/donations.ts';
	import { createWalletLoader } from '#lib/stores/wallet-loader.svelte.ts';
	import { onMount } from 'svelte';

	const loader = createWalletLoader();

	onMount(() => {
		void loader.load();
		return loader.stop;
	});
</script>

<SEO
	title="Donate to PGP Converter: Support Free Open-Source Encryption"
	description="Support PGP Converter, a free and open-source browser-based PGP encryption tool. Donate with Solana, Ethereum, or Bitcoin. No accounts required."
	path="/donate"
/>

<PageFrame currentPage="donate">
	<PageHeader
		icon="donate"
		title="Support PGP Converter"
		subtitle="Entirely optional, and only if the app has been useful to you."
	/>

	<section class="section intro">
		<div class="info-box">
			<p>PGP Converter is free and has no ads. One person builds and maintains it.</p>
			<p>
				If it has been useful to you, a donation is appreciated. Crypto only, with no account and no
				personal details needed.
			</p>
		</div>
	</section>

	<section class="section">
		<h2>Donate with Crypto</h2>
		<div class="wallets">
			{#if loader.error}
				<div class="info-box" role="alert">
					<p>{loader.error}</p>
					<button
						class="retry-btn"
						onclick={() => {
							void loader.load();
						}}>Try again</button
					>
				</div>
			{:else if loader.isLoading}
				<div class="wallet-loading" role="status" aria-label="Loading wallet addresses">
					<div class="wallet-loading-spinner" aria-hidden="true"></div>
					<div class="wallet-loading-coin" aria-hidden="true">
						{#key loader.loadingCoin.name}
							<span class="wallet-loading-coin-name" style:color={loader.loadingCoin.color}>
								{loader.loadingCoin.name}
							</span>
						{/key}
					</div>
					<p class="wallet-loading-subtitle">
						{#if loader.isWaking}
							Fetching wallet addresses, this may take a moment...
						{:else}
							Fetching wallet addresses...
						{/if}
					</p>
				</div>
			{:else}
				{#each loader.wallets as wallet (wallet.id)}
					{@const qrCode = loader.qrDataUrls[wallet.id]}
					<div class="wallet-card">
						<div class="wallet-header">
							<div class="wallet-icon" style="background: {wallet.bg}; color: {wallet.color}">
								{@html wallet.icon}
							</div>
							<div class="wallet-title">
								<span class="wallet-name">{wallet.name}</span>
								{#if wallet.badge}
									<span class="wallet-badge">{wallet.badge}</span>
								{/if}
							</div>
							<span class="wallet-ticker">{wallet.ticker}</span>
						</div>

						<div class="wallet-body">
							<div class="address-row">
								<code class="address" title={wallet.address}>
									<span class="address-full">{wallet.address}</span>
									<span class="address-short">{truncateAddress(wallet.address)}</span>
								</code>
								<button
									class={['copy-btn', { copied: loader.copiedAddress === wallet.address }]}
									onclick={() => {
										void loader.copyAddress(wallet.address);
									}}
									aria-label="Copy {wallet.name} address"
								>
									{#if loader.copiedAddress === wallet.address}
										<Icon name="check" size={14} strokeWidth={2.5} />
										<span>Copied</span>
									{:else}
										<Icon name="copy" size={14} strokeWidth={2} />
										<span>Copy</span>
									{/if}
								</button>
							</div>

							<div class="qr-wrapper">
								{#if qrCode}
									<img
										src={qrCode}
										alt="QR code for {wallet.name}{wallet.badge
											? ` (${wallet.badge})`
											: ''} address"
										class="qr-img"
										width="140"
										height="140"
									/>
								{:else if !loader.isQrReady}
									<div class="qr-spinner" aria-label="Loading QR code"></div>
								{:else}
									<span class="qr-missing">QR code unavailable. Use the address above.</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>
</PageFrame>

<style>
	.section {
		margin-bottom: 40px;
	}
	.section.intro {
		margin-bottom: 32px;
	}
	.section:last-of-type {
		margin-bottom: 0;
	}
	.section h2 {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 16px;
		color: var(--text);
	}

	.info-box {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px 18px;
	}
	.info-box p {
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin: 0 0 10px;
	}
	.info-box p:last-child {
		margin-bottom: 0;
	}

	.wallet-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 32px 0;
	}
	.wallet-loading-spinner {
		width: 32px;
		height: 32px;
		border: 2.5px solid var(--border);
		border-top-color: var(--text);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	.wallet-loading-coin {
		height: 24px;
		min-width: 140px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.wallet-loading-coin-name {
		font-size: 18px;
		font-weight: 600;
		letter-spacing: 0.3px;
		animation: coin-fade-in 0.3s ease;
	}
	.wallet-loading-subtitle {
		font-size: 13px;
		color: var(--text-secondary);
		text-align: center;
		margin: 0;
		max-width: 320px;
		line-height: 1.5;
	}
	@keyframes coin-fade-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wallet-loading-spinner {
			animation-duration: 2.5s;
		}
		.wallet-loading-coin-name {
			animation: none;
		}
	}

	.wallets {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 12px;
	}

	/* With room for it, the four wallets sit two by two. The loading and error
     states are a single item and take the full width. */
	@media (min-width: 768px) {
		.wallets {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 16px;
		}

		.wallets > .wallet-loading,
		.wallets > .info-box {
			grid-column: 1 / -1;
		}

		/* Cards in a row are the same height. A long address takes two lines and a
       short one takes one, so each QR code sits at the foot of its card: that
       keeps the codes in a row level with each other. */
		.wallet-card {
			display: flex;
			flex-direction: column;
		}

		.wallet-body {
			flex: 1;
		}

		.qr-wrapper {
			margin-top: auto;
		}
	}

	/* Desktop: the same two columns and the same gap as the tool pages, with the
     explanation set in those two columns above the wallets */
	@media (min-width: 1024px) {
		.wallets {
			gap: 28px;
		}

		.intro .info-box {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 28px;
			padding: 20px 24px;
		}

		.intro .info-box p {
			margin: 0;
		}
	}

	.wallet-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		overflow: hidden;
	}

	.wallet-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--border);
	}

	.wallet-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 9px;
		flex-shrink: 0;
	}

	.wallet-title {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.wallet-name {
		font-size: 15px;
		font-weight: 600;
		color: var(--text);
	}

	.wallet-badge {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 1px 6px;
	}

	.wallet-ticker {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		letter-spacing: 0.05em;
	}

	.wallet-body {
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
	}

	.address-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 8px 10px;
	}

	.address {
		flex: 1;
		font-family: var(--mono);
		color: var(--text-secondary);
		min-width: 0;
	}

	.address-full {
		font-size: 12px;
		word-break: break-all;
		display: none;
	}

	.address-short {
		font-size: 13px;
		display: block;
	}

	@media (min-width: 480px) {
		.address-full {
			display: block;
		}
		.address-short {
			display: none;
		}
	}

	.copy-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		font-weight: 500;
		padding: 5px 10px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.copy-btn:hover {
		border-color: var(--border-hover);
		color: var(--text);
	}

	.copy-btn.copied {
		border-color: var(--success);
		color: var(--success);
		background: rgba(34, 197, 94, 0.08);
	}

	.qr-wrapper {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 12px;
		width: 164px;
		height: 164px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.qr-img {
		display: block;
		border-radius: 4px;
	}

	.qr-missing {
		font-size: 12px;
		line-height: 1.5;
		text-align: center;
		color: var(--text-secondary);
	}

	.retry-btn {
		font-family: var(--font);
		font-size: 13px;
		font-weight: 500;
		padding: 8px 14px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface-2);
		color: var(--text);
		cursor: pointer;
		transition: border-color 0.15s ease;
	}

	.retry-btn:hover {
		border-color: var(--border-hover);
	}

	.qr-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--border);
		border-top-color: var(--text-secondary);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 380px) {
		.section h2 {
			font-size: 16px;
		}
		.wallet-header {
			padding: 12px 14px;
		}
		.wallet-body {
			padding: 12px 14px;
		}
	}

	/* Fingers need a larger target than a mouse pointer does */
	@media (pointer: coarse) {
		.retry-btn {
			min-height: 44px;
		}
	}
</style>
