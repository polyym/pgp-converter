import { describe, it, expect } from 'vitest';
import { readCheckArgs } from './check-args.ts';

const SITE = 'https://pgp-converter.com';
const isBuild = (path: string): boolean => path === 'build' || path === 'other-build';

describe('readCheckArgs', () => {
	it('should parse the commands the workflows and the README run', () => {
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

	it('should default the build directory to build', () => {
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

	it('should refuse an unknown option', () => {
		for (const option of ['--selfhosted', '--help', '-h']) {
			expect(readCheckArgs([SITE, 'build', option], isBuild)).toEqual({
				success: false,
				error: `Unknown option: ${option}`
			});
		}
	});

	it('should refuse --staging with --self-hosted', () => {
		expect(readCheckArgs([SITE, '--staging', '--self-hosted'], isBuild).error).toContain(
			'cannot be used together'
		);
	});

	it('should refuse more than an origin and a build directory', () => {
		expect(readCheckArgs([SITE, 'build', 'extra'], isBuild).error).toBe(
			'Too many arguments: extra'
		);
	});

	it('should refuse a missing origin or one that is not http or https', () => {
		expect(readCheckArgs([], isBuild).error).toBe('No site to check.');
		expect(readCheckArgs(['not-a-url'], isBuild).error).toBe('Not a web address: not-a-url');
		expect(readCheckArgs(['ftp://example.org'], isBuild).error).toBe(
			'Not a web address: ftp://example.org'
		);
	});

	it('should refuse a build directory that does not exist', () => {
		expect(readCheckArgs([SITE, 'nowhere'], isBuild).error).toBe(
			'No nowhere directory; build the site first.'
		);
	});
});
