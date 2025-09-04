import { Impossible, Ungrammatical } from '../core/error';
import { dictionary, underscoredWordTypes } from './dictionary';
import { Tone, inTone, tone } from './tone';

/**
 * Cleans up a Toaq word or string by normalizing ı, ꝡ, apostrophes,
 * case, and diacritics.
 *
 * For example, `Vye\u0301` becomes `ꝡé`.
 */
export function clean(word: string): string {
	return word
		.toLowerCase()
		.replace(/i/gu, 'ı')
		.replace(/vy?|wy?|y/gu, 'ꝡ')
		.replace(/‘|’/gu, "'")
		.normalize();
}

/**
 * "Bares" a Toaq word, by calling `clean` and removing diacritics.
 *
 * For example, `Vyé` becomes `ꝡe`.
 */
export function bare(word: string): string {
	return clean(word)
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.normalize()
		.replace(/i/gu, 'ı');
}

/**
 * Returns the base dictionary form of a Toaq word, by calling `clean`
 * and then restoring the inherent tone.
 *
 * For example, `hâo → hao`, `Dâ → dâ`, `vyé → ꝡë`.
 */
export function baseForm(word: string): string {
	const cleanForm = clean(word);
	if (dictionary.has(cleanForm)) return cleanForm;
	const bareForm = bare(word);
	if (bareForm === 'e') return 'ë';
	if (bareForm === 'ꝡe') return 'ꝡë';
	if (bareForm === 'la') return 'lä';
	return bareForm;
}

/**
 * Split a word into raku. The output is a list of NFKD-normalized strings, i.e.
 * diacritics are turned into combining characters.
 * Beware: the raku returned may have a leading o'aomo.
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
	}
	return [word];
}

/**
 * Joins raku into a word.
 * Beware: leading o'aomo must be explicitly written.
 */
export function joinRaku(raku: string[]): string {
	return raku.join('').replace(/^\p{P}/u, ''); // Strip leading o'aomo
}

/**
 * Split a Toaq word into a list of prefixes and a root.
 */
