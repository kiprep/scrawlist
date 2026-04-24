<svelte:head>
	<title>Scrawlist</title>
</svelte:head>

<main>
	<h1>Scrawlist</h1>
	<p>Hello from the iPad.</p>
	<p class="muted">v0 scaffold — deploy pipeline check.</p>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
		background: #fafaf7;
		color: #1a1a1a;
	}
	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
	}
	h1 {
		margin: 0 0 0.5rem;
		font-weight: 600;
	}
	.muted {
		color: #777;
		font-size: 0.9rem;
	}
</style>
