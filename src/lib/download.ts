/**
 * Saves text as a plain-text file by clicking a temporary link to a Blob URL,
 * which is revoked straight after. The browser builds the file from text it
 * already holds, so nothing is uploaded.
 */
export function downloadText(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.append(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
