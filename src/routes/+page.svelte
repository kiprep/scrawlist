<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { getApiKey, setApiKey, maskKey } from '$lib/storage';
	import { sendToClaude, ClaudeError } from '$lib/claude';
	import type { Message } from '$lib/types';

	let apiKey = $state<string | null>(null);
	let showKeyModal = $state(false);
	let showSettings = $state(false);
	let keyInput = $state('');

	let messages = $state<Message[]>([]);
	let draft = $state('');
	let sending = $state(false);
	let errorMsg = $state<string | null>(null);
	let conversationEl: HTMLDivElement | undefined = $state();

	onMount(() => {
		const existing = getApiKey();
		if (existing) {
			apiKey = existing;
		} else {
			showKeyModal = true;
		}
	});

	function saveKey() {
		const trimmed = keyInput.trim();
		if (!trimmed) return;
		setApiKey(trimmed);
		apiKey = trimmed;
		keyInput = '';
		showKeyModal = false;
	}

	function openReplace() {
		showSettings = false;
		keyInput = '';
		showKeyModal = true;
	}

	function cancelKeyModal() {
		if (!apiKey) return;
		keyInput = '';
		showKeyModal = false;
	}

	async function scrollToBottom() {
		await tick();
		conversationEl?.scrollTo({ top: conversationEl.scrollHeight, behavior: 'smooth' });
	}

	async function send() {
		const text = draft.trim();
		if (!text || sending || !apiKey) return;

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
				if (e.status === 401) {
					showSettings = false;
					showKeyModal = true;
				}
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
	<title>Scrawlist</title>
</svelte:head>

<div class="app">
	<header>
		<h1>Scrawlist</h1>
		<button
			type="button"
			class="gear"
			aria-label="Settings"
			aria-expanded={showSettings}
			onclick={() => (showSettings = !showSettings)}
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
				<circle cx="12" cy="12" r="3" />
				<path
					d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
				/>
			</svg>
		</button>

		{#if showSettings}
			<div class="settings-panel" role="dialog" aria-label="Settings">
				<p class="key-display">
					Key: <span class="mono">{apiKey ? maskKey(apiKey) : 'not set'}</span>
				</p>
				<button type="button" onclick={openReplace}>
					{apiKey ? 'Replace key' : 'Set key'}
				</button>
			</div>
		{/if}
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
		<button type="submit" class="send" disabled={sending || !draft.trim() || !apiKey}>
			{sending ? '…' : 'Send'}
		</button>
	</form>
</div>

{#if showKeyModal}
	<div class="modal-backdrop" role="presentation">
		<div class="modal" role="dialog" aria-labelledby="key-modal-title" aria-modal="true">
			<h2 id="key-modal-title">Paste your Anthropic API key</h2>
			<p class="explainer">
				Scrawlist calls Claude directly from your browser. Your key lives only in this device's
				<code>localStorage</code> — never in the repo, never on a server.
			</p>
			<p>
				<a
					href="https://console.anthropic.com/settings/keys"
					target="_blank"
					rel="noopener noreferrer"
				>
					Get a key at console.anthropic.com →
				</a>
			</p>
			<input
				type="password"
				bind:value={keyInput}
				placeholder="sk-ant-..."
				autocomplete="off"
				autocapitalize="off"
				autocorrect="off"
				spellcheck="false"
				onkeydown={(e) => e.key === 'Enter' && saveKey()}
			/>
			<div class="actions">
				{#if apiKey}
					<button type="button" onclick={cancelKeyModal}>Cancel</button>
				{/if}
				<button type="button" class="primary" onclick={saveKey} disabled={!keyInput.trim()}>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

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
		padding: 0.75rem 1.25rem;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}
	h1 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 600;
	}
	.gear {
		background: transparent;
		border: none;
		padding: 0.5rem;
		color: var(--ink);
		cursor: pointer;
		border-radius: 8px;
		line-height: 0;
	}
	.gear:hover,
	.gear:focus-visible {
		background: #ececec;
	}
	.settings-panel {
		position: absolute;
		top: calc(100% + 4px);
		right: 1rem;
		background: white;
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 0.75rem 1rem;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
		min-width: 220px;
		z-index: 20;
	}
	.settings-panel p {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
	}
	.settings-panel button {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border);
		background: var(--bg);
		border-radius: 8px;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		color: var(--muted);
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

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 100;
	}
	.modal {
		background: white;
		border-radius: 14px;
		padding: 1.5rem;
		max-width: 480px;
		width: 100%;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
	}
	.modal h2 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}
	.modal .explainer {
		font-size: 0.9rem;
		color: var(--muted);
		line-height: 1.4;
		margin: 0 0 0.75rem;
	}
	.modal code {
		font-size: 0.85em;
		background: #f0f0ec;
		padding: 1px 5px;
		border-radius: 4px;
	}
	.modal a {
		color: var(--accent);
		text-decoration: none;
	}
	.modal input {
		width: 100%;
		padding: 0.75rem;
		font-size: 1rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		box-sizing: border-box;
		margin: 0.75rem 0 1rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}
	.modal input:focus {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
		border-color: transparent;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.actions button {
		padding: 0.6rem 1.1rem;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--bg);
		font-size: 0.95rem;
		cursor: pointer;
	}
	.actions button.primary {
		background: var(--accent);
		color: white;
		border-color: var(--accent);
	}
	.actions button.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
