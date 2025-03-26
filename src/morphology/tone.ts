export enum Tone {
	T1 = 1,
	T2 = 2,
	T3 = 3,
	T4 = 4,
}

/**
 * Change a word to have the given tone.
 *
 * For example, `inTone('Suao', Tone.T2)` is `'Súao'`.
 */
export function inTone(word: string, tone: Tone): string {
	return word
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[aeiıou]/iu, m => m.replace('ı', 'i') + diacriticForTone(tone))
		.normalize()
		.replace(/i/gu, 'ı');
}

/**
 * Repair tones in a given string, replacing substrings like `'◌́ hao'` with `'háo'`.
 */
export function repairTones(text: string): string {
	return text.replace(/◌(.) (\S+)/g, (_m, diacritic, word) => {
		const tone = diacritic === '\u0301' ? Tone.T2 : Tone.T4;
		return inTone(word, tone);
	});
}

/**
 * Detect what tone a word is in.
 */
export function tone(word: string): Tone {
	// This is faster than regex:
	const norm = word.normalize('NFKD');
	return norm.includes('\u0301')
		? Tone.T2
		: norm.includes('\u0308')
			? Tone.T3
			: norm.includes('\u0302')
				? Tone.T4
				: Tone.T1;
}

/**
 * Return the combining diacritic character for the given tone.
 */
export function diacriticForTone(tone: Tone): string {
	return ['', '', '\u0301', '\u0308', '\u0302'][tone];
}
