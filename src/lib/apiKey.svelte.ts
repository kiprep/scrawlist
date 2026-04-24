import { getApiKey as readKey, setApiKey as writeKey } from './storage';

/**
 * Shared reactive state for the Anthropic API key and the "enter a key" modal.
 * Consumed by both Settings.svelte (which renders the modal) and any page that
 * needs to prompt for a key (like /chat).
 *
 * readKey() returns null during SSR (no localStorage), so initializing directly
 * at module scope is safe. Callers that want to sync with the client's
 * localStorage (after hydration) should call refresh() from onMount.
 */

let _key = $state<string | null>(readKey());
let _modalOpen = $state(false);

export const apiKey = {
	get value() {
		return _key;
	},
	get modalOpen() {
		return _modalOpen;
	},
	refresh() {
		_key = readKey();
	},
	requestKey() {
		_modalOpen = true;
	},
	closeModal() {
		_modalOpen = false;
	},
	save(value: string) {
		writeKey(value);
		_key = value;
		_modalOpen = false;
	}
};
