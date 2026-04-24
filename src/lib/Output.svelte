<script lang="ts">
	type Props = {
		status: 'idle' | 'sending' | 'error' | 'response';
		text: string;
		error: string | null;
		expanded: boolean;
		onToggle: () => void;
	};

	let { status, text, error, expanded, onToggle }: Props = $props();
</script>

{#if status !== 'idle'}
	<button
		type="button"
		class="output"
		class:expanded
		aria-expanded={expanded}
		aria-label={expanded ? 'Collapse Claude response' : 'Expand Claude response'}
		onclick={onToggle}
	>
		<div class="header">
			<span class="label">
				{#if status === 'sending'}
					<span class="dots">Claude is thinking</span>
				{:else if status === 'error'}
					Claude error
				{:else}
					Claude
				{/if}
			</span>
			<span class="chevron" aria-hidden="true">{expanded ? '▾' : '▴'}</span>
		</div>
		{#if status === 'error' && error}
			<div class="body error" class:collapsed={!expanded}>{error}</div>
		{:else if status === 'response' && text}
			<div class="body" class:collapsed={!expanded}>{text}</div>
		{:else if status === 'sending'}
			<div class="body dim" class:collapsed={!expanded}>…</div>
		{/if}
	</button>
{/if}

<style>
	.output {
		display: block;
		width: 100%;
		box-sizing: border-box;
		padding: 0.6rem 1rem 0.75rem;
		background: #fffdf6;
		border: none;
		border-top: 1px solid #e2e2de;
		color: #1a1a1a;
		text-align: left;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.95rem;
		max-height: 30vh;
		overflow-y: auto;
	}
	.output.expanded {
		max-height: 55vh;
	}
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #8a3a1a;
		margin-bottom: 0.25rem;
	}
	.chevron {
		color: #777;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}
	.body {
		color: #8a3a1a;
		line-height: 1.45;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
	.body.collapsed {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.body.error {
		color: #b02a1a;
	}
	.body.dim {
		color: #aaa;
		font-style: italic;
	}
	.dots::after {
		content: '';
		display: inline-block;
		width: 1em;
		text-align: left;
		animation: dots 1.2s steps(4, end) infinite;
	}
	@keyframes dots {
		0% {
			content: '';
		}
		25% {
			content: '.';
		}
		50% {
			content: '..';
		}
		75% {
			content: '...';
		}
	}
</style>
