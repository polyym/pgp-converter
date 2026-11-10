export const LOADING_DELAY_MS = 200;
export const SUCCESS_TOAST_MS = 2500;
export const ERROR_TOAST_MS = 4000;
export const COPY_FEEDBACK_MS = 1500;
export const COPY_ERROR_MS = 3000;
// How long to wait after the last keystroke before reading a pasted public key
export const KEY_INSPECT_DELAY_MS = 250;
// How long the Clear button stays armed while it waits for a second press
export const CLEAR_CONFIRM_MS = 4000;
export const MIN_PASSPHRASE_LENGTH = 8;
// Intentionally permissive: rejects empty parts and whitespace, but does not enforce
// full RFC 5322. PGP user IDs tolerate free-form emails, and the recipient's client
// is the authoritative validator.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Once dismissed, the donation banner stays away for a day
export const DONATION_COOLDOWN_MS = 86_400_000;
export const DONATION_STORAGE_KEY = 'pgp_donation_dismissed_at';
