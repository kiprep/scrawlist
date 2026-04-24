import type { Point, Stroke } from '$lib/types';
import { getStroke } from 'perfect-freehand';

export const DEFAULT_STROKE_OPTIONS = {
	size: 4,
	thinning: 0.6,
	smoothing: 0.5,
	streamline: 0.5,
	easing: (t: number) => t,
	simulatePressure: true,
	last: true
};

/**
 * Pure, frameworkless stroke state. Holds an ordered list of finalized strokes
 * plus the stroke currently being drawn. Undo pops the last finalized stroke.
 *
 * Not reactive on its own — callers should wrap in $state or similar and
 * notify after every mutation.
 */
export class StrokeModel {
	strokes: Stroke[] = [];
	inProgress: Stroke | null = null;
	private nextId = 1;

	startStroke(point: Point, color = '#111', size = DEFAULT_STROKE_OPTIONS.size): Stroke {
		const stroke: Stroke = {
			id: this.nextId++,
			points: [point],
			color,
			size
		};
		this.inProgress = stroke;
		return stroke;
	}

	appendPoint(point: Point): void {
		if (!this.inProgress) return;
		this.inProgress.points.push(point);
	}

	endStroke(): Stroke | null {
		const finished = this.inProgress;
		if (!finished) return null;
		if (finished.points.length === 0) {
			this.inProgress = null;
			return null;
		}
		this.strokes.push(finished);
		this.inProgress = null;
		return finished;
	}

	cancelStroke(): void {
		this.inProgress = null;
	}

	undo(): Stroke | null {
		return this.strokes.pop() ?? null;
	}

	clear(): void {
		this.strokes = [];
		this.inProgress = null;
	}

	allStrokes(): Stroke[] {
		return this.inProgress ? [...this.strokes, this.inProgress] : [...this.strokes];
	}
}

/**
 * Convert a Stroke into an SVG `d` attribute string using perfect-freehand.
 * Used by both on-screen rendering and flatten export.
 */
export function strokeToPath(stroke: Stroke): string {
	const input = stroke.points.map((p) => [p.x, p.y, p.pressure] as [number, number, number]);
	const outline = getStroke(input, {
		...DEFAULT_STROKE_OPTIONS,
		size: stroke.size
	});
	if (outline.length === 0) return '';
	const d = outline
		.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
		.join(' ');
	return `${d} Z`;
}
