import { describe, it, expect } from 'vitest';
import { siteCopy } from './site-address.ts';

describe('siteCopy', () => {
	it('should know the released site', () => {
		expect(siteCopy('pgp-converter.com', false)).toBe('released');
	});

	it('should know the released site however it is spelt', () => {
		expect(siteCopy('PGP-Converter.com', false)).toBe('released');
		expect(siteCopy('pgp-converter.com.', false)).toBe('released');
	});

	it('should call the staging address a test copy', () => {
		expect(siteCopy('dev--pgp-converter.netlify.app', false)).toBe('test');
	});

	it("should call the preview of a pull request and the host's own address test copies", () => {
		expect(siteCopy('6916f0a1b2c3d4e5f6a7b8c9--pgp-converter.netlify.app', false)).toBe('test');
		expect(siteCopy('deploy-preview-12--pgp-converter.netlify.app', false)).toBe('test');
		expect(siteCopy('pgp-converter.netlify.app', false)).toBe('test');
		expect(siteCopy('Dev--PGP-Converter.netlify.app.', false)).toBe('test');
	});

	it('should call the development server a test copy at any address', () => {
		expect(siteCopy('localhost', true)).toBe('test');
		expect(siteCopy('192.168.1.20', true)).toBe('test');
	});

	it('should call a production build on its own machine self-hosted', () => {
		expect(siteCopy('localhost', false)).toBe('self-hosted');
		expect(siteCopy('127.0.0.1', false)).toBe('self-hosted');
		expect(siteCopy('[::1]', false)).toBe('self-hosted');
		expect(siteCopy('192.168.1.20', false)).toBe('self-hosted');
	});

	it("should call a copy at someone's own domain self-hosted", () => {
		expect(siteCopy('pgp.example.org', false)).toBe('self-hosted');
	});

	it('should not take a name that only contains a known one for it', () => {
		expect(siteCopy('pgp-converter.com.example.org', false)).toBe('self-hosted');
		expect(siteCopy('staging.pgp-converter.com', false)).toBe('self-hosted');
		expect(siteCopy('my-pgp-converter.netlify.app', false)).toBe('self-hosted');
		expect(siteCopy('pgp-converter.netlify.app.example.org', false)).toBe('self-hosted');
	});

	it('should call a page with no host at all self-hosted', () => {
		expect(siteCopy('', false)).toBe('self-hosted');
	});
});
