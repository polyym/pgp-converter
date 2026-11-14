import { describe, it, expect } from 'vitest';
import { createIdleWatch } from './idle.ts';
import { IDLE_CLEAR_MS } from './constants.ts';

const MINUTE = 60_000;

/** A watch with a clock the test moves by hand */
function setup(armed = true) {
	const state = { time: 0, armed, cleared: 0 };
	const watch = createIdleWatch({
		timeoutMs: 15 * MINUTE,
		isArmed: () => state.armed,
		onIdle: () => state.cleared++,
		now: () => state.time
	});
	return { state, watch };
}

describe('createIdleWatch', () => {
	it('should do nothing before the time is up', () => {
		const { state, watch } = setup();
		state.time = 14 * MINUTE;
		expect(watch.check()).toBe(false);
		expect(state.cleared).toBe(0);
	});

	it('should act once the time is up', () => {
		const { state, watch } = setup();
		state.time = 15 * MINUTE;
		expect(watch.check()).toBe(true);
		expect(state.cleared).toBe(1);
	});

	it('should start counting again whenever the user does something', () => {
		const { state, watch } = setup();
		state.time = 10 * MINUTE;
		watch.touch();
		state.time = 20 * MINUTE;
		expect(watch.check()).toBe(false);
		state.time = 25 * MINUTE;
		expect(watch.check()).toBe(true);
	});

	it('should act only once for one idle spell', () => {
		const { state, watch } = setup();
		state.time = 16 * MINUTE;
		watch.check();
		state.time = 17 * MINUTE;
		expect(watch.check()).toBe(false);
		expect(state.cleared).toBe(1);
	});

	it('should not act while there is nothing to clear', () => {
		const { state, watch } = setup(false);
		state.time = 60 * MINUTE;
		expect(watch.check()).toBe(false);
		expect(state.cleared).toBe(0);
	});

	it('should give a full spell to something that appears on a long-empty page', () => {
		const { state, watch } = setup(false);
		state.time = 60 * MINUTE;
		watch.check();
		state.armed = true;
		state.time = 70 * MINUTE;
		expect(watch.check()).toBe(false);
		state.time = 76 * MINUTE;
		expect(watch.check()).toBe(true);
	});

	it('should catch up at once when a frozen page wakes after the limit', () => {
		const { state, watch } = setup();
		// No checks ran while the page was frozen in the background
		state.time = 3 * 60 * MINUTE;
		expect(watch.check()).toBe(true);
	});
});

describe('IDLE_CLEAR_MS', () => {
	it('should be fifteen minutes', () => {
		expect(IDLE_CLEAR_MS).toBe(15 * MINUTE);
	});
});
