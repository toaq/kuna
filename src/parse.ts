import { Token, TokenPosition, rule } from 'typescript-parsec';
import { alt, apply, opt, rep, seq, tok } from 'typescript-parsec';
import { dictionary, Entry, WordType } from './dictionary';
import { bare, tone } from './tokenize';
import { Tone } from './types';

type POS = WordType;

interface Word {
	pos: TokenPosition;
	text: string;
	bare: string;
	tone: Tone;
	entry: Entry | undefined;
}

type Label =
	| '*Serial'
	| '*𝑣P'
	| '&'
	| "&'"
	| '&P'
	| 'Adjunct'
	| 'AdjunctP'
	| 'Asp'
	| 'AspP'
	| 'C'
	| 'CP'
	| 'CPrel'
	| 'D'
	| 'DP'
	| 'n'
	| 'nP'
	| 'SA'
	| 'SAP'
	| 'T'
	| 'TP'
	| 'Topic'
	| "Topic'"
	| 'TopicP'
	| '𝑣'
	| 'V'
	| '𝑣P'
	| 'VP'
	| 'Σ'
	| 'ΣP';

interface Leaf {
	label: Label;
	word: Word | 'covert' | 'functional';
}

interface Branch {
	label: Label;
	left: Tree;
	right: Tree;
}

interface Rose {
	label: Label;
	children: Tree[];
}

export type Tree = Leaf | Branch | Rose;

function makeWord(token: Token<POS>): Word {
	const lemmaForm = token.text.toLowerCase().normalize();
	const bareWord = bare(token.text);
	return {
		pos: token.pos,
		text: token.text,
		bare: bareWord,
		tone: tone(token.text),
		entry: dictionary.get(lemmaForm) ??
			dictionary.get(bareWord) ?? {
				toaq: lemmaForm,
				type: 'predicate',
				gloss: lemmaForm,
				gloss_abbreviation: lemmaForm,
				pronominal_class: 'ta',
				distribution: 'd',
				frame: 'c',
				english: '',
			},
	};
}

const makeLeaf = (label: Label) => (token: Token<POS>) => ({
	label,
	word: makeWord(token),
});

const makeBranch =
	(label: Label) =>
	([left, right]: [Tree, Tree]) => ({
		label,
		left,
		right,
	});

const makeRose = (label: Label) => (children: Tree[]) => ({
	label,
	children,
});

const makeRose2 =
	(label: Label) =>
	([left, rights]: [Tree, Tree[]]) => ({
		label,
		children: [left, ...rights],
	});

const makeOptLeaf = (label: Label) => (leaf: Leaf | undefined) =>
	leaf ?? { label, word: 'covert' };

const D = rule<POS, Leaf>();
const V = rule<POS, Leaf>();
const T = rule<POS, Leaf>();
const Topt = rule<POS, Leaf>();
const Asp = rule<POS, Leaf>();
const Aspopt = rule<POS, Leaf>();
const Σ = rule<POS, Leaf>();
const C = rule<POS, Leaf>();
const Copt = rule<POS, Leaf>();
const Csub = rule<POS, Leaf>();
const Cinc = rule<POS, Leaf>();
const Crel = rule<POS, Leaf>();
const Crelopt = rule<POS, Leaf>();
const SA = rule<POS, Leaf>();
const SAopt = rule<POS, Leaf>();
export const SAP = rule<POS, Tree>();
const DPpronoun = rule<POS, Leaf>();
const DP = rule<POS, Tree>();
const CP = rule<POS, Tree>();
const CPsub = rule<POS, Tree>();
const CPinc = rule<POS, Tree>();
const CPdet = rule<POS, Tree>();
const CPrel = rule<POS, Tree>();
const Serial = rule<POS, Tree>();
const VP = rule<POS, Tree>();
const vP = rule<POS, Tree>();
const AspP = rule<POS, Tree>();
const TP = rule<POS, Tree>();
const Adjunct = rule<POS, Tree>();
const AdjunctP = rule<POS, Tree>();
const Conjunction = rule<POS, Tree>();
const ConjunctionT1 = rule<POS, Tree>();
const ConjunctionT4 = rule<POS, Tree>();

D.setPattern(apply(tok('determiner'), makeLeaf('D')));

V.setPattern(apply(tok('predicate'), makeLeaf('V')));

T.setPattern(apply(tok('tense'), makeLeaf('T')));
Topt.setPattern(apply(opt(T), makeOptLeaf('T')));

Asp.setPattern(apply(tok('aspect'), makeLeaf('Asp')));
Aspopt.setPattern(apply(opt(Asp), makeOptLeaf('Asp')));

Σ.setPattern(apply(tok('polarity'), makeLeaf('Σ')));

C.setPattern(apply(tok('complementizer'), makeLeaf('C')));
Copt.setPattern(apply(opt(C), makeOptLeaf('C')));

Csub.setPattern(apply(tok('subordinating complementizer'), makeLeaf('C')));
Cinc.setPattern(apply(tok('incorporated complementizer'), makeLeaf('C')));
Crel.setPattern(apply(tok('relative clause complementizer'), makeLeaf('C')));
Crelopt.setPattern(apply(opt(Crel), makeOptLeaf('C')));

Adjunct.setPattern(apply(tok('preposition'), makeLeaf('Adjunct')));
Conjunction.setPattern(apply(tok('conjunction'), makeLeaf('&')));
ConjunctionT1.setPattern(apply(tok('conjunction in t1'), makeLeaf('&')));
ConjunctionT4.setPattern(apply(tok('conjunction in t4'), makeLeaf('&')));

SA.setPattern(apply(tok('illocution'), makeLeaf('SA')));
SAopt.setPattern(apply(opt(SA), makeOptLeaf('SA')));

DPpronoun.setPattern(apply(tok('pronoun'), makeLeaf('DP')));

DP.setPattern(
	alt(
		DPpronoun,
		apply(seq(D, CPdet), ([d, cp]) => ({
			label: 'DP',
			left: d,
			right: {
				label: 'nP',
				left: { label: 'n', word: 'functional' },
				right: cp,
			},
		})),
	),
);

Serial.setPattern(apply(rep(V), makeRose('*Serial')));

/// TODO transitive/intransitive
VP.setPattern(apply(seq(V, alt(DP, CPsub)), makeBranch('VP')));
AdjunctP.setPattern(apply(seq(Adjunct, VP), makeBranch('AdjunctP')));

vP.setPattern(
	alt(
		apply(seq(Σ, vP), makeBranch('ΣP')),
		apply(seq(Serial, rep(alt(DP, CPsub))), makeRose2('*𝑣P')),
	),
);
AspP.setPattern(
	alt(
		apply(seq(Σ, AspP), makeBranch('ΣP')),
		apply(seq(Aspopt, vP), makeBranch('AspP')),
	),
);
TP.setPattern(
	alt(
		apply(seq(Σ, TP), makeBranch('ΣP')),
		apply(seq(Topt, AspP), makeBranch('TP')),
	),
);

CP.setPattern(apply(seq(Copt, TP), makeBranch('CP')));
CPsub.setPattern(apply(seq(Csub, TP), makeBranch('CP')));
CPinc.setPattern(apply(seq(Cinc, TP), makeBranch('CP')));
CPrel.setPattern(apply(seq(Crel, TP), makeBranch('CPrel')));
CPdet.setPattern(apply(seq(Crelopt, TP), makeBranch('CPrel')));

SAP.setPattern(apply(seq(CP, SAopt), makeBranch('SAP')));
