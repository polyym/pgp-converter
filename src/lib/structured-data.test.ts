import { describe, it, expect } from 'vitest';
import { toStructuredDataScript, WEB_APPLICATION_DATA } from './structured-data.ts';

const OPENING = '<script type="application/ld+json">';
const CLOSING = '</script>';

function dataInside(script: string): unknown {
	return JSON.parse(script.slice(OPENING.length, -CLOSING.length));
}

describe('toStructuredDataScript', () => {
	it('should wrap the data in an application/ld+json script element', () => {
		const script = toStructuredDataScript({ name: 'PGP Converter' });
		expect(script.startsWith(OPENING)).toBe(true);
		expect(script.endsWith(CLOSING)).toBe(true);
	});

	it('should keep the data unchanged through JSON.parse', () => {
		expect(dataInside(toStructuredDataScript(WEB_APPLICATION_DATA))).toEqual(WEB_APPLICATION_DATA);
	});

	it('should escape "<" so the data cannot close the element', () => {
		const script = toStructuredDataScript({ name: '</script><script>alert(1)</script>' });
		expect(script.slice(OPENING.length, -CLOSING.length)).not.toContain('<');
		expect(dataInside(script)).toEqual({ name: '</script><script>alert(1)</script>' });
	});
});

describe('WEB_APPLICATION_DATA', () => {
	it('should name every tool the app has', () => {
		const features = WEB_APPLICATION_DATA.featureList.join(' ');
		for (const tool of [
			'Encryption',
			'Decryption',
			'Signing',
			'Verification',
			'Key Pair Generation'
		]) {
			expect(features).toContain(tool);
		}
	});

	it('should describe the app as free', () => {
		expect(WEB_APPLICATION_DATA.isAccessibleForFree).toBe(true);
		expect(WEB_APPLICATION_DATA.offers.price).toBe('0');
	});
});
