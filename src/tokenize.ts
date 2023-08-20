import { dictionary, underscoredWordTypes, WordType } from './dictionary';
import { Tone } from './types';

// Vyái → ꝡáı
export function clean(word: string): string {
	return word
		.toLowerCase()
		.replace(/i/gu, 'ı')
		.replace(/vy?|wy?|y/gu, 'ꝡ')
		.normalize();
}

// Vyái → ꝡaı
export function bare(word: string): string {
	return clean(word)
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.normalize()
		.replace(/i/gu, 'ı');
}

// hâo → hao
// dâ → dâ
// vyé → ꝡë
export function baseForm(word: string): string {
	const cleanForm = clean(word);
	if (dictionary.has(cleanForm)) return cleanForm;
	const bareForm = bare(word);
	if (bareForm === 'e') return 'ë';
	if (bareForm === 'ꝡe') return 'ꝡë';
	return bareForm;
}

export function diacriticForTone(tone: Tone): string {
	return ['', '', '\u0301', '\u0308', '\u0302'][tone];
}

export function inTone(word: string, tone: Tone): string {
	return word
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[aeiıou]/u, m => m.replace('ı', 'i') + diacriticForTone(tone))
		.normalize()
		.replace(/i/gu, 'ı');
}

export function tone(word: string): Tone {
	const norm = word.normalize('NFKD').match(/[\u0301\u0308\u0302]/);
	if (!norm) {
		return Tone.T1;
	}
	return {
		'\u0301': Tone.T2,
		'\u0308': Tone.T3,
		'\u0302': Tone.T4,
	}[norm[0]]!;
}

export interface ToaqToken {
	type: string;
	value: string;
	index: number | undefined;
}

export class ToaqTokenizer {
	tokens: ToaqToken[] = [];
	pos: number = 0;
	constructor() {}
	reset(text: string, _info?: {}): void {
		this.tokens = [];
		this.pos = 0;
		for (const m of [...text.matchAll(/[\p{L}\p{N}\p{Diacritic}]+-?/gu)]) {
			const tokenText = m[0];
			const lemmaForm = clean(tokenText);
			const exactEntry = dictionary.get(lemmaForm);

			if (exactEntry) {
				this.tokens.push({
					type: exactEntry.type.replace(/ /g, '_'),
					value: tokenText,
					index: m.index,
				});
				continue;
			}

			const base = baseForm(tokenText);
			const entry = dictionary.get(base);
			const wordTone = tone(tokenText);
			if (entry) {
				this.tokens.push({
					type: wordTone === Tone.T2 ? 'determiner' : 'preposition',
					value: wordTone === Tone.T2 ? '◌́' : '◌̂',
					index: m.index,
				});
				this.tokens.push({
					type: entry.type.replace(/ /g, '_'),
					value: base,
					index: m.index,
				});
				continue;
			}
			if (wordTone === Tone.T1) {
				this.tokens.push({
					type: 'predicate',
					value: tokenText,
					index: m.index,
				});
			} else {
				this.tokens.push({
					type: wordTone === Tone.T2 ? 'determiner' : 'preposition',
					value: wordTone === Tone.T2 ? '◌́' : '◌̂',
					index: m.index,
				});
				this.tokens.push({
					type: 'predicate',
					value: base,
					index: m.index,
				});
			}
		}
	}
	next(): ToaqToken | undefined {
		return this.tokens[this.pos++];
	}
	save(): {} {
		return {};
	}
	formatError(token: ToaqToken) {
		return `${token.value} at column ${token.index}`;
	}
	has(tokenType: string): boolean {
		return underscoredWordTypes.includes(tokenType);
	}
}
