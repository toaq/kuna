import { dictionary, underscoredWordTypes, WordType } from './dictionary';
import { Impossible } from './error';
import { Tone } from './types';

// Vyái → ꝡáı
export function clean(word: string): string {
	return word
		.toLowerCase()
		.replace(/i/gu, 'ı')
		.replace(/vy?|wy?|y/gu, 'ꝡ')
		.replace(/‘|’/gu, "'")
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

/**
 * Split a word into raku. The output is a list of NFKD-normalized strings, i.e.
 * diacritcs are turned into combining characters.
 */
export function splitIntoRaku(word: string): string[] {
	const raku = [
		...word
			.normalize('NFKD')
			.matchAll(
				/(b|c|ch|d|f|g|h|j|k|l|m|n|nh|p|r|s|sh|t|vy?|wy?|ꝡ|y|z|')?[aeiıou]\p{Diacritic}*[aeiıou]*(q|m(?![aeiıou]))?-?/giu,
			),
	].map(m => {
		return m[0];
	});

	// By summing lengths and comparing them to the length of the word, we check
	// if the matches for the above regex completely cover the word. If it does,
	// we successfully split a Toaq word into raku: "Lojibaq" → [Lo, ji, baq].
	// If it doesn't, we return an unsplit "foreign" word: "Lojban" → [Lojban].
	const totalLength = raku.reduce((a, b) => a + b.length, 0);
	if (totalLength === word.normalize('NFKD').length) {
		return raku;
	} else {
		return [word];
	}
}

export function splitPrefixes(word: string): {
	prefixes: string[];
	root: string;
} {
	let raku = splitIntoRaku(word.normalize('NFKD')).map(x =>
		x.includes('\u0323') ? x.replace(/\u0323/gu, '') + '-' : x,
	);
	const diacriticIndex = raku.findIndex(r =>
		/[\u0300\u0301\u0308\u0302]/.test(r),
	);
	if (diacriticIndex > 0) {
		// This word is written using the prefix reform. Fix it up:
		raku[diacriticIndex] = raku[diacriticIndex].replace(/\u0300/gu, '');
		raku[diacriticIndex - 1] += '-';
	}
	const prefixCount = raku.findIndex(p => p.endsWith('-')) + 1;
	const prefixes = raku
		.slice(0, prefixCount)
		.map(x => bare(x).replace(/-$/, ''));
	const t = tone(word);
	const baseRoot = raku
		.slice(prefixCount)
		.map(x => x.normalize('NFC'))
		.join('');
	const root = inTone(baseRoot, t);
	return { prefixes, root };
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
		for (const m of [...text.matchAll(/[\p{L}\p{N}\p{Diacritic}-]+/gu)]) {
			const { prefixes, root } = splitPrefixes(m[0]);
			for (const tokenText of [...prefixes.map(p => p + '-'), root]) {
				const lemmaForm = clean(tokenText);
				if (!lemmaForm) {
					throw new Impossible('empty token at ' + m.index);
				}
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

export function tokenString(sentence: string): string {
	const tokenizer = new ToaqTokenizer();
	tokenizer.reset(sentence);
	const tokens = tokenizer.tokens.map(t => t.value);
	return tokens.join(' ');
}
