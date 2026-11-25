import { SUCCESS_TOAST_MS, ERROR_TOAST_MS } from '#lib/constants.ts';

/**
 * Creates the success and error toast state for a page. One message shows at
 * a time, and showing one cancels the earlier message's timer, so that timer
 * cannot hide the new message early.
 */
export function createFeedback() {
	let success = $state('');
	let error = $state('');
	let successTimer: ReturnType<typeof setTimeout> | undefined;
	let errorTimer: ReturnType<typeof setTimeout> | undefined;

	function clearSuccess() {
		clearTimeout(successTimer);
		success = '';
	}

	function clearError() {
		clearTimeout(errorTimer);
		error = '';
	}

	return {
		get success() {
			return success;
		},
		get error() {
			return error;
		},
		/** Shows a success message for `duration` ms, replacing any message on screen */
		showSuccess(message: string, duration = SUCCESS_TOAST_MS) {
			clearSuccess();
			clearError();
			success = message;
			successTimer = setTimeout(() => {
				success = '';
			}, duration);
		},
		/** Shows an error message for `duration` ms, replacing any message on screen */
		showError(message: string, duration = ERROR_TOAST_MS) {
			clearSuccess();
			clearError();
			error = message;
			errorTimer = setTimeout(() => {
				error = '';
			}, duration);
		},
		/** Removes both messages and cancels their timers */
		clear() {
			clearSuccess();
			clearError();
		}
	};
}
