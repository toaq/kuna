import { Glosser } from '../morphology/gloss';
import { Leaf } from '../tree';
import { leafText } from '../tree/functions';
import { Constituent } from './clause-translator';
import { verbFormFor } from './conjugation';

export function leafTextToEnglish(text: string): string {
	if (text === '◌́') {
		return 'the';
	}
	return new Glosser(true).glossWord(text);
}

export function leafToEnglish(tree: Leaf): Constituent {
	const text = leafTextToEnglish(leafText(tree));
	return {
		text,
		person: verbFormFor(text),
	};
}
