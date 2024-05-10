export interface ToaduaEntry {
	head: string;
	body: string;
	user: string;
	score: number;
	gloss?: string;
	frame?: string;
}

let _toadua: Record<string, ToaduaEntry>;

export function toadua(): Record<string, ToaduaEntry> {
	return (_toadua ??= require('../../data/toadua/toadua.json'));
}
