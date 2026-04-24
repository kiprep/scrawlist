<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { getStroke } from 'perfect-freehand';
	import { DEFAULT_STROKE_OPTIONS } from '$lib/canvas/strokes';
	import type { Stroke, Point } from '$lib/types';

	type FlattenFn = (type?: string) => Promise<Blob | null>;

	type Props = {
		strokes: Stroke[];
		inProgress: Stroke | null;
		onStrokeStart: (p: Point, pointerType: string) => void;
		onStrokePoint: (p: Point) => void;
		onStrokeEnd: () => void;
		flatten?: FlattenFn;
	};

	let {
		strokes,
		inProgress,
		onStrokeStart,
		onStrokePoint,
		onStrokeEnd,
		flatten = $bindable()
	}: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let container: HTMLDivElement | undefined = $state();
	let cssWidth = $state(0);
	let cssHeight = $state(0);
	let activePointerId: number | null = null;

	function sizeCanvas() {
		if (!canvas || !container) return;
		const rect = container.getBoundingClientRect();
		cssWidth = rect.width;
		cssHeight = rect.height;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(rect.width * dpr);
		canvas.height = Math.round(rect.height * dpr);
		canvas.style.width = `${rect.width}px`;
		canvas.style.height = `${rect.height}px`;
		const ctx = canvas.getContext('2d');
		ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
		render();
	}

	function render() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, cssWidth, cssHeight);

		const all = inProgress ? [...strokes, inProgress] : strokes;
		for (const stroke of all) {
			if (stroke.points.length === 0) continue;
			const input = stroke.points.map(
				(p) => [p.x, p.y, p.pressure] as [number, number, number]
			);
			const outline = getStroke(input, {
				...DEFAULT_STROKE_OPTIONS,
				size: stroke.size,
				simulatePressure: stroke.points.every((p) => p.pressure === 0.5)
			});
			if (outline.length === 0) continue;
			const d = outline
				.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
				.join(' ');
			const path = new Path2D(`${d} Z`);
			ctx.fillStyle = stroke.color;
			ctx.fill(path);
		}
	}

	$effect(() => {
		const _strokeCount = strokes.length;
		const _pointCount = inProgress?.points.length ?? 0;
		void _strokeCount;
		void _pointCount;
		untrack(() => render());
	});

	onMount(() => {
		sizeCanvas();
		const ro = new ResizeObserver(() => sizeCanvas());
		if (container) ro.observe(container);

		flatten = (type: string = 'image/png') =>
			new Promise<Blob | null>((resolve) => {
				if (!canvas) {
					resolve(null);
					return;
				}
				// Canvas currently has a transparent background. For export, composite
				// over white so handwriting is legible even if the consumer doesn't
				// provide its own background.
				const out = document.createElement('canvas');
				out.width = canvas.width;
				out.height = canvas.height;
				const ctx = out.getContext('2d');
				if (!ctx) {
					resolve(null);
					return;
				}
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(0, 0, out.width, out.height);
				ctx.drawImage(canvas, 0, 0);
				out.toBlob((b) => resolve(b), type);
			});

		return () => ro.disconnect();
	});

	function normalizePressure(e: PointerEvent): number {
		if (e.pointerType === 'pen') {
			return e.pressure > 0 ? e.pressure : 0.5;
		}
		return 0.5;
	}

	function pointFromEvent(e: PointerEvent): Point {
		const rect = canvas!.getBoundingClientRect();
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
			pressure: normalizePressure(e)
		};
	}

	function onPointerDown(e: PointerEvent) {
		if (e.pointerType === 'touch' && e.isPrimary === false) return;
		e.preventDefault();
		activePointerId = e.pointerId;
		onStrokeStart(pointFromEvent(e), e.pointerType);
	}

	function onPointerMove(e: PointerEvent) {
		if (activePointerId !== e.pointerId) return;
		e.preventDefault();
		onStrokePoint(pointFromEvent(e));
	}

	function onPointerEnd(e: PointerEvent) {
		if (activePointerId !== e.pointerId) return;
		activePointerId = null;
		onStrokeEnd();
	}
</script>

<div
	class="canvas-container"
	bind:this={container}
	role="application"
	aria-label="Scribble canvas"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerEnd}
	onpointercancel={onPointerEnd}
	onpointerleave={onPointerEnd}
>
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.canvas-container {
		flex: 1;
		position: relative;
		overflow: hidden;
		touch-action: none;
		background: white;
	}
	canvas {
		display: block;
		touch-action: none;
		cursor: crosshair;
	}
</style>
