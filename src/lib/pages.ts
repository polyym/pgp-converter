/** The five tools, each a page of its own */
export type ToolName = 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'generate';

/** Every page that has an entry in the top bar */
export type PageName = 'home' | ToolName | 'about' | 'donate';

export interface ToolLink {
	href: string;
	page: ToolName;
	label: string;
}

/** The tools in the order the top bar lists them */
export const TOOL_LINKS: readonly ToolLink[] = [
	{ href: '/encrypt', page: 'encrypt', label: 'Encrypt' },
	{ href: '/decrypt', page: 'decrypt', label: 'Decrypt' },
	{ href: '/sign', page: 'sign', label: 'Sign' },
	{ href: '/verify', page: 'verify', label: 'Verify' },
	{ href: '/generate', page: 'generate', label: 'Generate' }
];
