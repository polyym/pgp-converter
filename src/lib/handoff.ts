/**
 * A key passed from the Generate page to the next page the visitor opens. It
 * lives in a module variable and is never written to storage, so it is gone
 * once collected or when the tab is reloaded or closed.
 */
export interface KeyHandoff {
	publicKey?: string;
	privateKey?: string;
}

let pending: KeyHandoff | undefined;

/** Leaves a key for the next page to collect, replacing any key not yet collected */
export function offerKey(key: KeyHandoff): void {
	pending = key;
}

/** Returns the key left for this page and forgets it, or undefined if there is none */
export function takeKey(): KeyHandoff | undefined {
	const key = pending;
	pending = undefined;
	return key;
}
