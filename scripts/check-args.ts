// Parses the arguments of scripts/verify-deploy.ts. Unknown options are
// rejected: a mistyped --self-hosted would otherwise be dropped, and the
// production checks would run on a self-hosted copy.

export const STAGING_FLAG = '--staging';
export const SELF_HOSTED_FLAG = '--self-hosted';
const FLAGS: ReadonlySet<string> = new Set([STAGING_FLAG, SELF_HOSTED_FLAG]);
const OPTION_PREFIX = '-';
const WEB_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);
const DEFAULT_BUILD_DIR = 'build';

/** What verify-deploy.ts checks, and against which build */
export interface CheckArgs {
	/** For example "https://pgp-converter.com" */
	origin: string;
	buildDir: string;
	isStaging: boolean;
	isSelfHosted: boolean;
}

/** The parsed arguments, or why they cannot be used */
export interface CheckArgsResult {
	success: boolean;
	data?: CheckArgs;
	error?: string;
}

/**
 * Parses `<site-origin> [build-dir] [--staging | --self-hosted]`. Options may
 * come in any position, build-dir defaults to `build`, and the origin must be
 * an http or https URL. Returns an error message rather than throwing.
 * @param isFolder - Whether a path is an existing directory; injected so the tests need no real ones
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
	const [origin = '', buildDir = DEFAULT_BUILD_DIR, ...extra] = args.filter(
		(arg) => !arg.startsWith(OPTION_PREFIX)
	);
	if (extra.length > 0) {
		return { success: false, error: `Too many arguments: ${extra.join(' ')}` };
	}
	if (!URL.canParse(origin) || !WEB_PROTOCOLS.has(new URL(origin).protocol)) {
		return { success: false, error: origin ? `Not a web address: ${origin}` : 'No site to check.' };
	}
	if (!isFolder(buildDir)) {
		return { success: false, error: `No ${buildDir} directory; build the site first.` };
	}
	return { success: true, data: { origin, buildDir, isStaging, isSelfHosted } };
}
