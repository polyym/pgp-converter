import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Lists every file under a directory, however deep.
 * @param dir - The directory to read
 * @returns Forward-slash paths relative to the directory, in the same order on every machine
 */
export async function listFiles(dir: string): Promise<string[]> {
	const files = await collect(dir, '');
	return files.toSorted(byCharacterCode);
}

async function collect(dir: string, prefix: string): Promise<string[]> {
	const files: string[] = [];
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			files.push(...(await collect(join(dir, entry.name), path)));
		} else {
			files.push(path);
		}
	}
	return files;
}

// By character code, not by the machine's language: the order must not depend
// on where the build runs
function byCharacterCode(a: string, b: string): number {
	if (a < b) {
		return -1;
	}
	return a > b ? 1 : 0;
}
