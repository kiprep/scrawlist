<script lang="ts">
	import { maskKey } from '$lib/storage';
	import { apiKey } from '$lib/apiKey.svelte';

	type Props = { variant?: 'light' | 'dark' };
	let { variant = 'light' }: Props = $props();

	let showSettings = $state(false);
	let keyInput = $state('');

	function openReplace() {
		showSettings = false;
		keyInput = '';
		apiKey.requestKey();
	}

	function saveKey() {
		const trimmed = keyInput.trim();
		if (!trimmed) return;
		apiKey.save(trimmed);
		keyInput = '';
	}

	function cancelKeyModal() {
		keyInput = '';
		apiKey.closeModal();
	}
</script>

<button
	type="button"
	class="gear gear-{variant}"
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
			Key: <span class="mono">{apiKey.value ? maskKey(apiKey.value) : 'not set'}</span>
		</p>
		<button type="button" onclick={openReplace}>
			{apiKey.value ? 'Replace key' : 'Set key'}
		</button>
	</div>
{/if}

{#if apiKey.modalOpen}
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
				<button type="button" onclick={cancelKeyModal}>Cancel</button>
				<button type="button" class="primary" onclick={saveKey} disabled={!keyInput.trim()}>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.gear {
		background: transparent;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		border-radius: 8px;
		line-height: 0;
		color: inherit;
	}
	.gear-light {
		color: #1a1a1a;
	}
	.gear-dark {
		color: white;
	}
	.gear:hover,
	.gear:focus-visible {
		background: rgba(0, 0, 0, 0.08);
	}
	.gear-dark:hover,
	.gear-dark:focus-visible {
		background: rgba(255, 255, 255, 0.15);
	}
	.settings-panel {
		position: absolute;
		top: calc(100% + 6px);
		right: 0.75rem;
		background: white;
		border: 1px solid #e2e2de;
		border-radius: 10px;
		padding: 0.75rem 1rem;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
		min-width: 220px;
		z-index: 50;
		color: #1a1a1a;
	}
	.settings-panel p {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
	}
	.settings-panel button {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #e2e2de;
		background: #fafaf7;
		border-radius: 8px;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		color: #777;
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
		color: #1a1a1a;
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
		color: #777;
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
		color: #3b6cf6;
		text-decoration: none;
	}
	.modal input {
		width: 100%;
		padding: 0.75rem;
		font-size: 1rem;
		border: 1px solid #e2e2de;
		border-radius: 8px;
		box-sizing: border-box;
		margin: 0.75rem 0 1rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}
	.modal input:focus {
		outline: 2px solid #3b6cf6;
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
		border: 1px solid #e2e2de;
		background: #fafaf7;
		font-size: 0.95rem;
		cursor: pointer;
	}
	.actions button.primary {
		background: #3b6cf6;
		color: white;
		border-color: #3b6cf6;
	}
	.actions button.primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
