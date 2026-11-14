/**
 * Says whether a result still belongs to the form it sits beside. Once an
 * input is edited the result stays on screen, but copying it would send the
 * earlier message, or one for the earlier recipient.
 * @param madeFrom - The inputs the result was made from; undefined when there is no result
 * @param now - The same inputs as they are now, in the same order
 * @returns True when any of them has changed since the result was made
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
