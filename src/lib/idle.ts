export interface IdleWatchOptions {
	/** How long without activity counts as idle, in milliseconds */
	timeoutMs: number;
	/** Whether there is anything on the page worth clearing */
	isArmed: () => boolean;
	/** What to do once the time is up */
	onIdle: () => void;
	/** The clock; replaced in tests */
	now?: () => number;
}

export interface IdleWatch {
	/** Records that the user has just done something */
	touch(): void;
	/**
	 * Runs the idle action if the time is up
	 * @returns True if it ran
	 */
	check(): boolean;
}

/**
 * Keeps track of how long it has been since the user last did anything, and
 * acts once that has been too long. It holds no timer of its own: the caller
 * reports activity with touch() and asks with check(), which also works after
 * a phone has frozen the page in the background and woken it again.
 * @param options - The time limit, when it applies, and what to do
 * @returns The watch
 */
export function createIdleWatch(options: IdleWatchOptions): IdleWatch {
	// Read through Date each time, not captured once, so the page's clock is the only clock
	const now = options.now ?? (() => Date.now());
	let lastActivity = now();

	return {
		touch() {
			lastActivity = now();
		},
		check() {
			// With nothing to clear there is nothing to time; the clock starts when something appears
			if (!options.isArmed()) {
				lastActivity = now();
				return false;
			}
			if (now() - lastActivity < options.timeoutMs) {
				return false;
			}
			options.onIdle();
			lastActivity = now();
			return true;
		}
	};
}
