import { toadua } from './toadua';

export function guessFrameFromDefinition(definition: string): string {
	const frame = definition
		.split(';')[0]
		.toLowerCase()
		.replace(/\d/g, '')
		.replace(/▯ (\S+ ){0,2}the case/g, '0')
		.replace(/satisf\w+ (property )?▯/g, '1')
		.replace(/property ▯/g, '1')
		.replace(/relation ▯/g, '2')
		.replace(/[^012▯]/g, '')
		.replace(/▯/g, 'c');
	return [...frame].join(' ');
}

export function guessFrameUsingToadua(lemma: string): string {
	const entry = toadua.get(lemma);
	return entry ? guessFrameFromDefinition(entry.body) : '?';
}
