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
	/** Generates again, the user having agreed to lose the key on screen */
	onReplace: () => void;
}

// All three questions are about losing the same thing: the one copy of the private key
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
 * Stands between a new private key and the ways of losing it. A private key
 * exists nowhere but on the Generate page until it is copied or downloaded,
 * so leaving the page, generating again or updating the app asks first.
 * Closing the tab, reloading or leaving the site is asked about by the
 * browser itself.
 *
 * Call it while the page component is being set up: it listens for navigation
 * and for the Update button.
 * @param options - How to tell that a key is unsaved, and how to generate again
 * @returns The question being asked, if any, and the answers to it
 */
export function createUnsavedKeyGuard(options: UnsavedKeyGuardOptions) {
	let pending = $state<PendingStep>();
	// Set once the user has said they are going without the key
	let isLeavingAnyway = false;
	const question = $derived(QUESTIONS[pending?.about ?? 'leaving']);

	function ask(step: PendingStep): void {
		pending = step;
	}

	// Moving within the app is stopped and asked about here. The links under
	// the keys invite exactly that.
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

	/** The user agreed to go on without the key */
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
				// goto refuses an address that is not one of the app's own pages; the
				// browser is then left to go there itself
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
				// The reload that follows has been agreed to; the browser must not ask about it again
				isLeavingAnyway = true;
				appUpdate.applyNow();
				break;
			}
			default: {
				break;
			}
		}
	}

	/** The user chose to stay and save the key */
	function stay(): void {
		pending = undefined;
		// A key offered to the next page is withdrawn with the visit
		takeKey();
	}

	/**
	 * For the Generate button: asks first if generating again would replace an
	 * unsaved key.
	 * @returns True if the question was put, in which case nothing should be generated yet
	 */
	function askBeforeReplacing(): boolean {
		if (!options.hasUnsavedKey()) {
			return false;
		}
		ask({ about: 'replacing' });
		return true;
	}

	// The Update button in the top bar reloads the page, which loses an unsaved
	// key like any other way of leaving, so it asks here first, in the page's
	// own words
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
