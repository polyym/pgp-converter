export interface IdleWatchOptions {
	timeoutMs: number;
	/** Returns whether the page holds anything worth clearing */
	isArmed: () => boolean;
	onIdle: () => void;
	/** Clock in milliseconds; tests replace it */
	now?: () => number;
}

export interface IdleWatch {
	/** Records activity, restarting the timeout */
	touch(): void;
	/** Runs onIdle and returns true if the timeout has passed while armed */
	check(): boolean;
}

/**
 * Returns an IdleWatch that starts no setTimeout or setInterval of its own: the
 * caller reports activity with touch() and polls with check(). Because check()
 * compares timestamps, it still fires on the first call after a phone wakes a
 * page it froze in the background. After onIdle runs the timeout starts again,
 * so it fires once per idle period.
 */
export function createIdleWatch(options: IdleWatchOptions): IdleWatch {
	const now = options.now ?? (() => Date.now());
	let lastActivity = now();

	return {
		touch() {
			lastActivity = now();
		},
		check() {
			// Keep restarting while there is nothing to clear, so content that appears
			// on a long-idle page gets the full timeout
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
