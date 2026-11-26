import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Returns every file under `dir`, recursively, as forward-slash paths relative
 * to it, sorted the same way on every machine. Directories are not listed
 * themselves, and symbolic links are listed as files without being followed.
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

// Compares UTF-16 code units, not localeCompare, so the order does not depend
// on the locale of the machine running the build
function byCharacterCode(a: string, b: string): number {
	if (a < b) {
		return -1;
	}
	return a > b ? 1 : 0;
}
