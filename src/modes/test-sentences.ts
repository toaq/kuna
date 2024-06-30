import * as fs from 'fs';
import { parse } from './parse';

export function testSentences(
	onlyPrintFailures: boolean,
	procedure?: (sentence: string) => string,
) {
	const files = [
		'sentences/refgram.txt',
		// 'sentences/a.txt',
	];
	const sentences = files.flatMap(x =>
		fs.readFileSync(x).toString('utf-8').trim().split('\n'),
	);
	let ok = 0;
	let total = 0;
	for (const s of sentences) {
		let status: string;
		let failure = false;
		let error = '';
		if (s.startsWith('*')) continue;
		total++;
		try {
			const parses = parse(s);
			if (parses.length === 0) {
				status = '\x1b[31m[fail]\x1b[0m';
				failure = true;
			} else if (parses.length === 1) {
				const label = parses[0].label.replace('Adjunct', 'Adj').padEnd(4);
				status = `\x1b[32m[${label}]\x1b[0m`;
				ok++;
			} else {
				status = '\x1b[33m[ambi]\x1b[0m';
				failure = true;
			}
		} catch (e) {
			status = '\x1b[91m[fail]\x1b[0m';
			error = '\x1b[2m' + String(e).split('\n')[0] + '\x1b[0m';
			failure = true;
		}

		let post = '';
		if (!failure && procedure) {
			let output = '(crashed)';
			try {
				output = procedure(s);
			} catch (e) {
				console.log(e);
			}
			post = '  \x1b[36m' + output + '\x1b[0m  ';
		}

		if (!onlyPrintFailures || failure) {
			console.log(status + ' ' + s + post + error);
		}
	}
	console.log(`Parsed ${ok}/${total} sentences.`);
}
