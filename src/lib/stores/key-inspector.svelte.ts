import { inspectKeys, type KeyInfo, type KeyPurpose } from '#lib/keys.ts';
import { KEY_INSPECT_DELAY_MS } from '#lib/constants.ts';

/**
 * Describes the keys in a text box shortly after the user stops typing, so the
 * page can show whose they are before anything is done with them.
 * Call while a component is being set up.
 * @param text - Returns the current contents of the box
 * @param purpose - What the keys are about to be used for
 * @returns Reactive details of every readable key in the box
 */
export function createKeyInspector(text: () => string, purpose: KeyPurpose) {
	let keys = $state<KeyInfo[]>([]);
	let latest = 0;

	$effect(() => {
		const current = text();
		// Every change to the box makes any read still under way out of date
		latest++;
		if (!current.trim()) {
			keys = [];
			return;
		}
		const id = latest;
		const timer = setTimeout(() => {
			void inspectKeys(current, purpose).then((found) => {
				// A slower, older read must not overwrite a newer one
				if (id === latest) {
					keys = found;
				}
			});
		}, KEY_INSPECT_DELAY_MS);
		return () => {
			clearTimeout(timer);
		};
	});

	return {
		get keys() {
			return keys;
		}
	};
}
