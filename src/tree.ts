import { dictionary, Entry } from './dictionary';
import { bare, ToaqToken, tone } from './tokenize';
import { Tone } from './types';

export interface Word {
	index: number | undefined;
	text: string;
	bare: string;
	tone: Tone;
	entry: Entry | undefined;
}

export type Label =
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
	| "𝑣'"
	| 'V'
    | "V'"
	| '𝑣P'
	| 'VP'
	| 'Σ'
	| 'ΣP';

export interface Leaf {
	label: Label;
	word: Word | 'covert' | 'functional';
}

export interface Branch {
	label: Label;
	left: Tree;
	right: Tree;
}

export interface Rose {
	label: Label;
	children: Tree[];
}

export type Tree = Leaf | Branch | Rose;

export function makeWord([token]: [ToaqToken]): Word {
	const lemmaForm = token.value.toLowerCase().normalize();
	const bareWord = bare(token.value);
	return {
		index: token.index,
		text: token.value,
		bare: bareWord,
		tone: tone(token.value),
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

export function makeLeaf(label: Label) {
	return ([token]: [ToaqToken]) => ({
		label,
		word: makeWord([token]),
	});
}

export function makeBranch(label: Label) {
	return ([left, right]: [Tree, Tree]) => {
		return {
			label,
			left,
			right,
		};
	};
}

export function make3L(label: Label, labelR: Label) {
	return ([left, rl, rr]: [Tree, Tree, Tree]) => {
		return {
			label,
			left,
			right: { label: labelR, left: rl, right: rr },
		};
	};
}

export function makeRose(label: Label) {
	return ([children]: [Tree[]]) => {
		return {
			label,
			children,
		};
	};
}

export function makeRose2(label: Label) {
	return ([left, rights]: [Tree, Tree[]]) => {
		console.log(left, rights);
		return {
			label,
			children: [left, ...rights],
		};
	};
}

export function makeOptLeaf(label: Label) {
	return ([leaf]: [Leaf | undefined]) => {
		return leaf ?? { label, word: 'covert' };
	};
}
