<script lang="ts">
	import { base } from '$app/paths';
	import Settings from '$lib/Settings.svelte';
	import Canvas from '$lib/Canvas.svelte';
	import type { Point, Stroke } from '$lib/types';

	let strokes = $state<Stroke[]>([]);
	let inProgress = $state<Stroke | null>(null);
	let nextId = 1;

	function onStrokeStart(p: Point, _pointerType: string) {
		inProgress = {
			id: nextId++,
			points: [p],
			color: '#111',
			size: 4
		};
	}

	function onStrokePoint(p: Point) {
		if (!inProgress) return;
		inProgress.points = [...inProgress.points, p];
	}

	function onStrokeEnd() {
		if (!inProgress) return;
		if (inProgress.points.length === 0) {
			inProgress = null;
			return;
		}
		strokes = [...strokes, inProgress];
		inProgress = null;
	}

	function undo() {
		if (strokes.length === 0) return;
		strokes = strokes.slice(0, -1);
	}

	function clear() {
		strokes = [];
		inProgress = null;
	}
</script>

<svelte:head>
	<title>Scrawlist</title>
</svelte:head>

<div class="app">
	<header class="toolbar">
		<div class="title-group">
			<h1>Scrawlist</h1>
		</div>

		<div class="tools">
			<button
				type="button"
				class="tool"
				onclick={undo}
				disabled={strokes.length === 0}
				aria-label="Undo"
				title="Undo"
			>
				<svg
					viewBox="0 0 24 24"
					width="22"
					height="22"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M9 14 4 9l5-5" />
					<path d="M4 9h11a5 5 0 0 1 0 10h-4" />
				</svg>
			</button>
			<button
				type="button"
				class="tool"
				onclick={clear}
				disabled={strokes.length === 0 && !inProgress}
				aria-label="Clear canvas"
				title="Clear"
			>
				<svg
					viewBox="0 0 24 24"
					width="22"
					height="22"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M3 6h18" />
					<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					<path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
				</svg>
			</button>
			<a class="tool" href="{base}/chat" aria-label="Open chat" title="Chat">
				<svg
					viewBox="0 0 24 24"
					width="22"
					height="22"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path
						d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
					/>
				</svg>
			</a>
			<Settings />
		</div>
	</header>

	<Canvas {strokes} {inProgress} {onStrokeStart} {onStrokePoint} {onStrokeEnd} />
</div>

<style>
	:global(:root) {
		--bg: #fafaf7;
		--ink: #1a1a1a;
		--muted: #777;
		--border: #e2e2de;
	}
	:global(html, body) {
		margin: 0;
		height: 100%;
		overflow: hidden;
		overscroll-behavior: none;
	}
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
		background: var(--bg);
		color: var(--ink);
	}

	.app {
		display: flex;
		flex-direction: column;
		height: 100dvh;
	}

	.toolbar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem 0.75rem;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
		z-index: 10;
	}
	.title-group h1 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		padding-left: 0.5rem;
	}
	.tools {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}
	.tool {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--ink);
		cursor: pointer;
		text-decoration: none;
	}
	.tool:hover:not(:disabled),
	.tool:focus-visible {
		background: rgba(0, 0, 0, 0.06);
	}
	.tool:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>
