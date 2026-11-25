// Writes the headers in the build's own headers file (build/_headers) as rules
// for Caddy, the web server in the Docker image. The Dockerfile runs it after
// the build, and docker/Caddyfile imports what it writes.
//
// Usage: node scripts/write-caddy-headers.ts <build-dir> <output-file>

import { realpathSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { toCaddyHeaders } from './caddy-headers.ts';
import { isInside } from './paths.ts';

// What the script ends with: the file could not be converted, the script was
// not given what it needs, or the result could not be written
const EXIT_WRONG = 1;
const EXIT_USAGE = 2;
const EXIT_CANNOT_WRITE = 3;
const USAGE = 'Usage: node scripts/write-caddy-headers.ts <build-dir> <output-file>';
const NOTICE =
	'# Written by scripts/write-caddy-headers.ts from the build it is served with; do not edit.\n';

const [buildDir = '', outputFile = ''] = process.argv.slice(2);

await main();

async function main(): Promise<void> {
	if (!buildDir || !outputFile) {
		stop(USAGE, EXIT_USAGE);
	}
	// Inside the build it would be served to visitors, and the build would no
	// longer be the one a production deploy makes. Links are followed first.
	const realOutput = join(realOrResolved(dirname(outputFile)), basename(outputFile));
	if (isInside(realOutput, realOrResolved(buildDir))) {
		stop(`${outputFile} is inside ${buildDir}; write the rules outside the build.`, EXIT_USAGE);
	}
	const source = join(buildDir, '_headers');
	const text = await readFile(source, 'utf-8').catch((e: unknown) => {
		stop(`Cannot read ${source} (${describeError(e)}); build the site first.`, EXIT_USAGE);
	});
	const result = toCaddyHeaders(text);
	if (!result.success || result.data === undefined) {
		stop(`${source}: ${result.error ?? 'could not be converted.'}`);
	}
	await writeFile(outputFile, NOTICE + result.data).catch((e: unknown) => {
		stop(`Cannot write ${outputFile} (${describeError(e)}).`, EXIT_CANNOT_WRITE);
	});
	console.log(`Headers from ${source} written to ${outputFile} for Caddy.`);
}

/** The path with every link in it followed, or as it is written if it does not exist yet */
function realOrResolved(path: string): string {
	try {
		return realpathSync(path);
	} catch {
		return resolve(path);
	}
}

/** Says what is wrong and ends the script */
function stop(message: string, exitCode = EXIT_WRONG): never {
	console.error(message);
	process.exit(exitCode);
}

function describeError(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}
