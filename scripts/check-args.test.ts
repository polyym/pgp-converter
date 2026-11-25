import { describe, it, expect } from 'vitest';
import { readCheckArgs } from './check-args.ts';

const SITE = 'https://pgp-converter.com';
const isBuild = (path: string): boolean => path === 'build' || path === 'other-build';

describe('readCheckArgs', () => {
	it('should read the calls the workflows and the README make', () => {
		expect(readCheckArgs([SITE, 'build'], isBuild).data).toEqual({
			origin: SITE,
			buildDir: 'build',
			isStaging: false,
			isSelfHosted: false
		});
		expect(
			readCheckArgs(['https://dev--pgp-converter.netlify.app', 'build', '--staging'], isBuild).data
				?.isStaging
		).toBe(true);
		expect(
			readCheckArgs(['http://localhost:8080', 'build', '--self-hosted'], isBuild).data?.isSelfHosted
		).toBe(true);
	});

	it('should take the build folder as build when none is named', () => {
		expect(readCheckArgs([SITE], isBuild).data?.buildDir).toBe('build');
	});

	it('should accept the options anywhere', () => {
		expect(
			readCheckArgs(['--self-hosted', 'http://localhost:8080', 'other-build'], isBuild).data
		).toEqual({
			origin: 'http://localhost:8080',
			buildDir: 'other-build',
			isStaging: false,
			isSelfHosted: true
		});
	});

	it('should refuse an option it does not know, rather than run the wrong check', () => {
		for (const option of ['--selfhosted', '--help', '-h']) {
			expect(readCheckArgs([SITE, 'build', option], isBuild)).toEqual({
				success: false,
				error: `Unknown option: ${option}`
			});
		}
	});

	it('should refuse both modes at once', () => {
		expect(readCheckArgs([SITE, '--staging', '--self-hosted'], isBuild).error).toContain(
			'cannot be used together'
		);
	});

	it('should refuse more than a site and a build folder', () => {
		expect(readCheckArgs([SITE, 'build', 'extra'], isBuild).error).toBe(
			'Too many arguments: extra'
		);
	});

	it('should refuse a site that is not a web address', () => {
		expect(readCheckArgs([], isBuild).error).toBe('No site to check.');
		expect(readCheckArgs(['not-a-url'], isBuild).error).toBe('Not a web address: not-a-url');
		expect(readCheckArgs(['ftp://example.org'], isBuild).error).toBe(
			'Not a web address: ftp://example.org'
		);
	});

	it('should refuse a build folder that is not there as a folder', () => {
		expect(readCheckArgs([SITE, 'nowhere'], isBuild).error).toBe(
			'No nowhere directory; build the site first.'
		);
	});
});
