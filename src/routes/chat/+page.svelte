<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { base } from '$app/paths';
	import Settings from '$lib/Settings.svelte';
	import { apiKey } from '$lib/apiKey.svelte';
	import { sendToClaude, ClaudeError } from '$lib/claude';
	import type { Message } from '$lib/types';

	let messages = $state<Message[]>([]);
	let draft = $state('');
	let sending = $state(false);
	let errorMsg = $state<string | null>(null);
	let conversationEl: HTMLDivElement | undefined = $state();

	onMount(() => {
		apiKey.refresh();
		if (!apiKey.value) apiKey.requestKey();
	});

	async function scrollToBottom() {
		await tick();
		conversationEl?.scrollTo({ top: conversationEl.scrollHeight, behavior: 'smooth' });
	}

	async function send() {
		const text = draft.trim();
		if (!text || sending) return;
		if (!apiKey.value) {
			apiKey.requestKey();
			return;
		}

		errorMsg = null;
		messages = [...messages, { role: 'user', content: text }];
		draft = '';
		sending = true;
		scrollToBottom();

		try {
			const reply = await sendToClaude(messages);
			messages = [...messages, { role: 'assistant', content: reply }];
			scrollToBottom();
		} catch (e) {
			if (e instanceof ClaudeError) {
				errorMsg = e.message;
				if (e.status === 401) apiKey.requestKey();
			} else if (e instanceof Error) {
				errorMsg = `Network error: ${e.message}`;
			} else {
				errorMsg = 'Unknown error';
			}
		} finally {
			sending = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			send();
		}
	}
</script>

<svelte:head>
	<title>Scrawlist — Chat</title>
</svelte:head>

<div class="app">
	<header>
		<div class="left">
			<a class="back" href="{base}/" aria-label="Back to notepad">←</a>
			<h1>Chat</h1>
		</div>
		<Settings />
	</header>

	<div class="conversation" bind:this={conversationEl}>
		{#if messages.length === 0 && !sending}
			<p class="empty">Say something — Claude will write back in the same notebook.</p>
		{/if}

		{#each messages as msg (msg)}
			<article class="msg msg-{msg.role}">
				<div class="msg-role">{msg.role === 'user' ? 'You' : 'Claude'}</div>
				<div class="msg-content">{msg.content}</div>
			</article>
		{/each}

		{#if sending}
			<article class="msg msg-assistant thinking">
				<div class="msg-role">Claude</div>
				<div class="msg-content"><span class="dots">thinking</span></div>
			</article>
		{/if}

		{#if errorMsg}
			<div class="error" role="alert">{errorMsg}</div>
		{/if}
	</div>

	<form
		class="composer"
		onsubmit={(e) => {
			e.preventDefault();
			send();
		}}
	>
		<textarea
			bind:value={draft}
			onkeydown={onKeydown}
			placeholder="Write to Claude…"
			rows="2"
			autocapitalize="sentences"
			autocomplete="off"
			autocorrect="on"
			spellcheck="true"
			disabled={sending}
		></textarea>
		<button type="submit" class="send" disabled={sending || !draft.trim()}>
			{sending ? '…' : 'Send'}
		</button>
	</form>
</div>

<style>
	:global(:root) {
		--bg: #fafaf7;
		--ink: #1a1a1a;
		--muted: #777;
		--accent: #3b6cf6;
		--user-ink: #1d3fb3;
		--claude-ink: #8a3a1a;
		--border: #e2e2de;
	}
	:global(html, body) {
		margin: 0;
		height: 100%;
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
	header {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}
	.left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.back {
		text-decoration: none;
		color: var(--ink);
		font-size: 1.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
	}
	.back:hover {
		background: rgba(0, 0, 0, 0.06);
	}
	h1 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.conversation {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.25rem 1.5rem;
		max-width: 720px;
		width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
	}
	.empty {
		color: var(--muted);
		font-size: 0.95rem;
		text-align: center;
		margin-top: 2rem;
	}
	.msg {
		margin: 0 0 1.25rem;
	}
	.msg-role {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		margin-bottom: 0.2rem;
	}
	.msg-content {
		white-space: pre-wrap;
		word-wrap: break-word;
		line-height: 1.5;
		font-size: 1rem;
	}
	.msg-user .msg-content {
		color: var(--user-ink);
	}
	.msg-assistant .msg-content {
		color: var(--claude-ink);
	}
	.thinking .msg-content {
		color: var(--muted);
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
	.error {
		background: #fff0ee;
		color: #8a2a1a;
		border: 1px solid #f3c7c0;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.9rem;
		margin: 0.5rem 0;
	}

	.composer {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--border);
		background: var(--bg);
		flex-shrink: 0;
		max-width: 720px;
		width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
	}
	.composer textarea {
		flex: 1;
		resize: none;
		padding: 0.75rem;
		font-size: 1rem;
		font-family: inherit;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: white;
		box-sizing: border-box;
		min-height: 2.75rem;
		max-height: 30vh;
	}
	.composer textarea:focus {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
		border-color: transparent;
	}
	.composer .send {
		padding: 0 1.25rem;
		border: none;
		border-radius: 10px;
		background: var(--accent);
		color: white;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		min-width: 4rem;
	}
	.composer .send:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
