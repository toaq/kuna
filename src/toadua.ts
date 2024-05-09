import * as fs from 'fs';
import path from 'path';

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
	return (_toadua ??= JSON.parse(
		fs.readFileSync(
			path.resolve(__dirname, '../data/toadua/toadua.json'),
			'utf8',
		),
	));
}
