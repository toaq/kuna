import { dictionary } from './dictionary';
import { bare, tone } from './tokenize';
import { Tone } from './types';

interface Gloss {
	toaq: string;
	english: string;
}

function displayLength(text: string): number {
	return text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').length;
}

function splitIntoRaku(word: string): string[] {
	return [...word.matchAll(/'?[^aeiıou][aeiıou+][qm]?/gu)].map(m => m[0]);
}

function splitPrefixes(word: string): { prefixes: string[]; root: string } {
	const parts = word
		.normalize('NFKD')
		.replace(/\u0323/gu, '-')
		.normalize('NFC')
		.split('-');
	const root = parts.pop()!;
	return { prefixes: parts.flatMap(splitIntoRaku), root };
}

function glossPrefix(prefix: string): string {
	const entry = dictionary.get(prefix + '-');
	if (entry) {
		return (entry.gloss_abbreviation || entry.gloss) + '-';
	}

    // hack
    const rootEntry = dictionary.get(prefix);
	if (rootEntry) {
		return (rootEntry.gloss_abbreviation || rootEntry.gloss) + '-';
	}

	return '?-';
}

function glossRoot(root: string): string {
	const entry = dictionary.get(root);
	if (entry) {
		return entry.gloss_abbreviation || entry.gloss;
	}
	const bareEntry = dictionary.get(bare(root));
	if (bareEntry) {
		if (bareEntry.type === 'predicate') {
			return (tone(root) === Tone.T2 ? 'the-' : 'A-') + bareEntry.gloss;
		} else {
			return bareEntry.gloss;
		}
	}
	return '?';
}

function glossWord(word: string): string {
	word = word
		.replace(/[.,;()]/gu, '')
		.toLowerCase()
		.replace(/i/gu, 'ı')
		.replace(/vy?|wy?|y/gu, 'ꝡ');

	const { prefixes, root } = splitPrefixes(word);
	return prefixes.map(glossPrefix).join('') + glossRoot(root);
}

export function glossSentence(sentence: string): Gloss[] {
	return sentence
		.trim()
		.split(/\s+/)
		.map(w => ({ toaq: w, english: glossWord(w) }));
}

export function alignGlossSentence(sentence: string): string {
	let top = '#';
	let bot = ' ';
	for (const entry of glossSentence(sentence)) {
		const lt = displayLength(entry.toaq);
		const lb = displayLength(entry.english);
		top += ' ' + entry.toaq + ''.padEnd(lb - lt);
		bot += ' ' + entry.english + ''.padEnd(lt - lb);
	}
	return top + '\n' + bot;
}
