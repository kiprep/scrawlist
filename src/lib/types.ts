export type Role = 'user' | 'assistant';

export type TextBlock = { type: 'text'; text: string };

export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

export type ImageBlock = {
	type: 'image';
	source: { type: 'base64'; media_type: ImageMediaType; data: string };
};

export type ContentBlock = TextBlock | ImageBlock;

export interface Message {
	role: Role;
	content: string | ContentBlock[];
}

export interface Point {
	x: number;
	y: number;
	pressure: number;
}

export interface Stroke {
	id: number;
	points: Point[];
	color: string;
	size: number;
}
