export const LOADING_DELAY_MS = 200;
export const SUCCESS_TOAST_MS = 2500;
export const ERROR_TOAST_MS = 4000;
export const COPY_FEEDBACK_MS = 1500;
export const COPY_ERROR_MS = 3000;
export const MIN_PASSPHRASE_LENGTH = 8;
// Intentionally permissive: rejects empty parts and whitespace, but does not enforce
// full RFC 5322. PGP user IDs tolerate free-form emails, and the recipient's client
// is the authoritative validator.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DONATION_COOLDOWN_MS = 600_000;
export const DONATION_STORAGE_KEY = 'pgp_donation_dismissed_at';
