const KEY = 'scrawlist.anthropic_api_key';

export function getApiKey(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(KEY);
}

export function setApiKey(value: string): void {
	localStorage.setItem(KEY, value);
}

export function clearApiKey(): void {
	localStorage.removeItem(KEY);
}

export function maskKey(value: string): string {
	const last4 = value.slice(-4);
	return `sk-ant-…${last4}`;
}
