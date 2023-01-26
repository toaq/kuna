import * as fs from 'fs';

export type VerbType =
	| 'name quote'
	| 'name verb'
	| 'object incorporating verb'
	| 'predicate'
	| 'text quote'
	| 'word quote';

export type NonVerbType =
	| 'aspect'
	| 'cleft verb'
	| 'complementizer'
	| 'conjunction'
	| 'determiner'
	| 'end parenthetical'
	| 'end quote'
	| 'event accessor'
	| 'focus particle'
	| 'illocution'
	| 'interjection'
	| 'modality'
	| 'plural coordinator'
	| 'polarity'
	| 'prefix'
	| 'preposition'
	| 'pronoun'
	| 'retroactive cleft'
	| 'sentence connector'
	| 'start parenthetical'
	| 'tense'
	| 'topic marker'
	| 'vocative';

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
	dictionary.set(e.toaq, e);
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
