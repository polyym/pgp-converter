// Draws the icons for the installed app and the picture shown when a link to
// the site is shared. Its output in static/ is committed, so it only needs
// running again if the design changes:
//
//   node scripts/make-icons.ts
//
// It uses nothing but Node. Each pixel is worked out from its distance to the
// key's outline, which gives smooth edges at any size.

import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { DOT_PICTURE_SIZE, pictureDots } from '../src/lib/dot-pictures.ts';

/** A colour as red, green and blue, each from 0 to 255 */
type Rgb = readonly [number, number, number];

/** A straight stroke of the key's outline, from one point to another */
type Stroke = readonly [x1: number, y1: number, x2: number, y2: number];

interface IconSpec {
	name: string;
	/** Width and height in pixels */
	size: number;
	/** How much of the width the key takes up, from 0 to 1 */
	keyShare: number;
	/** Corner radius as a share of the width; 0 for a full square */
	cornerShare: number;
}

const OUT_DIR = 'static/icons';
const BACKGROUND: Rgb = [9, 9, 11];
const KEY: Rgb = [250, 250, 250];
const BYTES_PER_PIXEL = 4;
const OPAQUE = 255;

// The key's outline in a 24-unit box: the same shape as the icon in the top bar
const RING = { x: 7.5, y: 15.5, radius: 5.5 };
const LINES: readonly Stroke[] = [
	[11.39, 11.61, 15.5, 7.5],
	[15.5, 7.5, 18.5, 10.5],
	[18.5, 10.5, 22, 7],
	[22, 7, 19, 4],
	[15.5, 7.5, 19, 4],
	[19, 4, 21, 2]
];
const CENTRE = { x: 12, y: 11.5 };
const LINE_WIDTH = 1.9;
// The key is this many units wide in its 24-unit box
const KEY_WIDTH_UNITS = 20;

const ICONS: readonly IconSpec[] = [
	// Shown as they are: a rounded tile, like the logo in the top bar
	{ name: 'icon-192.png', size: 192, keyShare: 0.6, cornerShare: 0.22 },
	{ name: 'icon-512.png', size: 512, keyShare: 0.6, cornerShare: 0.22 },
	// Cropped to a circle or another shape by the phone, so the key is smaller and the square is full
	{ name: 'icon-maskable-512.png', size: 512, keyShare: 0.46, cornerShare: 0 },
	// The iPhone home screen rounds the corners itself and does not allow see-through ones
	{ name: 'icon-180.png', size: 180, keyShare: 0.56, cornerShare: 0 }
];

// The link-preview picture is the homepage's dot grid at rest
const PGP_DOTS = pictureDots('pgp');
const UNLIT: Rgb = [22, 22, 26];
const UNLIT_EDGE: Rgb = [36, 36, 42];
const PREVIEW = { file: 'static/og-image.png', width: 1200, height: 630, cell: 40, gap: 9 };
// A dot's corner radius as a share of its width
const DOT_CORNER_SHARE = 0.3;
// How far outside an unlit dot its lighter rim reaches, in pixels
const RIM_REACH_PX = 2.5;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_HEADER_BYTES = 13;
const PNG_BITS_PER_CHANNEL = 8;
// Red, green, blue and opacity
const PNG_COLOUR_TYPE = 6;
const PNG_BEST_COMPRESSION = 9;

main();

function main(): void {
	mkdirSync(OUT_DIR, { recursive: true });
	for (const icon of ICONS) {
		const png = toPng(drawIcon(icon), icon.size);
		const file = `${OUT_DIR}/${icon.name}`;
		writeFileSync(file, png);
		console.log(`${file}  ${String(icon.size)}x${String(icon.size)}  ${String(png.length)} bytes`);
	}

	const preview = toPng(drawPreview(), PREVIEW.width, PREVIEW.height);
	writeFileSync(PREVIEW.file, preview);
	console.log(
		`${PREVIEW.file}  ${String(PREVIEW.width)}x${String(PREVIEW.height)}  ${String(preview.length)} bytes`
	);
}

/**
 * Draws one icon.
 * @returns The pixels as RGBA bytes, row by row
 */
function drawIcon({ size, keyShare, cornerShare }: IconSpec): Buffer {
	const pixels = Buffer.alloc(size * size * BYTES_PER_PIXEL);
	const pixelsPerUnit = (size * keyShare) / KEY_WIDTH_UNITS;
	const corner = size * cornerShare;

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			// The pixel's centre, in outline units
			const ux = (x + 0.5 - size / 2) / pixelsPerUnit + CENTRE.x;
			const uy = (y + 0.5 - size / 2) / pixelsPerUnit + CENTRE.y;
			// 1 inside the stroke, 0 outside, and in between across the one pixel at its edge
			const ink = clamp(0.5 + (LINE_WIDTH / 2 - distanceToKey(ux, uy)) * pixelsPerUnit);

			// Rounded corners, also smoothed across one pixel
			let opacity = 1;
			if (corner > 0) {
				const cx = Math.max(corner - (x + 0.5), 0, x + 0.5 - (size - corner));
				const cy = Math.max(corner - (y + 0.5), 0, y + 0.5 - (size - corner));
				opacity = clamp(0.5 + corner - Math.hypot(cx, cy));
			}

			writePixel(pixels, (y * size + x) * BYTES_PER_PIXEL, mix(BACKGROUND, KEY, ink), opacity);
		}
	}
	return pixels;
}

