import { Impossible } from '../error';
import { Glosser } from '../gloss';
import { Leaf, Tree } from '../tree';
import { Constituent } from './clause-translator';
import { verbFormFor } from './conjugation';

export function leafText(tree: Tree): string {
	if (!('word' in tree)) {
		throw new Impossible('Unexpected non-leaf ' + tree.label);
	}
	if (tree.word.covert) return '';
	return tree.word.text;
}

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
