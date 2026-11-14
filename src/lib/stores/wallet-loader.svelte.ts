import { copyText } from './copy.svelte.ts';
import { COPY_FEEDBACK_MS, LOADING_COIN_CYCLE_MS } from '#lib/constants.ts';
import {
	COINS,
	fetchWallets,
	generateQrDataUrls,
	WALLET_LOAD_ERROR,
	type Wallet
} from '#lib/donations.ts';

/**
 * Creates the state behind the Donate page: the addresses and their QR
 * codes, how the loading is going, and which address was just copied.
 * @returns Reactive state for the page's markup, with the actions it offers
 */
export function createWalletLoader() {
	let wallets = $state<Wallet[]>([]);
	let qrDataUrls = $state<Record<string, string>>({});
	let isQrReady = $state(false);
	let isLoading = $state(true);
	let isWaking = $state(false);
	let error = $state('');
	let copiedAddress = $state<string>();
	let loadingCoinIndex = $state(0);
	const loadingCoin = $derived(COINS[loadingCoinIndex]);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	let coinTimer: ReturnType<typeof setInterval> | undefined;
	// Cancels the request and its retries when the visitor leaves or tries again
	let controller: AbortController | undefined;

	function stopCoinCycle(): void {
		clearInterval(coinTimer);
		coinTimer = undefined;
	}

	/** Loads the addresses, then their QR codes. Also what "Try again" does. */
	async function load(): Promise<void> {
		controller?.abort();
		const current = new AbortController();
		controller = current;
		const { signal } = current;

		isLoading = true;
		isWaking = false;
		error = '';
		isQrReady = false;
		stopCoinCycle();
		coinTimer = setInterval(() => {
			loadingCoinIndex = (loadingCoinIndex + 1) % COINS.length;
		}, LOADING_COIN_CYCLE_MS);

		const result = await fetchWallets({
			signal,
			onWaking: () => {
				isWaking = true;
			}
		});
		if (signal.aborted) {
			return;
		}
		isLoading = false;
		stopCoinCycle();
		if (!result.success || !result.data) {
			error = result.error ?? WALLET_LOAD_ERROR;
			return;
		}
		wallets = result.data;

		// A failed QR code must never hide an address that loaded fine
		const urls = await generateQrDataUrls(result.data).catch(() => ({}));
		// The visitor may have left, or tried again, while the codes were drawn
		if (controller !== current) {
			return;
		}
		qrDataUrls = urls;
		isQrReady = true;
	}

	/** Copies an address and marks it as copied for a moment */
	async function copyAddress(address: string): Promise<void> {
		if (!(await copyText(address))) {
			return;
		}
		clearTimeout(copyTimer);
		copiedAddress = address;
		copyTimer = setTimeout(() => {
			copiedAddress = undefined;
		}, COPY_FEEDBACK_MS);
	}

	/** Call when the page is left: nothing is still loading or waiting afterwards */
	function stop(): void {
		controller?.abort();
		controller = undefined;
		clearTimeout(copyTimer);
		stopCoinCycle();
	}

	return {
		/** The wallets whose addresses loaded and passed their checks */
		get wallets() {
			return wallets;
		},
		/** QR codes as data URLs, by wallet id */
		get qrDataUrls() {
			return qrDataUrls;
		},
		/** True once the QR codes have been made, whether or not each one worked */
		get isQrReady() {
			return isQrReady;
		},
		get isLoading() {
			return isLoading;
		},
		/** True while the wallet service is being woken, which takes a while */
		get isWaking() {
			return isWaking;
		},
		/** What to show in place of the addresses; empty when they loaded */
		get error() {
			return error;
		},
		get copiedAddress() {
			return copiedAddress;
		},
		get loadingCoin() {
			return loadingCoin;
		},
		load,
		copyAddress,
		stop
	};
}
