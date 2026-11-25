import { afterEach, describe, it, expect, vi } from 'vitest';
import { getBuildTime } from './build-time.ts';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

describe('getBuildTime', () => {
	it('should use SOURCE_DATE_EPOCH when it is set', () => {
		vi.stubEnv('SOURCE_DATE_EPOCH', '1794500000');
		expect(getBuildTime()).toBe(1_794_500_000_000);
	});

	it('should use the clock when SOURCE_DATE_EPOCH is unset', () => {
		vi.stubEnv('SOURCE_DATE_EPOCH', undefined);
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-11-13T12:00:00Z'));
		expect(getBuildTime()).toBe(Date.parse('2026-11-13T12:00:00Z'));
	});

	it('should use the clock when SOURCE_DATE_EPOCH is not a positive number', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-11-13T12:00:00Z'));
		for (const value of ['', 'yesterday', '0', '-5']) {
			vi.stubEnv('SOURCE_DATE_EPOCH', value);
			expect(getBuildTime()).toBe(Date.parse('2026-11-13T12:00:00Z'));
		}
	});
});
