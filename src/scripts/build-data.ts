import * as fs from 'node:fs';
import https from 'node:https';
import { guessFrameFromDefinition } from '../morphology/frame';

async function post(
	hostname: string,
	path: string,
	body: string,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const req = https.request({ hostname, path, method: 'POST' }, res => {
			const chunks: Buffer[] = [];
			res.on('data', data => chunks.push(data));
			res.on('end', () => {
				const body = Buffer.concat(chunks).toString('utf8');
				resolve(body);
			});
		});
		req.on('error', reject);
		req.write(body);
		req.end();
	});
}

async function fetchToadua(): Promise<{ results: any[] }> {
	const query = JSON.stringify({ action: 'search', query: ['scope', 'en'] });
	const response = await post('toadua.uakci.space', '/api', query);
	return JSON.parse(response);
}

async function readToadua(): Promise<{ results: any[] }> {
	if (!fs.existsSync('data/toadua')) {
		fs.mkdirSync('data/toadua');
	}
	if (!fs.existsSync('data/toadua/dump.json')) {
		const toadua = await fetchToadua();
		fs.writeFileSync('data/toadua/dump.json', JSON.stringify(toadua));
		return toadua;
	}
	return JSON.parse(fs.readFileSync('data/toadua/dump.json').toString());
}

function extractGlossWord(text: string) {
	return text.split('/')[0].trim().replaceAll(/[()"]/g, '');
}

export function makeGloss(body: string) {
	const quotedMatch = body.match(/['‘’\"“”]([A-Za-z .]+)['‘’\"“”];/);
	if (quotedMatch) return quotedMatch[1];
	for (const part of body.split(';')) {
		const keywords = part
			.trim()
			.replace(/\.$/, '')
			.replace(/\(.+\)$/, '')
			.trim()
			.replace(/ (of|for|to|by|from|on)? ▯$/, '');
		const isAMatch = keywords.match(
			/^▯ (?:is|are) (?:(?:a|an|the) )?([^▯,.]+)([,.]|$)/,
		);
		if (isAMatch) return extractGlossWord(isAMatch[1]);
		const verbMatch = keywords.match(/^▯ ([^▯]+)( ▯)?$/);
		if (verbMatch) return extractGlossWord(verbMatch[1]);
	}
	return undefined;
}

readToadua().then(({ results }) => {
	// Sort by ascending score so that higher scoring entries get processed later and overwrite earlier ones.
	results.sort((a, b) => a.score - b.score);

	const entries: Record<string, any> = {};

	for (const result of results) {
		if (result.scope !== 'en') continue;
		if (result.score < 0) continue;
		const head = result.head;
		if (head.length >= 30) continue;
		const body = result.body;
		const gloss = makeGloss(body);
		const entry: any = { body, head, user: result.user, score: result.score };
		if (gloss && gloss.length <= 25) {
			entry.gloss = gloss;
		}
		const frame = guessFrameFromDefinition(body);
		if (frame) entry.frame = frame;
		entries[head] = entry;
	}

	fs.writeFileSync('data/toadua/toadua.json', JSON.stringify(entries));
});
