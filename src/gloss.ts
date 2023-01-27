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

function glossWord(word: string): string {
	word = word
		.replace(/\p{P}/gu, '')
		.toLowerCase()
		.replace(/i/gu, 'ı')
		.replace(/vy?|wy?|y/gu, 'ꝡ');

	const entry = dictionary.get(word);
	if (entry) {
		return entry.gloss_abbreviation || entry.gloss;
	}
	const bareEntry = dictionary.get(bare(word));
	if (bareEntry) {
		if (bareEntry.type === 'predicate') {
			return (tone(word) === Tone.T2 ? 'the-' : 'A-') + bareEntry.gloss;
		} else {
			return bareEntry.gloss;
		}
	}
	return '?';
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
