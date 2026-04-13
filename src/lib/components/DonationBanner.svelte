<script lang="ts">
  let {
    show,
    onDismiss
  }: {
    show: boolean;
    onDismiss: () => void;
  } = $props();
</script>

{#if show}
  <div class="donation-banner">
    <div class="donation-banner-inner">
      <p class="donation-text">
        <strong>Enjoying PGP Converter?</strong> It's free, ad-free, and your data never leaves your browser. If it's been useful, any donation is genuinely appreciated.
      </p>
      <div class="donation-actions">
        <a href="/donate" class="donate-btn">Donate</a>
        <button class="dismiss-btn" onclick={onDismiss} aria-label="Dismiss donation banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .donation-banner {
    position: fixed;
    bottom: 80px;
    left: 0;
    right: 0;
    z-index: 60;
    padding: 0 20px;
    padding-left: calc(20px + var(--safe-left));
    padding-right: calc(20px + var(--safe-right));
    animation: slideUp 0.25s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .donation-banner-inner {
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
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
    padding: 8px 16px;
    font-family: var(--font);
    font-size: 13px;
    font-weight: 600;
    color: #000;
    background: var(--text);
    border-radius: 8px;
    text-decoration: none;
    transition: background 0.15s ease;
    white-space: nowrap;
  }

  .donate-btn:hover {
    background: #e4e4e7;
  }

  .donate-btn:active {
    background: #d4d4d8;
    transform: scale(0.98);
  }

  .dismiss-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .dismiss-btn:hover {
    color: var(--text);
    border-color: var(--border-hover);
  }

  @media (min-width: 768px) {
    .donation-banner-inner {
      max-width: 720px;
    }
  }

  @media (max-width: 480px) {
    .donation-banner-inner {
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

    .donate-btn:active {
      transform: none;
    }
  }
</style>
