import { inspectKeys, type KeyInfo, type KeyPurpose } from '#lib/keys.ts';
import { KEY_INSPECT_DELAY_MS } from '#lib/constants.ts';

/**
 * Reads the keys in a text field KEY_INSPECT_DELAY_MS after its last change,
 * so the page can show whose they are before they are used. `keys` is empty
 * while the field is blank or holds no readable key. Uses $effect, so call it
 * during component initialisation.
 * @param text - Returns the field's current contents
 * @param purpose - What the keys will be used for, which sets the problems reported for
 *   each key. For 'sign' and 'decrypt' only the private key block is read.
 */
export function createKeyInspector(text: () => string, purpose: KeyPurpose) {
	let keys = $state<KeyInfo[]>([]);
	let latest = 0;

	$effect(() => {
		const current = text();
		// inspectKeys cannot be cancelled, so each change bumps the counter and a
		// slower, older read cannot overwrite a newer one
		latest++;
		if (!current.trim()) {
			keys = [];
			return;
		}
		const id = latest;
		const timer = setTimeout(() => {
			void inspectKeys(current, purpose).then((found) => {
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
