// Reads the arguments of scripts/verify-deploy.ts and says what is wrong with
// them, before anything is asked of the site. A mistyped option would
// otherwise be taken for the site or the build, or be dropped, and the wrong
// check would run.

export const STAGING_FLAG = '--staging';
export const SELF_HOSTED_FLAG = '--self-hosted';
const FLAGS: ReadonlySet<string> = new Set([STAGING_FLAG, SELF_HOSTED_FLAG]);
const OPTION_PREFIX = '-';
// The site, and the build folder
const MAX_POSITIONAL = 2;
const WEB_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);
const DEFAULT_BUILD_DIR = 'build';

/** What the deploy check is asked to do */
export interface CheckArgs {
	/** The site to check, for example "https://pgp-converter.com" */
	origin: string;
	/** The build to compare it with */
	buildDir: string;
	isStaging: boolean;
	isSelfHosted: boolean;
}

/** What reading the arguments gave */
export interface CheckArgsResult {
	success: boolean;
	data?: CheckArgs;
	error?: string;
}

/**
 * Reads the arguments the deploy check was given.
 * @param args - The arguments that follow the script's name
 * @param isFolder - Says whether a path is a folder that exists
 * @returns The site, the build folder and the mode, or what is wrong with them
 */
export function readCheckArgs(
	args: readonly string[],
	isFolder: (path: string) => boolean
): CheckArgsResult {
	const unknown = args.find((arg) => arg.startsWith(OPTION_PREFIX) && !FLAGS.has(arg));
	if (unknown) {
		return { success: false, error: `Unknown option: ${unknown}` };
	}
	const isStaging = args.includes(STAGING_FLAG);
	const isSelfHosted = args.includes(SELF_HOSTED_FLAG);
	if (isStaging && isSelfHosted) {
		return {
			success: false,
			error: `${STAGING_FLAG} and ${SELF_HOSTED_FLAG} cannot be used together.`
		};
	}
	const positional = args.filter((arg) => !arg.startsWith(OPTION_PREFIX));
	if (positional.length > MAX_POSITIONAL) {
		return {
			success: false,
			error: `Too many arguments: ${positional.slice(MAX_POSITIONAL).join(' ')}`
		};
	}
	const [origin = '', buildDir = DEFAULT_BUILD_DIR] = positional;
	if (!URL.canParse(origin) || !WEB_PROTOCOLS.has(new URL(origin).protocol)) {
		return { success: false, error: origin ? `Not a web address: ${origin}` : 'No site to check.' };
	}
	if (!isFolder(buildDir)) {
		return { success: false, error: `No ${buildDir} directory; build the site first.` };
	}
	return { success: true, data: { origin, buildDir, isStaging, isSelfHosted } };
}
