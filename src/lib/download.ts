/**
 * Saves text as a file on the user's device, through a temporary link.
 * Nothing is uploaded: the file is made by the browser from text it already holds.
 * @param content - The text to save, such as a key or a message
 * @param filename - The name to give the file
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
