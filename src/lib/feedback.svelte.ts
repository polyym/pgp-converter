import { SUCCESS_TOAST_MS, ERROR_TOAST_MS } from './constants';

/**
 * Creates the success and error message state behind a page's toasts.
 * Each new message restarts its own timer, so the timer of an earlier
 * message can never hide a newer one early.
 * @returns Reactive message state with helpers to show and clear messages
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
		/** Shows a success message, replacing any message already on screen */
		showSuccess(message: string, duration = SUCCESS_TOAST_MS) {
			clearSuccess();
			clearError();
			success = message;
			successTimer = setTimeout(() => {
				success = '';
			}, duration);
		},
		/** Shows an error message, replacing any message already on screen */
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
