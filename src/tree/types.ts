import { Impossible } from '../core/error';
import type { Entry } from '../morphology/dictionary';
import type { Tone } from '../morphology/tone';

export interface Word {
	covert: false;
	index: number | undefined;
	text: string;
	bare: string;
	tone: Tone;
	entry: Entry | undefined;
}

export type CovertValue =
	| '∅'
	| 'PRO'
	| 'REL'
	| 'SUBJ'
	| 'IF'
	| 'IF.CNTF'
	| 'WHEN';

export interface CovertWord {
	covert: true;
	value: CovertValue;
}

export type Label =
	| '*Serial'
	| '*Serialdet'
	| '*𝘷P'
	| '*𝘷Pdet'
	| '&'
	| '&(naP)'
	| "&'"
	| '&P'
	| '&Q'
	| "&Q'"
	| '&QP'
	| 'Adjunct'
	| 'AdjunctP'
	| 'Asp'
	| 'AspP'
	| 'be'
	| 'beP'
	| 'bo'
	| 'boP'
	| 'bu'
	| 'buP'
	| 'buq'
	| 'buqP'
	| 'C'
	| 'CP'
	| 'Cond'
	| "Cond'"
	| 'CondP'
	| 'D'
	| 'DP'
	| 'Discourse'
	| 'EvA'
	| 'EvAP'
	| 'FocAdv'
	| 'FocAdvP'
	| 'Focus'
	| 'FocusP'
	| 'ge'
	| 'geP'
	| 'ha'
	| 'haP'
	| 'haoP'
	| 'kı'
	| 'mı'
	| 'mıP'
	| 'mo'
	| 'moP'
	| 'mu'
	| 'muP'
	| 'nha'
	| 'nhaP'
	| '𝘯'
	| '𝘯P'
	| 'Q'
	| 'QP'
	| 'SA'
	| 'SAP'
	| 'shu'
	| 'shuP'
	| 'su'
	| 'suP'
	| 'T'
	| 'TP'
	| 'te'
	| 'teP'
	| 'Telicity'
	| 'TelicityP'
	| 'teo'
	| 'teoP'
	| 'text'
	| 'Topic'
	| "Topic'"
	| 'TopicP'
	| '𝘷'
	| "𝘷'"
	| 'V'
	| "V'"
	| 'Vocative'
	| 'VocativeP'
	| '𝘷P'
	| 'VP'
	| 'word'
	| 'Σ'
	| 'ΣP';

export function describeLabel(label: Label): string {
	switch (label) {
		case '*Serial':
		case '*Serialdet':
			return 'Unfixed serial';
		case '*𝘷P':
		case '*𝘷Pdet':
			return 'Unfixed verb phrase';
		case '&':
		case '&(naP)':
			return 'Conjunction';
		case 'Asp':
			return 'Aspect';
		case 'C':
			return 'Complementizer';
		case 'CP':
			return 'Complementizer phrase';
		case 'Cond':
			return 'Conditional';
		case 'D':
			return 'Determiner';
		case 'DP':
			return 'Determiner phrase';
		case 'EvA':
			return 'Event accessor';
		case 'FocAdv':
			return 'Focus adverb';
		case '𝘯':
			return 'Noun feature';
		case 'Q':
			return 'Quantifier';
		case 'SA':
			return 'Speech act';
		case 'T':
			return 'Tense';
		case '𝘷':
			return 'Light verb';
		case 'V':
			return 'Verb';
		case 'Σ':
			return 'Polarity';
		default:
			if (label.endsWith('P'))
				return `${describeLabel(label.slice(0, -1) as Label)} phrase`;
			if (label.endsWith("'"))
				return `${describeLabel(label.slice(0, -1) as Label)} bar-level`;
			return label;
	}
}

export type MovementID = number;

export interface Movement {
	/**
	 * A number identifying this leaf for the movement renderer.
	 */
	id: MovementID;
	/**
	 * The id of the leaf this leaf has moved to.
	 */
	movedTo?: MovementID;
	/**
	 * New phonological content of this leaf due to movement.
	 */
	text?: string;
}

interface TreeBase {
	/**
	 * The syntactic label of this node.
	 */
	label: Label;
	/**
	 * An index correlating a binding site with the structure it binds.
	 */
	binding?: number;
	/**
	 * A letter correlating an overt verbal argument with the PROs in a serial
	 * verb.
	 */
	coindex?: string;
	/**
	 * The source text for this subtree. This is always "surface Toaq" even if the tree represents a deep structure.
	 */
	source: string;
}

export interface Leaf extends TreeBase {
	movement?: Movement;
	word: Word | CovertWord;
	roof?: boolean;
}

export interface Branch<T> extends TreeBase {
	left: T;
	right: T;
}

export interface Rose<T> extends TreeBase {
	children: T[];
}

export type Tree = Leaf | Branch<Tree> | Rose<Tree>;

export type StrictTree = Leaf | Branch<StrictTree>;

export function assertLeaf(tree: Tree): asserts tree is Leaf {
	if ('word' in tree) return;
	throw new Impossible(`Unexpected non-leaf ${tree.label}`);
}

export function assertBranch(tree: Tree): asserts tree is Branch<Tree> {
	if ('left' in tree) return;
	throw new Impossible(`Unexpected non-branch ${tree.label}`);
}

export function assertRose(tree: Tree): asserts tree is Rose<Tree> {
	if ('children' in tree) return;
	throw new Impossible(`Unexpected non-rose ${tree.label}`);
}

export function assertLabel(tree: Tree, label: Label): void {
	if (tree.label !== label) {
		throw new Impossible(`Expected ${label} but found ${tree.label}`);
	}
}
