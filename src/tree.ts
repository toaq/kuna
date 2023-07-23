import { dictionary, Entry, VerbEntry } from './dictionary';
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
	| '*𝑣Pdet'
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
	| '𝑣0'
	| "𝑣'"
	| 'V'
	| "V'"
	| '𝑣P'
	| 'VP'
	| 'Σ'
	| 'ΣP';

export function nodeType(label: Label): 'phrase' | 'bar' | 'head' {
	if (label.endsWith('P') || label === 'CPrel') {
		return 'phrase';
	} else if (label.endsWith("'")) {
		return 'bar';
	} else {
		return 'head';
	}
}

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

export interface StrictBranch {
	label: Label;
	left: StrictTree;
	right: StrictTree;
}

export type StrictTree = Leaf | StrictBranch;

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
				frame: '',
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

export function makeCovertLeaf(label: Label) {
	return () => ({
		label,
		word: 'covert',
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

export function makeBranchFunctionalLeft(label: Label, functionalLabel: Label) {
	return ([right]: [Tree, Tree]) => {
		return {
			label,
			left: { label: functionalLabel, word: 'functional' },
			right,
		};
	};
}

export function makeBranchCovertLeft(label: Label, covertLabel: Label) {
	return ([right]: [Tree, Tree]) => {
		return {
			label,
			left: { label: covertLabel, word: 'covert' },
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
		return leaf ?? { label, word: 'covert' };
	};
}

function getFrame(verb: Tree): string {
	if ('word' in verb) {
		if (verb.word === 'covert') throw new Error('covert verb?');
		if (verb.word === 'functional') throw new Error('functional verb?');
		if (verb.word.entry?.type === 'predicate') {
			return verb.word.entry.frame;
		} else {
			throw new Error('weird verb');
		}
	} else if (verb.label === '&P' && 'left' in verb) {
		return getFrame(verb.left);
	} else {
		throw new Error('weird nonverb');
	}
}

export function makeSerial(
	[children]: [Tree[]],
	location: number,
	reject: Object,
) {
	const frames = children.map(getFrame);
	let arity: number | undefined = undefined;
	if (!frames.includes('')) {
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
		label: '*𝑣P',
		children: [serial, ...adjpsL, ...args, ...adjpsR],
	};
}

export function makevPdet([serial]: [Tree], location: number, reject: Object) {
	const arity = (serial as any).arity;
	if (arity === 0) {
		return reject;
	}
	return {
		label: '*𝑣P',
		children: [serial, { label: 'DP', word: 'covert' }],
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
		right: serial,
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
		right: { label: 'VP', left: serial, right: obj },
	};
}
