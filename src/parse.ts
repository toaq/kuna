import { Token, TokenPosition, rule } from 'typescript-parsec';
import { alt, apply, opt, rep_sc, seq, tok } from 'typescript-parsec';
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

interface Leaf {
	label: string;
	word: Word | 'covert' | 'functional';
}

interface Branch {
	label: string;
	left: Tree;
	right: Tree;
}

interface Rose {
	label: string;
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

const makeLeaf = (label: string) => (token: Token<POS>) => ({
	label,
	word: makeWord(token),
});

const makeBranch =
	(label: string) =>
	([left, right]: [Tree, Tree]) => ({
		label,
		left,
		right,
	});

const makeRose = (label: string) => (children: Tree[]) => ({
	label,
	children,
});

const makeRose2 =
	(label: string) =>
	([left, rights]: [Tree, Tree[]]) => ({
		label,
		children: [left, ...rights],
	});

const makeOptLeaf = (label: string) => (leaf: Leaf | undefined) =>
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
const SA = rule<POS, Leaf>();
const SAopt = rule<POS, Leaf>();
const PRONOUN = rule<POS, Leaf>();
const DP = rule<POS, Tree>();
const CP = rule<POS, Tree>();
const Serial = rule<POS, Tree>();
const vP = rule<POS, Tree>();
const AspP = rule<POS, Tree>();
const TP = rule<POS, Tree>();

D.setPattern(apply(tok('determiner'), makeLeaf('D')));

V.setPattern(apply(tok('predicate'), makeLeaf('V')));

T.setPattern(apply(tok('tense'), makeLeaf('T')));
Topt.setPattern(apply(opt(T), makeOptLeaf('T')));

Asp.setPattern(apply(tok('aspect'), makeLeaf('Asp')));
Aspopt.setPattern(apply(opt(Asp), makeOptLeaf('Asp')));

Σ.setPattern(apply(tok('polarity'), makeLeaf('Σ')));

C.setPattern(apply(tok('complementizer'), makeLeaf('C')));
Copt.setPattern(apply(opt(C), makeOptLeaf('C')));

SA.setPattern(apply(tok('illocution'), makeLeaf('SA')));

SAopt.setPattern(apply(opt(SA), makeOptLeaf('SA')));

PRONOUN.setPattern(apply(tok('pronoun'), makeLeaf('DP')));

DP.setPattern(
	alt(
		PRONOUN,
		apply(seq(D, CP), ([d, cp]) => ({
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

Serial.setPattern(apply(rep_sc(V), makeRose('Serial*')));

vP.setPattern(apply(seq(Serial, rep_sc(DP)), makeRose2('𝑣P*')));

AspP.setPattern(apply(seq(Aspopt, vP), makeBranch('AspP')));

TP.setPattern(apply(seq(Topt, AspP), makeBranch('TP')));

CP.setPattern(apply(seq(Copt, TP), makeBranch('CP')));

export const SAP = rule<POS, Tree>();
SAP.setPattern(apply(seq(CP, SAopt), makeBranch('SAP')));
