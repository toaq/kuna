import * as fs from 'fs';
import { guessFrameFromDefinition } from '../frame';
import https from 'https';

async function fetchToadua(): Promise<{ results: any[] }> {
	return new Promise((resolve, reject) => {
		const req = https.request(
			{
				hostname: 'toadua.uakci.pl',
				path: '/api',
				method: 'POST',
			},
			res => {
				const chunks: Buffer[] = [];
				res.on('data', data => chunks.push(data));
				res.on('end', () => {
					let body = Buffer.concat(chunks).toString('utf8');
					resolve(JSON.parse(body));
				});
			},
		);
		req.on('error', reject);
		req.write(JSON.stringify({ action: 'search', query: ['scope', 'en'] }));
		req.end();
	});
}

async function readToadua(): Promise<{ results: any[] }> {
	if (!fs.existsSync('data/toadua/dump.json')) {
		const toadua = await fetchToadua();
		fs.writeFileSync('data/toadua/dump.json', JSON.stringify(toadua));
		return toadua;
	} else {
		return JSON.parse(fs.readFileSync('data/toadua/dump.json').toString());
	}
}

function extractGlossWord(text: string) {
	return text.split('/')[0].trim().replaceAll(/[()"]/g, '');
}

function makeGloss(body: string) {
	const m = body.match(/['‘’\"“”]([A-Za-z .]+)['‘’\"“”];/);
	if (m) return m[1];
	body = body.split(';')[0].trim();
	body = body.replace(/\.$/, '');
	body = body.replace(/\(.+\)$/, '');
	body = body.trim();
	body = body.replace(/ (of|for|to|by|from|on)? ▯$/, '');
	const m2 = body.match(/^▯ (?:is|are) (?:(?:a|an|the) )?([^▯]+)$/);
	if (m2) return extractGlossWord(m2[1]);
	const m3 = body.match(/^▯ ([^▯]+)( ▯)?$/);
	if (m3) return extractGlossWord(m3[1]);
	return undefined;
}

readToadua().then(({ results }) => {
	// Sort by ascending score so that higher scoring entries get processed later and overwrite earlier ones.
	results.sort((a, b) => a.score - b.score);

	let glosses: Record<string, string> = {};
	let frames: Record<string, string> = {};

	for (let entry of results) {
		if (entry['scope'] !== 'en') continue;
		if (entry['score'] < 0) continue;
		const head = entry['head'];
		if (head.length >= 30) continue;
		const body = entry['body'];
		const gloss = makeGloss(body);
		if (gloss && gloss.length <= 25) {
			glosses[head] = gloss;
		}
		const frame = guessFrameFromDefinition(body);
		if (frame) frames[head] = frame;
	}

	fs.writeFileSync('data/toadua/glosses.json', JSON.stringify(glosses));
	fs.writeFileSync('data/toadua/frames.json', JSON.stringify(frames));
});
