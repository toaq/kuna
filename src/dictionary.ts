import { inTone } from './tokenize';
import { Tone } from './types';
import dictionaryJson from '../dictionary/dictionary.json';

export const verbTypes = [
	'name quote',
	'name verb',
	'object incorporating verb',
	'predicate',
	'text quote',
	'word quote',
] as const;

export type VerbType = (typeof verbTypes)[number];

export const nonVerbTypes = [
	'adjective marker',
	'aspect',
	'cleft verb',
	'complementizer',
	'conjunction',
	'conjunction in t1',
	'conjunction in t4',
	'determiner',
	'end parenthetical',
	'end quote',
	'event accessor',
	'focus particle',
	'illocution',
	'incorporated complementizer',
	'incorporated determiner',
	'incorporated pronoun',
	'interjection',
	'modality',
	'modality with complement',
	'plural coordinator',
	'polarity',
	'prefix', // verb-to-verb
	'prefix aspect',
	'prefix conjunctionizer', // na-
	'prefix pronoun', // hu-
	'prefix tense',
	'preposition',
	'pronoun',
	'retroactive cleft',
	'relative clause complementizer',
	'sentence connector',
	'start parenthetical',
	'subordinating complementizer',
	'tense',
	'topic marker',
	'vocative',
] as const;

export const wordTypes = [...verbTypes, ...nonVerbTypes];
export const underscoredWordTypes = wordTypes.map(s => s.replace(/ /g, '_'));

export type NonVerbType = (typeof nonVerbTypes)[number];

export type WordType = VerbType | NonVerbType;

export type PronominalClass =
	| 'ho'
	| 'hoq'
	| 'maq'
	| 'raı'
	| 'ta'
	| 'ta_strong'
	| 'ze';

export interface BaseEntry {
	toaq: string;
	english: string;
	gloss: string;
	gloss_abbreviation?: string;
}

export interface VerbEntry extends BaseEntry {
	type: VerbType;
	frame: string;
	distribution: string;
	pronominal_class: PronominalClass | '';
}

export interface NonVerbEntry extends BaseEntry {
	type: NonVerbType;
}

export type Entry = VerbEntry | NonVerbEntry;

const entries: Entry[] = dictionaryJson as Entry[];

export const dictionary = new Map<string, Entry>();

export function entryArity(entry: VerbEntry): number {
	return entry.frame
		? entry.frame.split(' ').length
		: (entry.english.split(';')[0].match(/▯/g) || []).length;
}

/**
 * Initialize the `dictionary`. This must be called before calling other kuna
 * functions.
 */
export function initializeDictionary(): void {
	for (const e of entries) {
		delete (e as any).examples;
		delete (e as any).keywords;
		delete (e as any).notes;
		if (e.type === 'complementizer') {
			if (e.english.includes('relative')) {
				e.type = 'relative clause complementizer';
			} else if (/subordinate|property/.test(e.english)) {
				e.type = 'subordinating complementizer';
				const ic = inTone(e.toaq, Tone.T4);
				dictionary.set(ic, {
					toaq: ic,
					english: e.english,
					gloss: 'of.' + e.gloss,
					type: 'incorporated complementizer',
				});
			}
		}

		// We'll assume "prefix" is a verb-to-verb prefix, and make some
		// sub-types for special prefixes.
		if (e.toaq == 'hu-') {
			e.type = 'prefix pronoun';
		}
		if (e.toaq == 'na-') {
			e.type = 'prefix conjunctionizer';
		}
		if (e.toaq == 'kı-') {
			e.type = 'adjective marker';
		}
		dictionary.set(e.toaq.toLowerCase(), e);

		if (e.type === 'determiner') {
			const oid = inTone(e.toaq, Tone.T4);
			dictionary.set(oid, {
				toaq: oid,
				english: e.english,
				gloss: 'of.' + e.gloss,
				type: 'incorporated determiner',
			});
		}

		if (e.type === 'pronoun') {
			const oip = inTone(e.toaq, Tone.T4);
			dictionary.set(oip, {
				toaq: oip,
				english: e.english,
				gloss: 'of.' + e.gloss,
				type: 'incorporated pronoun',
			});
		}

		if (e.type === 'conjunction') {
			const t1 = inTone(e.toaq, Tone.T1);
			dictionary.set(t1, {
				toaq: t1,
				english: e.english,
				gloss: e.gloss,
				type: 'conjunction in t1',
			});
			const t4 = inTone(e.toaq, Tone.T4);
			dictionary.set(t4, {
				toaq: t4,
				english: e.english,
				gloss: e.gloss,
				type: 'conjunction in t4',
			});
		}

		if (e.type === 'modality') {
			const t4 = inTone(e.toaq, Tone.T4);
			dictionary.set(t4, {
				toaq: t4,
				english: e.english,
				gloss: e.gloss,
				type: 'modality with complement',
			});
		}

		if (e.type === 'aspect') {
			const prefix = e.toaq + '-';
			dictionary.set(prefix, {
				toaq: prefix,
				english: e.english,
				gloss: e.gloss,
				type: 'prefix aspect',
			});
		}

		if (e.type === 'tense') {
			const prefix = e.toaq + '-';
			dictionary.set(prefix, {
				toaq: prefix,
				english: e.english,
				gloss: e.gloss,
				type: 'prefix tense',
			});
		}
	}

	dictionary.set('◌́', {
		toaq: '◌́',
		english: 'the',
		gloss: 'the',
		type: 'determiner',
	});

	dictionary.set('◌̂', {
		toaq: '◌̂',
		english: 'with',
		gloss: 'with',
		type: 'preposition',
	});

	dictionary.delete('ló');
}
