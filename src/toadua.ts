import toaduaDump from '../data/toadua/dump.json';

export interface ToaduaEntry {
	head: string;
	body: string;
	user: string;
	scope: string;
	score: number;
}

export const toadua = new Map<string, ToaduaEntry>();
for (const e of toaduaDump as ToaduaEntry[]) {
	toadua.set(e.head, e);
}
