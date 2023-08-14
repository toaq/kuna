import { dictionary } from './dictionary';
import { bare, clean, tone } from './tokenize';
import { Tone } from './types';
import * as fs from 'fs';

let toaduaGlosses = new Map();
for (const line of fs
	.readFileSync('data/toadua-glosses.tsv')
	.toString()
	.split('\n')) {
	const fields = line.split('\t');
	if (fields.length === 2) {
		const [word, gloss] = fields;
		toaduaGlosses.set(word, gloss.replace(/\s+/g, '.'));
	}
}

const words = [...toaduaGlosses.keys()].concat([...dictionary.keys()]);
words.sort((a, b) => b.length - a.length);
const partRegExp = new RegExp(
	words.join('|') + "(?=[bcdfghjklmnpqrstvwxzꝡ']|$)",
	'gui',
);
const compoundRegExp = new RegExp(`^((${partRegExp.source})){1,3}$`, 'ui');

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

	// hacky fallback for unknown prefixes: gloss them as if they were words
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
	if (clean(root) === 'é') {
		return 'the\\EVA';
	}
	const bareRoot = bare(root);
	const bareEntry = dictionary.get(bareRoot);
	if (bareEntry) {
		if (bareEntry.type === 'predicate') {
			return (tone(root) === Tone.T2 ? 'the\\' : 'A\\') + bareEntry.gloss;
		} else {
			return bareEntry.gloss;
		}
	}
	const fromToadua = toaduaGlosses.get(root) ?? toaduaGlosses.get(bareRoot);
	if (fromToadua) {
		return fromToadua;
	}

	const match = bareRoot.match(compoundRegExp);
	if (match) {
		const last = match[1];
		const butLast = bareRoot.slice(0, bareRoot.length - last.length);
		return glossRoot(butLast) + '-' + glossRoot(last);
	}

	return bareRoot;
}

function glossWord(word: string): string {
	word = clean(word.replace(/[\p{Pe}\p{Pf}\p{Pi}\p{Po}\p{Ps}]/gu, ''));

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
