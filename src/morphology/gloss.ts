import toaduaGlossesJson from '../../data/toadua/toadua.json';
import { Entry, dictionary } from './dictionary';
import { bare, clean, splitPrefixes, tone } from './tokenize';
import { Tone } from './tone';

interface Gloss {
	toaq: string;
	english: string;
}

let toaduaGlosses = new Map();
for (const [word, e] of Object.entries(toaduaGlossesJson)) {
	if ('gloss' in e)
		toaduaGlosses.set(word.toLowerCase(), e.gloss.replace(/\s+/g, '.'));
}

const words = [...toaduaGlosses.keys()]
	.concat([...dictionary.keys()])
	.filter(x => x);
words.sort((a, b) => b.length - a.length);
const partRegExp = new RegExp(
	words.join('|') + "(?=[bcdfghjklmnpqrstvwxzꝡ']|$)",
	'gui',
);
const compoundRegExp = new RegExp(`^((${partRegExp.source})){1,3}$`, 'ui');

const easyGlossMap: Record<string, string> = {
	'1+2': 'us',
	'1+2+3': 'us',
	'1+3': 'us',
	'1S': 'me',
	'2+3': "y'all",
	'2P': "y'all",
	'2S': 'you',
	'3I.ANIM': 'one',
	'3P': 'them',
	'3S': 'her',
	'AFF.CONTR': 'is!',
	'EXS.FUT': 'will.ever',
	'EXS.PST': 'has.ever',
	'it.I': 'them',
	'it.II': 'it',
	'it.III': 'it',
	'it.IV': 'it',
	'NAME.QUOTE': 'named',
	'NEAR.FUT': 'will.soon',
	'NEAR.PST': 'did.just',
	'NEC.IND': 'if',
	'NEC.SUBJ': 'would',
	'NEG.CONTR': 'not!',
	'POSB.IND': 'can',
	'POSB.SUBJ': 'could',
	'REM.FUT': 'will.once',
	'REM.PST': 'did.once',
	'RHET.INT': 'or.what?',
	ADJ: '',
	ADM: 'watch.out!',
	AFF: 'is',
	ASRT: 'I.claim',
	CLE: 'is',
	CMPR: 'more',
	COMP: 'that',
	ENDO: 'that',
	EVA: 'event.of',
	EXO: 'the',
	EXPL: "it's.that",
	EXS: 'ever',
	FUT: 'will',
	GA: 'of',
	GEN: 'a',
	GNO: 'be',
	IMPF: '-ing',
	INT: 'I.ask?',
	NAME: 'named',
	NEG: 'not',
	NRST: 'which',
	OPP: 'anti',
	OPT: 'please!',
	PERF: 'do.fully',
	PERM: 'you.may',
	PPF: 'ed',
	PREV: 'that',
	PROM: 'I.promise',
	PRS: 'now',
	PRSP: 'is.yet.to',
	PST: 'did',
	QUOTE: 'quote',
	RECP: 'each.other',
	RETR: 'has',
	RST: 'which',
	SPRF: 'still',
	SUBF: 'already',
	SUP: 'most',
	TOP: ':',
	VOC: 'o',
	WORD: 'the.word',
};

function displayLength(text: string): number {
	return text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').length;
}

export class Glosser {
	useEasyGlosses: boolean;
	constructor(easy: boolean) {
		this.useEasyGlosses = easy;
	}

	protected getGloss(entry: Entry): string {
		const g = entry.gloss;
		const ga = entry.gloss_abbreviation;
		if (this.useEasyGlosses) {
			const easy = easyGlossMap[ga || g];
			if (easy) {
				return easy;
			}
		}
		return ga ?? g;
	}

	protected glossPrefix(prefix: string): string {
		const entry = dictionary.get(prefix + '-');
		if (entry) {
			return this.getGloss(entry) + '-';
		}

		// hacky fallback for unknown prefixes: gloss them as if they were words
		const rootEntry = dictionary.get(prefix);
		if (rootEntry) {
			return this.getGloss(rootEntry) + '-';
		}

		return '?-';
	}

	protected glossRoot(root: string): string {
		const entry = dictionary.get(root);
		if (entry) {
			return this.getGloss(entry);
		}
		if (clean(root) === 'é') {
			return 'the\\' + this.glossRoot('ë');
		}
		const bareRoot = bare(root);
		const bareEntry = dictionary.get(bareRoot);
		if (bareEntry) {
			if (bareEntry.type === 'predicate') {
				return (tone(root) === Tone.T2 ? 'the\\' : 'A\\') + bareEntry.gloss;
			} else {
				return bareEntry.gloss;
			}
		}
		const fromToadua = toaduaGlosses.get(root) ?? toaduaGlosses.get(bareRoot);
		if (fromToadua) {
			return fromToadua;
		}

		const match = bareRoot.match(compoundRegExp);
		if (match) {
			const last = match[1];
			const butLast = bareRoot.slice(0, bareRoot.length - last.length);
			return this.glossRoot(butLast) + '-' + this.glossRoot(last);
		}

		return bareRoot;
	}

	public glossWord(word: string): string {
		if (word === '◌́') {
			return 'the';
		} else if (word === '◌̂') {
			return 'ADVERB';
		}
		word = clean(word.replace(/[\p{Pe}\p{Pf}\p{Pi}\p{Po}\p{Ps}]/gu, ''));

		const { prefixes, root } = splitPrefixes(word);
		return (
			prefixes.map(p => this.glossPrefix(p)).join('') + this.glossRoot(root)
		);
	}

	public glossSentence(sentence: string): Gloss[] {
		return sentence
			.trim()
			.split(/\s+/)
			.map(w => ({ toaq: w, english: this.glossWord(w) }));
	}

	public alignGlossSentence(sentence: string): string {
		let top = '#';
		let bot = ' ';
		for (const entry of this.glossSentence(sentence)) {
			const lt = displayLength(entry.toaq);
			const lb = displayLength(entry.english);
			top += ' ' + entry.toaq + ''.padEnd(lb - lt);
			bot += ' ' + entry.english + ''.padEnd(lt - lb);
		}
		return top + '\n' + bot;
	}
}
