import { dictionary, Entry } from './dictionary';
import { Impossible } from './error';
import { getFrame } from './serial';
import { bare, clean, ToaqToken, tone } from './tokenize';
import { Tone } from './types';

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
	| '[even]';

export interface CovertWord {
	covert: true;
	value: CovertValue;
}

/**
 * Make a null leaf with the given label.
 */
export function makeNull(label: Label): Leaf {
	return { label, word: { covert: true, value: '∅' } };
}

export type Label =
	| '*Serial'
	| '*𝘷P'
	| '*𝘷Pdet'
	| '&'
	| '&(naP)'
	| "&'"
	| '&P'
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
	| 'Crel'
	| 'CP'
	| 'CPrel'
	| 'D'
	| 'DP'
	| 'Discourse'
	| 'EvA'
	| "EvA'"
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
	| 'Interjection'
	| 'InterjectionP'
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
	| '𝘷P'
	| 'VP'
	| 'word'
	| 'Σ'
	| 'ΣP';

export function nodeType(label: Label): 'phrase' | 'bar' | 'head' {
	if (label.endsWith('P') || label === 'CPrel' || label === '*𝘷Pdet') {
		return 'phrase';
	} else if (label.endsWith("'")) {
		return 'bar';
	} else {
		return 'head';
	}
}

export function containsWords(
	tree: Tree,
	words: string[],
	stopLabels: Label[],
): boolean {
	if ('word' in tree) {
		return !tree.word.covert && words.includes(clean(tree.word.text));
	} else if ('left' in tree) {
		return (
			(!stopLabels.includes(tree.left.label) &&
				containsWords(tree.left, words, stopLabels)) ||
			(!stopLabels.includes(tree.right.label) &&
				containsWords(tree.right, words, stopLabels))
		);
	} else {
		return tree.children.some(
			child =>
				!stopLabels.includes(child.label) &&
				containsWords(child, words, stopLabels),
		);
	}
}

export function isQuestion(tree: Tree): boolean {
	return containsWords(
		tree,
		['hí', 'rí', 'rı', 'rî', 'ma', 'tıo', 'hıa'],
		['CP'],
	);
}

interface TreeBase {
	label: Label;
	coindex?: string;
}

export interface Leaf extends TreeBase {
	id?: string;
	movedTo?: string;
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

export function makeWord([token]: [ToaqToken]): Word {
	const lemmaForm = token.value.toLowerCase().normalize();
	const bareWord = bare(token.value);
	return {
		covert: false,
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
				frame: '',
				english: '',
				subject: 'free',
			},
	};
}

export function makeLeaf(label: Label) {
	return ([token]: [ToaqToken]) => ({
		label,
		word: makeWord([token]),
	});
}