/**
 * Draws the link-preview picture: the dot grid, centred, so that it survives
 * being cropped to a square by apps that do that.
 * @returns The pixels as RGBA bytes, row by row
 */
function drawPreview(): Buffer {
	const { width, height, cell, gap } = PREVIEW;
	const pixels = Buffer.alloc(width * height * BYTES_PER_PIXEL);
	const pitch = cell + gap;
	const size = DOT_PICTURE_SIZE * cell + (DOT_PICTURE_SIZE - 1) * gap;
	const left = (width - size) / 2;
	const top = (height - size) / 2;
	const corner = cell * DOT_CORNER_SHARE;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let colour = BACKGROUND;
			const column = Math.floor((x + 0.5 - left + gap / 2) / pitch);
			const row = Math.floor((y + 0.5 - top + gap / 2) / pitch);
			if (column >= 0 && column < DOT_PICTURE_SIZE && row >= 0 && row < DOT_PICTURE_SIZE) {
				// Distance from the edge of this dot's rounded square: negative inside it
				const dx = Math.abs(x + 0.5 - (left + column * pitch + cell / 2)) - (cell / 2 - corner);
				const dy = Math.abs(y + 0.5 - (top + row * pitch + cell / 2)) - (cell / 2 - corner);
				const distance =
					Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - corner;
				// An unlit dot is dark with a slightly lighter rim, as on the homepage
				const isLit = PGP_DOTS[row * DOT_PICTURE_SIZE + column];
				const dot = isLit ? KEY : mix(UNLIT, UNLIT_EDGE, clamp(distance + RIM_REACH_PX));
				colour = mix(BACKGROUND, dot, clamp(0.5 - distance));
			}
			writePixel(pixels, (y * width + x) * BYTES_PER_PIXEL, colour, 1);
		}
	}
	return pixels;
}

/** Distance from a point to the nearest part of the key's outline, in outline units */
function distanceToKey(px: number, py: number): number {
	let nearest = Math.abs(Math.hypot(px - RING.x, py - RING.y) - RING.radius);
	for (const line of LINES) {
		nearest = Math.min(nearest, distanceToLine(px, py, line));
	}
	return nearest;
}

/** Distance from a point to a straight stroke of the outline */
function distanceToLine(px: number, py: number, [x1, y1, x2, y2]: Stroke): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const along = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy));
	return Math.hypot(px - (x1 + along * dx), py - (y1 + along * dy));
}

/** Encodes RGBA pixels as a PNG file */
function toPng(pixels: Buffer, width: number, height = width): Buffer {
	const header = Buffer.alloc(PNG_HEADER_BYTES);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = PNG_BITS_PER_CHANNEL;
	header[9] = PNG_COLOUR_TYPE;
	// Each row is stored as it is, with a leading zero that says so
	const rowBytes = width * BYTES_PER_PIXEL;
	const rows = Buffer.alloc(height * (rowBytes + 1));
	for (let y = 0; y < height; y++) {
		pixels.copy(rows, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes);
	}
	return Buffer.concat([
		Buffer.from(PNG_SIGNATURE),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(rows, { level: PNG_BEST_COMPRESSION })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

/** Wraps data in a PNG chunk */
function chunk(type: string, data: Buffer): Buffer {
	const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE(crc32(body) >>> 0);
	return Buffer.concat([length, body, checksum]);
}

/** Writes one pixel into the picture, from a colour and an opacity between 0 and 1 */
function writePixel(pixels: Buffer, at: number, [red, green, blue]: Rgb, opacity: number): void {
	pixels[at] = Math.round(red);
	pixels[at + 1] = Math.round(green);
	pixels[at + 2] = Math.round(blue);
	pixels[at + 3] = Math.round(opacity * OPAQUE);
}

/** The colour part of the way from one colour to another */
function mix(from: Rgb, to: Rgb, amount: number): Rgb {
	return [
		from[0] + (to[0] - from[0]) * amount,
		from[1] + (to[1] - from[1]) * amount,
		from[2] + (to[2] - from[2]) * amount
	];
}

/** Keeps a value between 0 and 1 */
function clamp(value: number): number {
	return Math.max(0, Math.min(1, value));
}
