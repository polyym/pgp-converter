// Units
export const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

// Addresses
export const SITE_URL = 'https://pgp-converter.com';
export const REPOSITORY_URL = 'https://github.com/polyym/pgp-converter';
// The project's default Netlify hostname. Branch deploys and deploy previews are
// served at <name>--pgp-converter.netlify.app.
export const HOST_PROJECT_ADDRESS = 'pgp-converter.netlify.app';

// Feedback timing
// Pause before a tool's work starts, so the loading state paints first
export const LOADING_DELAY_MS = 200;
export const SUCCESS_TOAST_MS = 2500;
export const ERROR_TOAST_MS = 4000;
export const COPY_FEEDBACK_MS = 1500;
export const COPY_ERROR_MS = 3000;
// How long a note under a text field stays visible
export const FIELD_NOTE_MS = 5000;

// Keys and passphrases
// Debounce between the last edit to a key field and parsing its contents
export const KEY_INSPECT_DELAY_MS = 250;
export const MIN_PASSPHRASE_LENGTH = 8;
// Checks only the overall shape (name@domain.tld, no whitespace), not RFC 5322:
// an OpenPGP user ID is free-form text.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// OpenPGP.js config for every call that checks what a key may be used for, so all
// pages agree. By default OpenPGP.js refuses a key or subkey that has no key flags
// subpacket, as older software writes them, so valid signatures from it fail to
// verify. With this option such a key may do whatever its algorithm supports, as in
// GnuPG. Flags that are present still apply, and a signing subkey still needs its
// cross-certification.
export const KEY_USE_SETTINGS = { allowMissingKeyFlags: true };

// Size limits
// Decompression limit for messages: a crafted compressed message of a few
// kilobytes can inflate to gigabytes. No legitimate message comes near it.
export const MAX_UNPACKED_MESSAGE_MB = 16;
export const MAX_UNPACKED_MESSAGE_BYTES = MAX_UNPACKED_MESSAGE_MB * 1024 * 1024;
// The same limit as OpenPGP.js config, for every call that reads a message
export const MESSAGE_READING_LIMITS = { maxDecompressedMessageSize: MAX_UNPACKED_MESSAGE_BYTES };

// Longest result rendered into the page, in UTF-16 code units. With a screen reader
// or other assistive technology attached, rendering time grows with the square of
// the length: about a third of a second at this size, over a minute at 2 MB. Copy
// and download always use the whole result.
export const RESULT_PREVIEW_CHARS = 100_000;

// Clearing
// How long the Clear button waits for a confirming second press
export const CLEAR_CONFIRM_MS = 4000;
// Inactivity after which a tool page clears its fields
export const IDLE_CLEAR_MS = 15 * MS_PER_MINUTE;
export const IDLE_CLEAR_MINUTES = IDLE_CLEAR_MS / MS_PER_MINUTE;
export const IDLE_CHECK_MS = 30 * MS_PER_SECOND;
// keyCode that some browsers report for a keydown that belongs to IME composition,
// sometimes with isComposing already false (Safari does this for the Enter that
// commits the text)
export const COMPOSING_KEY_CODE = 229;

// Navigation
// How long crossFade waits for the view transition callback before showing the
// new page without a fade
export const PAGE_FADE_WAIT_MS = 250;
// How far below the top bar a section heading must scroll before the About page's
// table of contents marks that section as current
export const SECTION_MARK_OFFSET_PX = 40;
// Distance from the end of the page that still counts as scrolled to the bottom,
// to absorb subpixel rounding
export const PAGE_BOTTOM_TOLERANCE_PX = 2;

// On-screen keyboard
// Smallest covered height taken for an on-screen keyboard. It sits between the
// shortcut bar a tablet shows for a hardware keyboard (about 55px) and the
// shortest phone keyboards (about 160px).
export const KEYBOARD_MIN_HEIGHT_PX = 120;

// App updates
// Minimum time between update checks when the app is brought back into view
export const UPDATE_CHECK_INTERVAL_MS = 60 * MS_PER_MINUTE;
// How long to wait for the new service worker to take control before reloading anyway
export const UPDATE_TAKEOVER_TIMEOUT_MS = 4000;
// If the page still exists this long after location.reload(), the visitor
// cancelled the leave-page prompt or the reload is slow
export const UPDATE_STAYED_AFTER_MS = 1500;

// Donations
export const DONATION_COOLDOWN_MS = MS_PER_DAY;
export const DONATION_STORAGE_KEY = 'pgp_donation_dismissed_at';
// How often the Donate page changes the coin it shows while addresses load
export const LOADING_COIN_CYCLE_MS = 2000;
// The wallet service sleeps when idle and answers 502 to 504 while it starts up,
// which the proxy passes on as 503. The Donate page retries this often, this many
// times: two and a half minutes of waiting, plus the time each request takes, up
// to the proxy's UPSTREAM_TIMEOUT_MS when the service does not answer.
export const WALLET_RETRY_DELAY_MS = 10 * MS_PER_SECOND;
export const WALLET_MAX_RETRIES = 15;
