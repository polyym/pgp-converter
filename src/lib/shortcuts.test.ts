import { describe, it, expect } from 'vitest';
import { isAppleDevice, getShortcutKeys } from './shortcuts';

const userAgents = {
	windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
	linux: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
	android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
	mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
	iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
};

describe('isAppleDevice', () => {
	it('should recognise Apple devices', () => {
		expect(isAppleDevice(userAgents.mac)).toBe(true);
		expect(isAppleDevice(userAgents.iphone)).toBe(true);
	});

	it('should not mistake other devices for Apple ones', () => {
		// Every browser's user agent mentions "AppleWebKit" or "Safari"; that must not count
		expect(isAppleDevice(userAgents.windows)).toBe(false);
		expect(isAppleDevice(userAgents.linux)).toBe(false);
		expect(isAppleDevice(userAgents.android)).toBe(false);
	});
});

describe('getShortcutKeys', () => {
	it('should use the Command key on Apple devices', () => {
		const keys = getShortcutKeys(true);
		expect(keys.submit).toEqual(['⌘', '↵']);
		expect(keys.submitHint).toBe('⌘↵');
		expect(keys.copyHint).toBe('⌘⇧C');
	});

	it('should use Ctrl everywhere else', () => {
		const keys = getShortcutKeys(false);
		expect(keys.submit).toEqual(['Ctrl', 'Enter']);
		expect(keys.copy).toEqual(['Ctrl', 'Shift', 'C']);
		expect(keys.submitHint).toBe('Ctrl+Enter');
		expect(keys.copyHint).toBe('Ctrl+Shift+C');
	});
});
