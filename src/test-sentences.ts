import * as fs from 'fs';
import { parse } from './parse';

export function testSentences() {
	const files = ['data/refgram-sentences.txt', 'data/a-sentences.txt'];
	const sentences = files.flatMap(x =>
		fs.readFileSync(x).toString('utf-8').trim().split('\n'),
	);
	let ok = 0;
	let total = 0;
	for (const s of sentences) {
		let status: string;
		let error: string = '';
		if (s.startsWith('*')) continue;
		total++;
		try {
			const parses = parse(s);
			if (parses.length === 0) {
				status = '\x1b[31m[fail]\x1b[0m';
			} else if (parses.length === 1) {
				const label = parses[0].label.replace('Adjunct', 'Adj').padEnd(4);
				status = `\x1b[32m[${label}]\x1b[0m`;
				ok++;
			} else {
				status = '\x1b[33m[ambi]\x1b[0m';
			}
		} catch (e) {
			status = '\x1b[91m[fail]\x1b[0m';
			error = '\x1b[2m' + String(e).split('\n')[0] + '\x1b[0m';
		}
		console.log(status + ' ' + s + '  ' + error);
	}
	console.log(`Parsed ${ok}/${total} sentences.`);
}
