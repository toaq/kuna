import { inTone } from './tokenize';
import { Tone } from './tone';

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
	'end parenthetical',
	'end quote',
	'event accessor',
	'focus particle', // kú
	'focus particle prefix form', // ku-
	'illocution',
	'incorporated complementizer',
	'incorporated determiner',
	'incorporated prefix pronoun', // hû-
	'incorporated pronoun',
	'interjection',
	'modality',
	'modality with complement',
	'plural coordinator',
	'polarity',
	'prefix', // verb-to-verb
	'prefix aspect',
	'prefix conjunctionizer', // ná-
	'prefix conjunctionizer in t1', // na-
	'prefix conjunctionizer in t4', // nâ-
	'prefix pronoun', // hú-
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
			if (e.type === 'complementizer') {
				if (e.english.includes('relative')) {
					e.type = 'relative clause complementizer';
				} else if (/subordinate|property/.test(e.english)) {
					e.type = 'subordinating complementizer';
					const ic = inTone(e.toaq, Tone.T4);
					this.inner.set(ic, {
						toaq: ic,
						english: e.english,
						gloss: `of.${e.gloss}`,
						type: 'incorporated complementizer',
					});
				}
			}

			// We'll assume "prefix" is a verb-to-verb prefix, and make some
			// sub-types for special prefixes.
			if (e.toaq === 'hu-') {
				e.type = 'prefix pronoun';
			}
			if (e.toaq === 'na-') {
				e.type = 'prefix conjunctionizer';
			}
			if (e.toaq === 'kı-') {
				e.type = 'adjective marker';
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

			if (e.type === 'modality') {
				const t4 = inTone(e.toaq, Tone.T4);
				this.inner.set(t4, {
					toaq: t4,
					english: e.english,
					gloss: e.gloss,
					type: 'modality with complement',
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