export function makeEmptySerial() {
	return () => ({
		label: '*Serial',
		children: [makeNull('V')],
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

export function makeBranchCovertLeft(label: Label, covertLabel: Label) {
	return ([right]: [Tree, Tree]) => {
		return {
			label,
			left: makeNull(covertLabel),
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
		return {
			label,
			children: [left, ...rights],
		};
	};
}

export function makeSingleChild(label: Label) {
	return ([left]: [Tree]) => {
		return {
			label,
			children: [left],
		};
	};
}

export function makeOptLeaf(label: Label) {
	return ([leaf]: [Leaf | undefined]) => {
		return leaf ?? makeNull(label);
	};
}

export function makeSerial(
	[verbs, vlast]: [Tree[], Tree],
	location: number,
	reject: Object,
) {
	const children = verbs.concat([vlast]);
	const frames = children.map(getFrame);
	let arity: number | undefined = undefined;
	if (!(frames.includes('') || frames.includes('variable'))) {
		arity = frames[frames.length - 1].split(' ').length;
		for (let i = frames.length - 2; i >= 0; i--) {
			const frame = frames[i].split(' ');
			const last = frame.at(-1)![0];
			if (last === 'c') {
				// So everything to the right is an adjective?
				arity = frame.length;
			} else {
				arity += frame.length - 1 - Number(last);
			}
		}
	}
	return {
		label: '*Serial',
		arity,
		children,
	};
}

export function makevP(
	[serial, adjpsL, rest]: [Tree, Tree[], [Tree[], Tree[]] | null],
	location: number,
	reject: Object,
) {
	rest ??= [[], []];
	const [args, adjpsR] = rest;

	const arity = (serial as any).arity;
	if (arity !== undefined && args.length > arity) {
		return reject;
	}
	return {
		label: '*𝘷P',
		children: [serial, ...adjpsL, ...args, ...adjpsR],
	};
}

export function makevPdet([serial]: [Tree], location: number, reject: Object) {
	const arity = (serial as any).arity;
	if (arity === 0) {
		return reject;
	}
	return {
		label: '*𝘷P',
		children: [serial, { label: 'DP', word: { covert: true, value: 'PRO' } }],
	};
}

export function makeEvAP([rl, rr, left]: [Tree, Tree, Tree]) {
	return {
		label: 'EvAP',
		left,
		right: { label: "EvA'", left: rl, right: rr },
	};
}

export function makeEvAPdet([rl, rr]: [Tree, Tree]) {
	return {
		label: 'EvAP',
		left: { label: 'DP', word: { covert: true, value: 'PRO' } },
		right: { label: "EvA'", left: rl, right: rr },
	};
}

export function makeConn([left, c, right]: [Tree, Tree, Tree]) {
	return {
		label: '&P',
		left,
		right: { label: "&'", left: c, right },
	};
}

export function makeAdjunctPI(
	[adjunct, serial]: [Tree, Tree],
	location: number,
	reject: Object,
) {
	const arity = (serial as any).arity;
	if (arity !== undefined && arity !== 1) {
		return reject;
	}

	return {
		label: 'AdjunctP',
		left: adjunct,
		right: {
			label: '*𝘷P',
			children: [serial, { label: 'DP', word: { covert: true, value: 'PRO' } }],
		},
	};
}

export function makeAdjunctPT(
	[adjunct, serial, obj]: [Tree, Tree, Tree],
	location: number,
	reject: Object,
) {
	const arity = (serial as any).arity;
	if (arity !== undefined && arity !== 2) {
		return reject;
	}

	return {
		label: 'AdjunctP',
		left: adjunct,
		right: {
			label: '*𝘷P',
			children: [
				serial,
				{ label: 'DP', word: { covert: true, value: 'PRO' } },
				obj,
			],
		},
	};
}

export function makeT1ModalvP([modal, tp]: [Tree, Tree]) {
	return {
		label: '𝘷P',
		left: {
			label: 'ModalP',
			left: modal,
			right: makeNull('CP'),
		},
		right: {
			label: "𝘷'",
			left: {
				label: '𝘷',
				word: { covert: true, value: 'BE' },
			},
			right: tp,
		},
	};
}

export function makeSigmaT1ModalvP([sigma, modal, tp]: [Tree, Tree, Tree]) {
	return {
		label: 'ΣP',
		left: sigma,
		right: makeT1ModalvP([modal, tp]),
	};
}

function prefixLabel(word: string): Label {
	const p = bare(word).replace(/-$/, '');
	switch (p) {
		case 'fa':
		case 'ruı':
			return 'Telicity';
		default:
			return p as Label;
	}
}

export function makePrefixLeaf([token]: [ToaqToken]) {
	const label = prefixLabel(token.value);
	return {
		label,
		word: makeWord([token]),
	};
}

export function makePrefixP([prefix, verb]: [Tree, Tree]) {
	return {
		label: prefix.label + 'P',
		left: prefix,
		right: verb,
	};
}

export function makeRetroactiveCleft([tp, vgo, clause]: [Tree, Tree, Tree]) {
	return {
		label: '𝘷P',
		left: {
			label: 'CP',
			left: makeNull('C'),
			right: tp,
		},
		right: {
			label: "𝘷'",
			left: vgo,
			right: {
				label: 'CPrel',
				left: makeNull('C'),
				right: clause,
			},
		},
	};
}

export function skipFree(tree: Tree): Tree {
	if (tree.label === 'InterjectionP' && 'left' in tree) {
		return tree.left.label === 'Interjection' ? tree.right : tree.left;
	}
	return tree;
}

export function makeDiscourse(
	[left, right]: [Tree, Tree],
	location: number,
	reject: Object,
) {
	const l = skipFree(left);
	if (!('left' in right)) return reject;
	let r = right.label === 'Discourse' ? right.left : right;
	r = skipFree(r);

	if (l.label !== 'SAP') return reject;
	if (!('right' in l)) return reject;
	const leftSA = l.right;
	if (leftSA.label !== 'SA') return reject;
	if (!('word' in leftSA)) return reject;

	if (r.label !== 'SAP') return reject;
	if (!('left' in r)) return reject;
	if (r.left.label !== 'CP') return reject;
	if (!('left' in r.left)) return reject;
	const rightC = r.left.left;
	if (rightC.label !== 'C') return reject;
	if (!('word' in rightC)) return reject;

	// The left sentence must have an overt SA,
	// or the right sentence must have an overt C.
	// If both are covert, the sentence fence is invalid.
	if (leftSA.word.covert && rightC.word.covert) return reject;

	return { label: 'Discourse', left, right };
}
