export function guessFrameFromDefinition(definition: string): string {
	const def = definition.split(';').filter(x => !x.startsWith('predicate:'))[0];
	if (!def) return '?';
	const frame = def
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
