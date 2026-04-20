<script lang="ts">
  import { NavBar, PageHeader, PageFooter, SEO } from '$lib/components';
  import { COPY_FEEDBACK_MS } from '$lib/constants';
  import { fetchWallets, truncateAddress, generateQrDataUrls } from '$lib/donations';
  import type { Wallet } from '$lib/donations';
  import { onMount, onDestroy } from 'svelte';

  let copiedAddress = $state<string | null>(null);
  let qrDataUrls = $state<Record<string, string>>({});
  let wallets = $state<Wallet[]>([]);
  let loading = $state(true);
  let waking = $state(false);
  let error = $state('');
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  const loadingCoins = [
    { name: 'Solana', color: '#9945FF' },
    { name: 'Ethereum', color: '#627EEA' },
    { name: 'Bitcoin', color: '#F7931A' }
  ];
  let loadingCoinIndex = $state(0);
  const loadingCoin = $derived(loadingCoins[loadingCoinIndex]);
  let loadingCycleTimer: ReturnType<typeof setInterval> | null = null;

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      return;
    }
    if (copyTimer) clearTimeout(copyTimer);
    copiedAddress = address;
    copyTimer = setTimeout(() => { copiedAddress = null; }, COPY_FEEDBACK_MS);
  }

  onMount(async () => {
    loadingCycleTimer = setInterval(() => {
      loadingCoinIndex = (loadingCoinIndex + 1) % loadingCoins.length;
    }, 2000);
    try {
      wallets = await fetchWallets('pgp-converter', () => { waking = true; });
      waking = false;
      qrDataUrls = await generateQrDataUrls(wallets);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load wallet addresses.';
    }
    if (loadingCycleTimer) {
      clearInterval(loadingCycleTimer);
      loadingCycleTimer = null;
    }
    loading = false;
  });

  onDestroy(() => {
    if (copyTimer) clearTimeout(copyTimer);
    if (loadingCycleTimer) clearInterval(loadingCycleTimer);
  });
</script>

<SEO
  title="Donate to PGP Converter: Support Free Open-Source Encryption"
  description="Support PGP Converter, a free and open-source browser-based PGP encryption tool. Donate with Solana, Ethereum, or Bitcoin. No accounts required."
  path="/donate"
/>

<div class="app">
  <NavBar currentPage="donate" />

  <main class="main">
    <PageHeader title="Support PGP Converter" iconClass="donate">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </PageHeader>

    <section class="section">
      <div class="info-box">
        <p>PGP Converter is free, built and maintained by one person; no ads, runs entirely in your browser, and your data never touches a server.</p>
        <p>If it's been useful to you, any donation is genuinely appreciated. Crypto only; no accounts, no personal data required.</p>
      </div>
    </section>

    <section class="section">
      <h2>Donate with Crypto</h2>
      <div class="wallets">
        {#if error}
          <div class="info-box"><p>{error}</p></div>
        {:else if loading}
          <div class="wallet-loading" role="status" aria-label="Loading wallet addresses">
            <div class="wallet-loading-spinner" aria-hidden="true"></div>
            <div class="wallet-loading-coin" aria-hidden="true">
              {#key loadingCoin.name}
                <span class="wallet-loading-coin-name" style="color: {loadingCoin.color}">
                  {loadingCoin.name}
                </span>
              {/key}
            </div>
            <p class="wallet-loading-subtitle">
              {#if waking}
                Fetching wallet addresses, this may take a moment...
              {:else}
                Fetching wallet addresses...
              {/if}
            </p>
          </div>
        {:else}
          {#each wallets as wallet (wallet.id)}
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
                    class="copy-btn"
                    class:copied={copiedAddress === wallet.address}
                    onclick={() => copyAddress(wallet.address)}
                    aria-label="Copy {wallet.name} address"
                  >
                    {#if copiedAddress === wallet.address}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>Copied</span>
                    {:else}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <span>Copy</span>
                    {/if}
                  </button>
                </div>

                <div class="qr-wrapper">
                  {#if qrDataUrls[wallet.id]}
                    <img
                      src={qrDataUrls[wallet.id]}
                      alt="QR code for {wallet.name}{wallet.badge ? ` (${wallet.badge})` : ''} address"
                      class="qr-img"
                      width="140"
                      height="140"
                    />
                  {:else}
                    <div class="qr-spinner" aria-label="Loading QR code"></div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </section>

    <PageFooter />
  </main>
</div>

<style>
  .app {
    padding-bottom: 0;
  }

  .app :global(.nav-group) {
    flex-wrap: wrap;
    justify-content: center;
  }

  .main {
    max-width: 640px;
    margin: 0 auto;
    padding: 12px 20px 60px;
    padding-left: calc(20px + var(--safe-left));
    padding-right: calc(20px + var(--safe-right));
    padding-bottom: calc(60px + var(--safe-bottom));
  }

  @media (min-width: 768px) {
    .main {
      max-width: 820px;
    }
  }

  .app :global(.header) {
    margin-bottom: 32px;
  }

  .section { margin-bottom: 40px; }
  .section h2 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: var(--text); }

  .info-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 18px;
  }
  .info-box p { font-size: 14px; line-height: 1.7; color: var(--text-secondary); margin: 0 0 10px; }
  .info-box p:last-child { margin-bottom: 0; }

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
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .wallet-loading-spinner { animation-duration: 2.5s; }
    .wallet-loading-coin-name { animation: none; }
  }

  .wallets {
    display: flex;
    flex-direction: column;
    gap: 12px;
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
    font-size: 11px;
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
    border-radius: 8px;
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
    .address-full { display: block; }
    .address-short { display: none; }
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
    border-radius: 10px;
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

  .qr-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border);
    border-top-color: var(--text-secondary);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 380px) {
    .app :global(h1) { font-size: 18px; }
    .section h2 { font-size: 16px; }
    .wallet-header { padding: 12px 14px; }
    .wallet-body { padding: 12px 14px; }
  }
</style>
