import * as fs from 'fs';
import { inTone } from './tokenize';
import { Tone } from './types';

export const verbTypes = [
	'name quote',
	'name verb',
	'object incorporating verb',
	'predicate',
	'text quote',
	'word quote',
] as const;

export type VerbType = typeof verbTypes[number];

export const nonVerbTypes = [
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
	'interjection',
	'modality',
	'modality with complement',
	'object incorporating determiner',
	'plural coordinator',
	'polarity',
	'prefix',
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

export type NonVerbType = typeof nonVerbTypes[number];

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

const entries: Entry[] = JSON.parse(
	fs.readFileSync('dictionary/dictionary.json').toString('utf-8'),
);

export const dictionary = new Map<string, Entry>();
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
	dictionary.set(e.toaq, e);
	if (e.type === 'determiner') {
		const oid = inTone(e.toaq, Tone.T4);
		dictionary.set(oid, {
			toaq: oid,
			english: e.english,
			gloss: 'of.' + e.gloss,
			type: 'object incorporating determiner',
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
