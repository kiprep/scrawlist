import type { Message } from './types';
import { getApiKey } from './storage';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const SYSTEM_PROMPT =
	'You are having a conversation in a shared notebook. Keep responses concise — 1-3 sentences where possible. This is a casual, flowing conversation, not a formal Q&A.';

export class ClaudeError extends Error {
	status?: number;
	constructor(message: string, status?: number) {
		super(message);
		this.name = 'ClaudeError';
		this.status = status;
	}
}

export async function sendToClaude(messages: Message[]): Promise<string> {
	const apiKey = getApiKey();
	if (!apiKey) throw new ClaudeError('No API key set');

	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true'
		},
		body: JSON.stringify({
			model: MODEL,
			max_tokens: MAX_TOKENS,
			system: SYSTEM_PROMPT,
			messages
		})
	});

	if (!response.ok) {
		let detail = '';
		try {
			const body = await response.json();
			detail = body?.error?.message ?? JSON.stringify(body);
		} catch {
			detail = await response.text().catch(() => '');
		}
		if (response.status === 401) {
			throw new ClaudeError(`API key rejected: ${detail || 'check your key'}`, 401);
		}
		throw new ClaudeError(`Claude error ${response.status}: ${detail}`, response.status);
	}

	const data = await response.json();
	const text = data?.content?.[0]?.text;
	if (typeof text !== 'string') {
		throw new ClaudeError('Unexpected response shape from Claude');
	}
	return text;
}
