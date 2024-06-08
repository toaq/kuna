import { Entry } from '../morphology/dictionary';
import { Impossible } from '../core/error';
import { Tone } from '../morphology/tone';
import { Movement } from './movement';

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
	| 'BE'
	| 'CAUSE'
	| 'SUB'
	| 'PRO'
	| '∃'
	| '¬∃'
	| '∀'
	| '∀.SING'
	| '∀.CUML'
	| 'GEN'
	| 'EXO'
	| 'ENDO'
	| 'DEM'
	| 'PROX'
	| 'DIST'
	| '[only]'
	| '[also]'
	| '[even]'
	| '[and]'
	| '[or]'
	| '[xor]'
	| '[or?]'
	| '[but]';

export interface CovertWord {
	covert: true;
	value: CovertValue;
}

export type Label =
	| '*Serial'
	| '*𝘷P'
	| '*𝘷Pdet'
	| '&'
	| '&(naP)'
	| "&'"
	| '&P'
	| '&Q'
	| "&Q'"
	| '&QP'
	| '𝘢'
	| '𝘢P'
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
	| 'Cincorp'
	| 'Crel'
	| 'CP'
	| 'CPincorp'
	| 'CPrel'
	| 'D'
	| 'DP'
	| 'Discourse'
	| 'Ev'
	| 'EvA'
	| "EvA'"
	| 'EvAP'
	| 'EvP'
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
	| 'Modal'
	| 'ModalP'
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
}

export interface Leaf extends TreeBase {
	movement?: Movement;
	word: Word | CovertWord;
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
	throw new Impossible('Unexpected non-leaf ' + tree.label);
}

export function assertBranch(tree: Tree): asserts tree is Branch<Tree> {
	if ('left' in tree) return;
	throw new Impossible('Unexpected non-branch ' + tree.label);
}

export function assertRose(tree: Tree): asserts tree is Rose<Tree> {
	if ('children' in tree) return;
	throw new Impossible('Unexpected non-rose ' + tree.label);
}

export function assertLabel(tree: Tree, label: Label): void {
	if (tree.label !== label) {
		throw new Impossible(`Expected ${label} but found ${tree.label}`);
	}
}
