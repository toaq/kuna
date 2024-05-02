import { dictionary, Entry } from './dictionary';
import { Impossible } from './error';
import { guessFrameUsingToadua, toaduaFrames } from './frame';
import { getFrame } from './serial';
import { bare, clean, repairTones, ToaqToken, tone } from './tokenize';
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

export function nodeType(label: Label): 'phrase' | 'bar' | 'head' {
	if (label.endsWith('P') || label === 'CPrel' || label === '*𝘷Pdet') {
		return 'phrase';
	} else if (label.endsWith("'")) {
		return 'bar';
	} else {
		return 'head';
	}
}

export function effectiveLabel(tree: Tree): Label {
	if (tree.label === '&P') {
		assertBranch(tree);
		return effectiveLabel(tree.left);
	} else if (tree.label === 'FocusP') {
		assertBranch(tree);
		return effectiveLabel(tree.right);
	} else {
		return tree.label;
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

function circled(i: number): string {
	return i < 10 ? '⓪①②③④⑤⑥⑦⑧⑨'[i] : `(${i})`;
}

export function treeText(tree: Tree, cpIndices?: Map<Tree, number>): string {
	if ('word' in tree) {
		if (tree.word.covert) {
			return '';
		} else {
			return tree.word.text;
		}
	} else if ('left' in tree) {
		if (cpIndices) {
			const cpIndex = cpIndices.get(tree);
			if (cpIndex !== undefined) {
				return circled(cpIndex);
			}
		}

		return repairTones(
			(treeText(tree.left) + ' ' + treeText(tree.right)).trim(),
		);
	} else {
		return repairTones(
			tree.children
				.map(x => treeText(x))
				.join(' ')
				.trim(),
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
				frame: guessFrameUsingToadua(lemmaForm),
				english: '',
				subject: 'free',
			},
	};
}

export function makeLeaf(label: Label) {
	return ([token, _free]: [ToaqToken, Tree[]]) => ({
		label,
		word: makeWord([token]),
	});
}

export function makeCovertLeaf(label: Label) {
	return () => makeNull(label);
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

export function make3LCovertLeft(
	label: Label,
	covertLabel: Label,
	labelR: Label,
) {
	return ([rl, rr]: [Tree, Tree]) => {
		return {
			label,
			left: makeNull(covertLabel),
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
	const frame = frames[frames.length - 1];
	let arity: number | undefined;
	if (!frames.includes('?')) {
		arity = frame === '' ? 0 : frame.split(' ').length;
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

function endsInClauseBoundary(tree: Tree) {
	if (
		tree.label === 'CP' ||
		(tree.label === 'CPrel' && 'left' in tree && treeText(tree.left) !== '')
	) {
		return true;
	} else if ('right' in tree) {
		return endsInClauseBoundary(tree.right);
	} else if ('children' in tree) {
		return endsInClauseBoundary(tree.children[tree.children.length - 1]);
	} else {
		return false;
	}
}

export function makevP(
	[serial, adjpsL, rest]: [Tree, Tree[], [Tree[], Tree[]] | null],
	location: number,
	reject: Object,
	depth: 'main' | 'sub',
) {
	rest ??= [[], []];
	let [args, adjpsR] = rest;
	args = args.filter(x => x.label !== 'VocativeP');

	const arity = (serial as any).arity;
	if (arity !== undefined) {
		// Disallow overfilling clauses:
		if (args.length > arity) {
			return reject;
		}

		// Disallow underfilling subclauses:
		if (depth === 'sub' && args.length !== arity) {
			return reject;
		}
	}

	// Disallow adjuncts that could have gone in a subclause:
	if (
		adjpsR.length &&
		args.length &&
		endsInClauseBoundary(args[args.length - 1])
	) {
		return reject;
	}

	return {
		label: '*𝘷P',
		children: [serial, ...adjpsL, ...args, ...adjpsR],
	};
}

export function makevP_main(
	args: [Tree, Tree[], [Tree[], Tree[]] | null],
	location: number,
	reject: Object,
) {
	return makevP(args, location, reject, 'main');
}

export function makevP_sub(
	args: [Tree, Tree[], [Tree[], Tree[]] | null],
	location: number,
	reject: Object,
) {
	return makevP(args, location, reject, 'sub');
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

export function makeConn(
	[left, c, right]: [Tree, Tree, Tree],
	location: number,
	reject: Object,
) {
	// Don't parse "Hao ꝡä hao jí rú hao súq" as "(Hao ꝡä hao jí) rú hao súq":
	if (left.label === 'TP' && endsInClauseBoundary(left)) {
		return reject;
	}
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
		case 'beı':
		case 'juaq':
		case 'ku':
		case 'mao':
		case 'to':
			return 'Focus';
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
	// For now we already don't keep "free" constituents (interjections,
	// parentheticals) in the tree.
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
