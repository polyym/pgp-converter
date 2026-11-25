/**
 * Returns true when any input differs, by exact comparison and position by
 * position, from the inputs the result was made from. A result stays on screen
 * after an edit, and copying a stale one would send the earlier message, or one
 * encrypted for the earlier recipient. `madeFrom` is undefined when there is no
 * result, which is never out of date.
 */
export function isOutOfDate(
	madeFrom: readonly string[] | undefined,
	now: readonly string[]
): boolean {
	if (madeFrom === undefined) {
		return false;
	}
	return madeFrom.length !== now.length || madeFrom.some((value, i) => value !== now[i]);
}