export function splitPrefixes(word: string): {
	prefixes: string[];
	root: string;
} {
	const raku = splitIntoRaku(word.normalize('NFKD')).map(x =>
		x.includes('\u0323') ? `${x.replace(/\u0323/gu, '')}-` : x,
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
	const baseRoot = joinRaku(
		raku.slice(prefixCount).map(x => x.normalize('NFC')),
	);
	const root = inTone(baseRoot, t);
	return { prefixes, root };
}

/**
 * A Toaq word tagged with a token type and its index in the input string.
 * For example: `{type: "determiner", value: "sá", index: 8}`
 */
export interface ToaqToken {
	type: string;
	value: string;
	index: number | undefined;
}

/**
 * A range of positions in the input string, used by the tokenizer to keep track of quotations.
 */
interface Range {
	start: number;
	end: number;
}

export class ToaqTokenizer {
	tokens: ToaqToken[] = [];
	pos = 0;

	reset(text: string): void {
		this.tokens = [];
		this.pos = 0;
		let textQuoteRange: Range | null = null;
		let textQuoteDepth = 0;
		let wordQuote = false;

		for (const m of text.matchAll(/[\p{L}\p{N}\p{Diacritic}-]+/gu)) {
			if (wordQuote && textQuoteDepth === 0) {
				// We are inside a word quote; emit this word as a token
				this.tokens.push({ type: 'word', value: m[0], index: m.index });
				wordQuote = false;
				continue;
			}

			const { prefixes, root } = splitPrefixes(m[0]);
			const lastTextQuoteDepth = textQuoteDepth;
			const wordTokens: ToaqToken[] = [];
			let tokenQuote = false;
			let toneInPrefix = false;

			for (const tokenText of [...prefixes.map(p => `${p}-`), root]) {
				const lemmaForm = clean(tokenText);
				if (!lemmaForm) throw new Impossible(`empty token at ${m.index}`);
				const exactEntry = dictionary.get(lemmaForm);
				const base = baseForm(tokenText);
				const entry = dictionary.get(base);

				if (tokenQuote) {
					if (tokenText.endsWith('-'))
						throw new Ungrammatical('hu- must be followed by a root');

					const hu = wordTokens.at(-1)!;
					hu.value = inTone(hu.value, tone(tokenText));
					if (tone(tokenText) === Tone.T4) {
						hu.type = 'incorporated_word_determiner';
					}
					wordTokens.push({
						type: 'word',
						value: bare(tokenText),
						index: m.index,
					});

					tokenQuote = false;
					continue;
				}

				if (entry) {
					// Deal with words that open and close quotes (except those that are
					// themselves quoted by a word quote!)
					if (wordQuote) {
						wordQuote = false;
					} else {
						wordQuote =
							entry.type === 'word quote' || entry.type === 'name verb';
						if (entry.type === 'text quote' || entry.type === 'name quote') {
							textQuoteDepth++;
						} else if (entry.type === 'end quote') {
							textQuoteDepth--;
							if (textQuoteDepth === 0) {
								// Close out the quote
								this.tokens.push({
									type: 'text',
									value: text.slice(textQuoteRange!.start, textQuoteRange!.end),
									index: textQuoteRange!.start,
								});
								textQuoteRange = null;
							}
						}
					}
				}

				if (exactEntry) {
					if (exactEntry.type === 'prefix conjunctionizer') {
						const wordTone = tone(m[0]);
						if (wordTone === Tone.T3) {
							throw new Ungrammatical('na- in t3 word');
						}
						wordTokens.push({
							type:
								wordTone === Tone.T1
									? 'prefix_conjunctionizer_in_t1'
									: wordTone === Tone.T4
										? 'prefix_conjunctionizer_in_t4'
										: 'prefix_conjunctionizer',
							value: inTone(tokenText, wordTone),
							index: m.index,
						});
						toneInPrefix = true;
					} else {
						if (exactEntry.type === 'word determiner') {
							tokenQuote = true;
						}
						wordTokens.push({
							type: exactEntry.type.replace(/ /g, '_'),
							value: tokenText,
							index: m.index,
						});
					}
					continue;
				}

				const wordTone = tone(tokenText);

				if (entry) {
					if (!toneInPrefix) {
						if (
							entry.type === 'complementizer' ||
							entry.type === 'subordinating complementizer' ||
							entry.type === 'event accessor' ||
							entry.type === 'word quote' ||
							entry.type === 'text quote'
						) {
							if (wordTone !== Tone.T3) {
								wordTokens.unshift(
									wordTone === Tone.T2
										? { type: 'tonal_determiner', value: '◌́', index: m.index }
										: {
												type: 'tonal_incorporated_determiner',
												value: '◌̂',
												index: m.index,
											},
								);
							}
							wordTokens.push(
								entry.type === 'complementizer'
									? {
											type: 'subordinating_complementizer',
											value: inTone(tokenText, Tone.T3),
											index: m.index,
										}
									: {
											type: entry.type.replace(/ /g, '_'),
											value: base,
											index: m.index,
										},
							);
							continue;
						}
						if (entry.type === 'interjection') {
							wordTokens.push({
								type: 'interjection',
								value: tokenText,
								index: m.index,
							});
							continue;
						}
						if (wordTone === Tone.T2) {
							if (entry.type === 'predicate') {
								wordTokens.unshift({
									type: 'word_determiner',
									value: '◌́',
									index: m.index,
								});
								wordTokens.push({
									type: 'word',
									value: inTone(tokenText, tone(base)),
									index: m.index,
								});
								continue;
							}
							if (
								entry.type === 'predicatizer' ||
								entry.type === 'name quote' ||
								entry.type === 'name verb'
							) {
								wordTokens.unshift({
									type: 'tonal_determiner',
									value: '◌́',
									index: m.index,
								});
								// Fall through to push the word's base form
							} else throw new Ungrammatical(`${entry.type} in rising tone`);
						} else if (wordTone === Tone.T4) {
							wordTokens.unshift({
								type: 'preposition',
								value: '◌̂',
								index: m.index,
							});
						} else throw new Ungrammatical(`${entry.type} in tone ${wordTone}`);
					}
					wordTokens.push({
						type: entry.type.replace(/ /g, '_'),
						value: inTone(tokenText, tone(base)),
						index: m.index,
					});
					continue;
				}
				if (wordTone === Tone.T1) {
					wordTokens.push({
						type: 'predicate',
						value: tokenText,
						index: m.index,
					});
				} else if (!toneInPrefix) {
					if (wordTone === Tone.T2) {
						wordTokens.unshift({
							type: 'word_determiner',
							value: '◌́',
							index: m.index,
						});
						wordTokens.push({
							type: 'word',
							value: inTone(tokenText, tone(base)),
							index: m.index,
						});
					} else {
						wordTokens.unshift({
							type: 'preposition',
							value: '◌̂',
							index: m.index,
						});
						wordTokens.push({
							type: 'predicate',
							value: inTone(tokenText, tone(base)),
							index: m.index,
						});
					}
				}
			}

			if (lastTextQuoteDepth > 0 && textQuoteDepth > 0) {
				// We are inside a text quote; don't emit any tokens until closed
				textQuoteRange ??= { start: m.index!, end: 0 };
				textQuoteRange.end = m.index! + m[0].length;
			} else {
				this.tokens.push(...wordTokens);
			}
		}
	}
	next(): ToaqToken | undefined {
		return this.tokens[this.pos++];
	}
	save(): object {
		return {};
	}
	formatError(token: ToaqToken) {
		return `${token.value} at column ${token.index}`;
	}
	has(tokenType: string): boolean {
		return (
			underscoredWordTypes.includes(tokenType) ||
			tokenType === 'word' ||
			tokenType === 'text'
		);
	}
}
