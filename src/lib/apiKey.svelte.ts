import { getApiKey as readKey, setApiKey as writeKey } from './storage';

/**
 * Shared reactive state for the Anthropic API key and the "enter a key" modal.
 * Consumed by both Settings.svelte (which renders the modal) and any page that
 * needs to prompt for a key (like /chat).
 */

let _key = $state<string | null>(null);
let _modalOpen = $state(false);
let _initialized = false;

function ensureInit() {
	if (_initialized) return;
	_initialized = true;
	_key = readKey();
}

export const apiKey = {
	get value() {
		ensureInit();
		return _key;
	},
	get modalOpen() {
		ensureInit();
		return _modalOpen;
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
