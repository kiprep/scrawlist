import type { Stroke } from '$lib/types';
import { strokeToPath } from './strokes';

export interface FlattenInput {
	width: number;
	height: number;
	background?: HTMLImageElement | ImageBitmap | null;
	backgroundColor?: string;
	strokes: Stroke[];
}

/**
 * Composite strokes (and optional image background) onto a fresh canvas
 * at the given size, returning the canvas. Caller can .toBlob('image/png')
 * or .toDataURL() from it.
 */
export function flattenToCanvas(input: FlattenInput): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = input.width;
	canvas.height = input.height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2d context unavailable');

	if (input.backgroundColor) {
		ctx.fillStyle = input.backgroundColor;
		ctx.fillRect(0, 0, input.width, input.height);
	}

	if (input.background) {
		ctx.drawImage(input.background, 0, 0, input.width, input.height);
	}

	for (const stroke of input.strokes) {
		const d = strokeToPath(stroke);
		if (!d) continue;
		ctx.fillStyle = stroke.color;
		const path = new Path2D(d);
		ctx.fill(path);
	}

	return canvas;
}

export async function flattenToPngBlob(input: FlattenInput): Promise<Blob> {
	const canvas = flattenToCanvas(input);
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else reject(new Error('canvas.toBlob returned null'));
		}, 'image/png');
	});
}
