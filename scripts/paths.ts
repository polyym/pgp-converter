import { isAbsolute, relative, resolve, sep } from 'node:path';

const PARENT = '..';

/**
 * Returns true if `path` is `folder` or anywhere below it. Both are resolved
 * against the working directory and compared as strings, without touching
 * the file system, so symbolic links are not followed: pass realpath results
 * where they matter.
 */
export function isInside(path: string, folder: string): boolean {
	const fromFolder = relative(resolve(folder), resolve(path));
	// Outside: the relative path climbs out with .., or is absolute because the
	// two are on different Windows drives
	const isOutside =
		fromFolder === PARENT || fromFolder.startsWith(PARENT + sep) || isAbsolute(fromFolder);
	return !isOutside;
}
