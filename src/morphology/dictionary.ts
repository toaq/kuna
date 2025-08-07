import { Tone, inTone } from './tone';

export const verbTypes = [
	'name quote',
	'name verb',
	'predicatizer',
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
	'determiner prefix form',
	'end parenthetical',
	'end quote',
	'event accessor',
	'focus particle', // kú
	'focus particle prefix form', // ku-
	'illocution',
	'incorporated determiner',
	'incorporated pronoun',
	'incorporated word determiner', // lô, hû-
	'interjection',
	'plural coordinator',
	'polarity',
	'prefix', // verb-to-verb
	'prefix aspect',
	'prefix conjunctionizer', // ná-
	'prefix conjunctionizer in t1', // na-
	'prefix conjunctionizer in t4', // nâ-
	'prefix tense',
	'preposition',
	'pronoun',
	'quantifier',
	'quantifier with complement',
	'retroactive cleft',
	'sentence connector',
	'start parenthetical',
	'subordinating complementizer',
	'tense',
	'tonal determiner',
	'tonal incorporated determiner',
	'topic marker',
	'vocative',
	'word determiner', // ló, hú-
] as const;

export const wordTypes = [...verbTypes, ...nonVerbTypes];
export const underscoredWordTypes = wordTypes.map(s => s.replace(/ /g, '_'));

const quantifiers = new Set([
	'she',
	'daı',
	'ao',
	'ea',
	'he',
	'faı',
	'leı',
	'guotu',
	'guosa',
	'guosıa',
	'koamchıo',
	'shıchıo',
	'guchıo',
	'saqchıo',
]);

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

export type SubjectType =
	| 'event'
	| 'proposition'
	| 'individual'
	| 'agent'
	| 'free'
	| 'shape';

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
	subject: SubjectType;
}

export interface NonVerbEntry extends BaseEntry {
	type: NonVerbType;
}

export type Entry = VerbEntry | NonVerbEntry;

export function entryArity(entry: VerbEntry): number {
	return entry.frame
		? entry.frame.split(' ').length
		: (entry.english.split(';')[0].match(/▯/g) || []).length;
}

export class Dictionary {
	private initialized = false;
	private inner = new Map<string, Entry>();

	public get(head: string): Entry | undefined {
		if (!this.initialized) {
			this.initialize();
		}
		return this.inner.get(head);
	}

	public has(head: string): boolean {
		if (!this.initialized) {
			this.initialize();
		}
		return this.inner.has(head);
	}

	public keys(): IterableIterator<string> {
		if (!this.initialized) {
			this.initialize();
		}
		return this.inner.keys();
	}

	public values(): IterableIterator<Entry> {
		if (!this.initialized) {
			this.initialize();
		}
		return this.inner.values();
	}

	private initialize() {
		const entries: Entry[] = [
			...require('../../dictionary/dictionary.json'),
			...require('../../data/unofficial.json'),
		] as Entry[];

		for (const e of entries) {
			if (
				e.type === 'complementizer' &&
				/subordinate|relative|property/.test(e.english)
			) {
				e.type = 'subordinating complementizer';
			}

			// We'll assume "prefix" is a verb-to-verb prefix, and make some
			// sub-types for special prefixes.
			if (e.toaq === 'hu-') {
				e.type = 'word determiner';
			}
			if (e.toaq === 'na-') {
				e.type = 'prefix conjunctionizer';
			}
			if (e.toaq === 'kı-') {
				e.type = 'adjective marker';
			}

			// Override the types of some words to be quantifiers
			// TODO: Upstream these changes to dictionary.json
			if (quantifiers.has(e.toaq)) {
				this.inner.set(e.toaq, { ...e, type: 'quantifier' });
				const t4 = inTone(e.toaq, Tone.T4);
				this.inner.set(t4, {
					toaq: t4,
					english: e.english,
					gloss: e.gloss,
					type: 'quantifier with complement',
				});
				continue;
			}

			this.inner.set(e.toaq.toLowerCase(), e);

			if (e.type === 'determiner') {
				const oid = inTone(e.toaq, Tone.T4);
				this.inner.set(oid, {
					toaq: oid,
					english: e.english,
					gloss: `of.${e.gloss}`,
					type: 'incorporated determiner',
				});
			}

			if (e.type === 'pronoun') {
				const oip = inTone(e.toaq, Tone.T4);
				this.inner.set(oip, {
					toaq: oip,
					english: e.english,
					gloss: `of.${e.gloss}`,
					type: 'incorporated pronoun',
				});
			}

			if (e.type === 'conjunction') {
				const t1 = inTone(e.toaq, Tone.T1);
				this.inner.set(t1, {
					toaq: t1,
					english: e.english,
					gloss: e.gloss,
					type: 'conjunction in t1',
				});
				const t4 = inTone(e.toaq, Tone.T4);
				this.inner.set(t4, {
					toaq: t4,
					english: e.english,
					gloss: e.gloss,
					type: 'conjunction in t4',
				});
			}

			if (e.type === 'aspect') {
				const prefix = `${e.toaq}-`;
				this.inner.set(prefix, {
					toaq: prefix,
					english: e.english,
					gloss: e.gloss,
					type: 'prefix aspect',
				});
			}

			if (e.type === 'tense') {
				const prefix = `${e.toaq}-`;
				this.inner.set(prefix, {
					toaq: prefix,
					english: e.english,
					gloss: e.gloss,
					type: 'prefix tense',
				});
			}
		}

		this.inner.set('◌́', {
			toaq: '◌́',
			english: 'the',
			gloss: 'the',
			type: 'determiner',
		});

		this.inner.set('◌̂', {
			toaq: '◌̂',
			english: 'with',
			gloss: 'with',
			type: 'preposition',
		});

		this.inner.delete('ló');
		this.initialized = true;
	}
}

export const dictionary = new Dictionary();
