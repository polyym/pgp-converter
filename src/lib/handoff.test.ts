import { describe, it, expect } from 'vitest';
import { offerKey, takeKey } from './handoff.ts';

describe('key handoff', () => {
	it('should hand over the key that was left', () => {
		offerKey({ publicKey: 'PUBLIC' });
		expect(takeKey()).toEqual({ publicKey: 'PUBLIC' });
	});

	it('should hand a key over only once', () => {
		offerKey({ privateKey: 'PRIVATE' });
		takeKey();
		expect(takeKey()).toBeUndefined();
	});

	it('should have nothing to hand over when nothing was left', () => {
		expect(takeKey()).toBeUndefined();
	});
});
