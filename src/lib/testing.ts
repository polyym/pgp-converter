/**
 * Hands back a value that a test expects to be there, and fails the test with
 * a plain message if it is not.
 * @param value - The value, which may be missing
 * @returns The same value, known to be present
 */
export function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error('A value the test relies on is missing');
	}
	return value;
}
