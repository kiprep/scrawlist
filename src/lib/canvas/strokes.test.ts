import { describe, it, expect } from 'vitest';
import { StrokeModel, strokeToPath } from './strokes';
import type { Point } from '$lib/types';

const p = (x: number, y: number, pressure = 0.5): Point => ({ x, y, pressure });

describe('StrokeModel', () => {
	it('starts empty', () => {
		const m = new StrokeModel();
		expect(m.strokes).toEqual([]);
		expect(m.inProgress).toBeNull();
		expect(m.allStrokes()).toEqual([]);
	});

	it('adds points to in-progress stroke', () => {
		const m = new StrokeModel();
		m.startStroke(p(0, 0));
		m.appendPoint(p(1, 1));
		m.appendPoint(p(2, 2));
		expect(m.inProgress?.points.length).toBe(3);
		expect(m.strokes.length).toBe(0);
	});

	it('finalizes a stroke via endStroke', () => {
		const m = new StrokeModel();
		m.startStroke(p(0, 0));
		m.appendPoint(p(1, 1));
		m.endStroke();
		expect(m.strokes.length).toBe(1);
		expect(m.inProgress).toBeNull();
	});

	it('undo removes only the last finalized stroke', () => {
		const m = new StrokeModel();
		m.startStroke(p(0, 0));
		m.endStroke();
		m.startStroke(p(10, 10));
		m.endStroke();
		expect(m.strokes.length).toBe(2);
		m.undo();
		expect(m.strokes.length).toBe(1);
		expect(m.strokes[0].points[0]).toEqual(p(0, 0));
	});

	it('undo on empty stack is a no-op', () => {
		const m = new StrokeModel();
		expect(m.undo()).toBeNull();
		expect(m.strokes).toEqual([]);
	});

	it('clear resets both in-progress and finalized strokes', () => {
		const m = new StrokeModel();
		m.startStroke(p(0, 0));
		m.endStroke();
		m.startStroke(p(1, 1));
		m.clear();
		expect(m.strokes).toEqual([]);
		expect(m.inProgress).toBeNull();
	});

	it('assigns unique ids to strokes', () => {
		const m = new StrokeModel();
		const a = m.startStroke(p(0, 0));
		m.endStroke();
		const b = m.startStroke(p(1, 1));
		expect(a.id).not.toBe(b.id);
	});

	it('allStrokes includes the in-progress stroke at the end', () => {
		const m = new StrokeModel();
		m.startStroke(p(0, 0));
		m.endStroke();
		m.startStroke(p(5, 5));
		const all = m.allStrokes();
		expect(all.length).toBe(2);
		expect(all[1].points[0]).toEqual(p(5, 5));
	});

	it('cancelStroke drops the in-progress stroke without finalizing', () => {
		const m = new StrokeModel();
		m.startStroke(p(0, 0));
		m.appendPoint(p(1, 1));
		m.cancelStroke();
		expect(m.inProgress).toBeNull();
		expect(m.strokes).toEqual([]);
	});

	it('endStroke on an empty-points stroke discards it', () => {
		const m = new StrokeModel();
		m.startStroke(p(0, 0));
		// manually clear points to simulate an aborted start
		m.inProgress!.points = [];
		m.endStroke();
		expect(m.strokes).toEqual([]);
		expect(m.inProgress).toBeNull();
	});
});

describe('strokeToPath', () => {
	it('returns an empty string for a stroke with no points', () => {
		const stroke = { id: 1, points: [], color: '#000', size: 4 };
		expect(strokeToPath(stroke)).toBe('');
	});

	it('produces a closed SVG path for a drawn stroke', () => {
		const stroke = {
			id: 1,
			points: [p(0, 0), p(10, 10), p(20, 15), p(30, 10)],
			color: '#000',
			size: 6
		};
		const d = strokeToPath(stroke);
		expect(d.startsWith('M')).toBe(true);
		expect(d.endsWith('Z')).toBe(true);
		expect(d).toMatch(/L/);
	});

	it('path geometry responds to stroke size', () => {
		const small = strokeToPath({
			id: 1,
			points: [p(0, 0), p(10, 0), p(20, 0)],
			color: '#000',
			size: 2
		});
		const large = strokeToPath({
			id: 2,
			points: [p(0, 0), p(10, 0), p(20, 0)],
			color: '#000',
			size: 20
		});
		expect(small).not.toBe(large);
		expect(large.length).toBeGreaterThan(0);
	});
});
