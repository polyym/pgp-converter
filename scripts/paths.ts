import { isAbsolute, relative, resolve, sep } from 'node:path';

const PARENT = '..';

/**
 * Says whether a path is a folder or lies within it. Only the names are
 * compared, so links must be resolved first (realpath) to be followed.
 * @param path - The path to place
 * @param folder - The folder it may be in
 * @returns True if the path is the folder or anywhere below it
 */
export function isInside(path: string, folder: string): boolean {
	const fromFolder = relative(resolve(folder), resolve(path));
	// Outside: a way up out of the folder, or another drive altogether
	const isOutside =
		fromFolder === PARENT || fromFolder.startsWith(PARENT + sep) || isAbsolute(fromFolder);
	return !isOutside;
}
