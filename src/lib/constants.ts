// Units
export const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

// Where the app lives
export const SITE_URL = 'https://pgp-converter.com';
export const REPOSITORY_URL = 'https://github.com/polyym/pgp-converter';

// Messages that come and go
export const LOADING_DELAY_MS = 200;
export const SUCCESS_TOAST_MS = 2500;
export const ERROR_TOAST_MS = 4000;
export const COPY_FEEDBACK_MS = 1500;
export const COPY_ERROR_MS = 3000;
// How long a note under a key or message box stays before it goes away again
export const FIELD_NOTE_MS = 5000;

// Keys and passphrases
// How long to wait after the last keystroke before reading a pasted public key
export const KEY_INSPECT_DELAY_MS = 250;
export const MIN_PASSPHRASE_LENGTH = 8;
// Intentionally permissive: rejects empty parts and whitespace, but does not enforce
// full RFC 5322. PGP user IDs tolerate free-form emails, and the recipient's client
// is the authoritative validator.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Large messages and results
// How much a message may unpack to when it is opened. A message can be
// compressed, and one built for the purpose is a few kilobytes that unpack to
// gigabytes. No real message comes near this.
export const MAX_UNPACKED_MESSAGE_MB = 16;
export const MAX_UNPACKED_MESSAGE_BYTES = MAX_UNPACKED_MESSAGE_MB * 1024 * 1024;
// The same limit, as the option OpenPGP.js takes wherever it reads a message
export const MESSAGE_READING_LIMITS = { maxDecompressedMessageSize: MAX_UNPACKED_MESSAGE_BYTES };
// How much of a result is put on the page. Where a screen reader or a similar
// tool is attached, a browser takes four times as long each time the text
// doubles: a third of a second for this much, over a minute for two megabytes.
// Copying and downloading always give the whole result.
export const RESULT_PREVIEW_CHARS = 100_000;

// Clearing a page
// How long the Clear button stays armed while it waits for a second press
export const CLEAR_CONFIRM_MS = 4000;
// How long a tool page may sit untouched before its keys, passphrases and messages are cleared
export const IDLE_CLEAR_MS = 15 * MS_PER_MINUTE;
// The same wait in minutes, for telling people about it
export const IDLE_CLEAR_MINUTES = IDLE_CLEAR_MS / MS_PER_MINUTE;
// How often the page looks at the clock while it waits
export const IDLE_CHECK_MS = 30 * MS_PER_SECOND;
// What some browsers report as the key code of any key pressed while an input
// method is composing text
export const COMPOSING_KEY_CODE = 229;

// Moving around
// How long a page change waits for the browser to start its cross-fade before
// the new page is shown without one
export const PAGE_FADE_WAIT_MS = 250;
// On the About page, how far below the top bar a heading has to pass before
// its section counts as the one being read
export const SECTION_MARK_OFFSET_PX = 40;
// How close to the foot of a page still counts as the very bottom
export const PAGE_BOTTOM_TOLERANCE_PX = 2;

// On-screen keyboards
// How much of the window has to be covered before it is taken for a keyboard.
// The row of shortcuts a tablet shows for a hardware keyboard is about 55px
// tall, and the lowest phone keyboards about 160px.
export const KEYBOARD_MIN_HEIGHT_PX = 120;

// Updating the app
// How often an open app asks whether there is a newer version, at most
export const UPDATE_CHECK_INTERVAL_MS = 60 * MS_PER_MINUTE;
// How long to wait for the new version to take over before reloading anyway
export const UPDATE_TAKEOVER_TIMEOUT_MS = 4000;
// How long after asking for a reload the page counts as having stayed
export const UPDATE_STAYED_AFTER_MS = 1500;

// Donations
export const DONATION_COOLDOWN_MS = MS_PER_DAY;
export const DONATION_STORAGE_KEY = 'pgp_donation_dismissed_at';
// How often the Donate page changes the coin it shows while addresses load
export const LOADING_COIN_CYCLE_MS = 2000;
// The wallet service sleeps when unused. While it wakes, the Donate page asks
// again this often, and this many times at most: about two and a half minutes.
export const WALLET_RETRY_DELAY_MS = 10 * MS_PER_SECOND;
export const WALLET_MAX_RETRIES = 15;
