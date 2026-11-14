/**
 * A key on its way from the Generate page to the page that uses it next. Held
 * in memory only: nothing is written to storage, and it is gone once
 * collected or when the tab is reloaded or closed.
 */
export interface KeyHandoff {
	publicKey?: string;
	privateKey?: string;
}

let pending: KeyHandoff | undefined;

/**
 * Leaves a key for the next page to collect
 * @param key - The key or keys to pass on
 */
export function offerKey(key: KeyHandoff): void {
	pending = key;
}

/**
 * Collects the key left for this page, if there is one. It can be collected once.
 * @returns The key that was left, or undefined
 */
export function takeKey(): KeyHandoff | undefined {
	const key = pending;
	pending = undefined;
	return key;
}
