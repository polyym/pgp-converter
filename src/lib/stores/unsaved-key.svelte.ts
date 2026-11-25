import { onMount } from 'svelte';
import { beforeNavigate, goto } from '$app/navigation';
import { takeKey } from '#lib/handoff.ts';
import { appUpdate } from './app-update.svelte.ts';

/** What the user was about to do when the page stopped to ask about an unsaved key */
type PendingStep =
	{ about: 'leaving'; to: string } | { about: 'replacing' } | { about: 'updating' };

/** The wording of one question, for the dialog that asks it */
export interface UnsavedKeyQuestion {
	title: string;
	body: string;
	confirm: string;
	cancel: string;
}

export interface UnsavedKeyGuardOptions {
	/** Whether a private key is on the page that has been neither copied nor downloaded */
	hasUnsavedKey: () => boolean;
	/** Generates a new key pair; called once the user has agreed to lose the one on screen */
	onReplace: () => void;
}

const QUESTIONS: Readonly<Record<PendingStep['about'], UnsavedKeyQuestion>> = {
	leaving: {
		title: 'Leave without your private key?',
		body: 'You have not copied or downloaded the private key. It cannot be shown again, and without it nothing encrypted to this key can ever be read.',
		confirm: 'Leave without it',
		cancel: 'Stay and save it'
	},
	replacing: {
		title: 'Replace the key you have not saved?',
		body: 'Generating again makes a different key pair. The private key on screen has not been copied or downloaded, and it cannot be brought back.',
		confirm: 'Replace it',
		cancel: 'Keep this key'
	},
	updating: {
		title: 'Update without your private key?',
		body: 'Updating reloads the page. The private key on screen has not been copied or downloaded, and it cannot be shown again.',
		confirm: 'Update anyway',
		cancel: 'Stay and save it'
	}
};

/**
 * Guards an unsaved private key on the Generate page. Until it is copied or
 * downloaded the key exists only in page memory, so in-app navigation,
 * generating again and the Update button all ask first. Closing the tab,
 * reloading and typing an address get the browser's own leave-page prompt. A
 * same-tab link to another site is blocked with no prompt at all.
 * Uses beforeNavigate and onMount, so call it during component initialisation.
 */
export function createUnsavedKeyGuard(options: UnsavedKeyGuardOptions) {
	let pending = $state<PendingStep>();
	// Set once the user agrees to leave or update without saving the key
	let isLeavingAnyway = false;
	const question = $derived(QUESTIONS[pending?.about ?? 'leaving']);

	function ask(step: PendingStep): void {
		pending = step;
	}

	// Cancelling a navigation that would unload the page makes the browser show
	// its leave-page prompt when the browser started it (closing, reloading, a
	// typed address). For a same-tab link off the site, SvelteKit cancels
	// without a prompt, so the click does nothing. In-app navigation gets this
	// page's dialog instead.
	beforeNavigate((navigation) => {
		if (!options.hasUnsavedKey() || isLeavingAnyway) {
			return;
		}
		navigation.cancel();
		if (navigation.willUnload || !navigation.to) {
			return;
		}
		const { pathname, search, hash } = navigation.to.url;
		ask({ about: 'leaving', to: pathname + search + hash });
	});

	/** Carries out the pending step once the user agrees to lose the key */
	function goAhead(): void {
		const agreed = pending;
		pending = undefined;
		if (!agreed) {
			return;
		}
		switch (agreed.about) {
			case 'leaving': {
				isLeavingAnyway = true;
				const { to } = agreed;
				// goto rejects a URL outside the app's routes, so let the browser load it
				goto(to).catch(() => {
					window.location.assign(to);
				});
				break;
			}
			case 'replacing': {
				options.onReplace();
				break;
			}
			case 'updating': {
				// Set first, so beforeNavigate lets the reload through without a browser prompt
				isLeavingAnyway = true;
				appUpdate.applyNow();
				break;
			}
			default: {
				break;
			}
		}
	}

	/** Closes the dialog and keeps the key on the page */
	function stay(): void {
		pending = undefined;
		// The link that was cancelled may have offered the key to the next page;
		// withdraw it so a later visit to that page does not pick it up
		takeKey();
	}

	/**
	 * For the Generate button: asks first if generating again would replace an
	 * unsaved key. Returns true when the dialog is shown, and the caller must
	 * then not generate; goAhead calls onReplace if the user agrees.
	 */
	function askBeforeReplacing(): boolean {
		if (!options.hasUnsavedKey()) {
			return false;
		}
		ask({ about: 'replacing' });
		return true;
	}

	// The Update button reloads the page, so it gets this page's dialog too.
	// holdFor returns the release function, which onMount runs on destroy.
	onMount(() =>
		appUpdate.holdFor(() => {
			if (!options.hasUnsavedKey()) {
				return false;
			}
			ask({ about: 'updating' });
			return true;
		})
	);

	return {
		get isAsking() {
			return pending !== undefined;
		},
		get question() {
			return question;
		},
		goAhead,
		stay,
		askBeforeReplacing
	};
}
