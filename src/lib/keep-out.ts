/**
 * Attributes that ask writing-assistant extensions (Grammarly, LanguageTool)
 * to leave a field alone. They check text by sending it to their own servers.
 * This is a request, not a lock: an extension is free to ignore it.
 */
export const KEEP_ASSISTANTS_OUT = {
	'data-gramm': 'false',
	'data-gramm_editor': 'false',
	'data-enable-grammarly': 'false',
	'data-lt-active': 'false'
} as const;
