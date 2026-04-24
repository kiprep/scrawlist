export type Role = 'user' | 'assistant';

export interface Message {
	role: Role;
	content: string;
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
