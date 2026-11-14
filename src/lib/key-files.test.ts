import { describe, it, expect } from 'vitest';
import { combineKeyPair, keyFileName } from './key-files.ts';

describe('keyFileName', () => {
	it('should name each kind of file after the owner', () => {
		expect(keyFileName('Ada', 'public')).toBe('Ada_public.asc');
		expect(keyFileName('Ada', 'private')).toBe('Ada_private.asc');
		expect(keyFileName('Ada', 'keypair')).toBe('Ada_keypair.txt');
	});

	it('should write the spaces in a name as underscores', () => {
		expect(keyFileName('Ada Lovelace', 'public')).toBe('Ada_Lovelace_public.asc');
	});

	it('should write a run of spaces or a tab as one underscore', () => {
		expect(keyFileName('Ada  \tLovelace', 'private')).toBe('Ada_Lovelace_private.asc');
	});

	it('should keep accents, apostrophes and other scripts', () => {
		expect(keyFileName("Zoë O'Brien-名前", 'public')).toBe("Zoë_O'Brien-名前_public.asc");
	});

	it('should leave out what a file name cannot hold', () => {
		expect(keyFileName('a/b\\c:d*e?f"g<h>i|j', 'public')).toBe('a_b_c_d_e_f_g_h_i_j_public.asc');
	});

	it('should not let a name climb out of the folder or hide the file', () => {
		expect(keyFileName('../../etc/passwd', 'private')).toBe('etc_passwd_private.asc');
		expect(keyFileName('.hidden', 'public')).toBe('hidden_public.asc');
	});

	it('should leave out control characters and the marks that reverse text', () => {
		const reverse = String.fromCodePoint(0x20_2e);
		const nul = String.fromCodePoint(0);
		expect(keyFileName(`Ada${reverse}Lovelace${nul}`, 'public')).toBe('Ada_Lovelace_public.asc');
	});

	it('should fall back to a plain name when nothing usable is left', () => {
		expect(keyFileName('///', 'public')).toBe('key_public.asc');
		expect(keyFileName('', 'keypair')).toBe('key_keypair.txt');
	});

	it('should cut a very long name, without cutting a character in half', () => {
		expect(keyFileName('x'.repeat(500), 'public')).toBe(`${'x'.repeat(80)}_public.asc`);
		expect(keyFileName(`a${'😀'.repeat(100)}`, 'public')).toBe(`a${'😀'.repeat(39)}_public.asc`);
	});
});

describe('combineKeyPair', () => {
	it('should put each key under its own heading, public key first', () => {
		expect(combineKeyPair('PUBLIC', 'PRIVATE')).toBe(
			'=== PUBLIC KEY ===\n\nPUBLIC\n\n=== PRIVATE KEY ===\n\nPRIVATE'
		);
	});
});
