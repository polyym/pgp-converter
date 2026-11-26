/**
 * Attributes that ask the Grammarly and LanguageTool extensions to skip a field,
 * because they send its text to their servers for checking. Extensions honour
 * them voluntarily; nothing enforces them.
 */
export const KEEP_ASSISTANTS_OUT = {
	'data-gramm': 'false',
	'data-gramm_editor': 'false',
	'data-enable-grammarly': 'false',
	'data-lt-active': 'false'
} as const;
