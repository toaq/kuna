import { toadua } from './toadua';

export function guessFrameFromDefinition(definition: string): string {
	const frame = definition
		.split(';')[0]
		.toLowerCase()
		.replace(/▯ (\S+ ){0,2}the case/g, '０')
		.replace(/satisf\w+ (property ?)▯/g, '１')
		.replace(/relation ▯/g, '２')
		.replace(/▯/g, 'ｃ')
		.replace(/[^０１２ｃ]/g, '')
		.normalize('NFKC');
	return [...frame].join(' ');
}

export function guessFrameUsingToadua(lemma: string): string {
	const entry = toadua.get(lemma);
	return entry ? guessFrameFromDefinition(entry.body) : '?';
}
