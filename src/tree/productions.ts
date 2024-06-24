import { dictionary } from '../morphology/dictionary';
import { getFrame } from '../syntax/serial';
import { toadua } from '../morphology/toadua';
import { bare, ToaqToken, tone } from '../morphology/tokenize';
import {
	endsInClauseBoundary,
	endsInDP,
	labelForPrefix,
	skipFree,
} from './functions';
import { Label, Leaf, Tree, Word } from './types';

/**
 * Make a null leaf with the given label.
 */
export function makeNull(label: Label): Leaf {
	return { label, word: { covert: true, value: '∅' } };
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
				frame: toadua()[lemmaForm]?.frame ?? '?',
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

export function makevP(
	[serial, argIncorp, adjpsL, rest]: [
		Tree,
		Tree | null,
		Tree[],
		[Tree[], Tree[]] | null,
	],
	location: number,
	reject: Object,
	depth: 'main' | 'sub',
) {
	const argsL = argIncorp === null ? [] : [argIncorp];
	let [argsR, adjpsR] = rest ?? [[], []];
	argsR = argsR.filter(x => x.label !== 'VocativeP');
	const args = [...argsL, ...argsR];

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
		argsR.length &&
		endsInClauseBoundary(argsR[argsR.length - 1])
	) {
		return reject;
	}
	if (adjpsL.length && argIncorp !== null && endsInClauseBoundary(argIncorp)) {
		return reject;
	}

	return {
		label: '*𝘷P',
		children: [serial, ...argsL, ...adjpsL, ...argsR, ...adjpsR],
	};
}

export function makevP_main(
	args: [Tree, Tree | null, Tree[], [Tree[], Tree[]] | null],
	location: number,
	reject: Object,
) {
	return makevP(args, location, reject, 'main');
}

export function makevP_sub(
	args: [Tree, Tree | null, Tree[], [Tree[], Tree[]] | null],
	location: number,
	reject: Object,
) {
	return makevP(args, location, reject, 'sub');
}

export function makevPdet(
	[serial, argIncorp]: [Tree, Tree | null],
	location: number,
	reject: Object,
) {
	const arity = (serial as any).arity;
	if (arity < (argIncorp === null ? 1 : 2)) return reject;

	return {
		label: '*𝘷P',
		children: [
			serial,
			...(argIncorp === null ? [] : [argIncorp]),
			{ label: 'DP', word: { covert: true, value: 'PRO' } },
		],
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
	// Don't parse "báq nueq po báq goso ró báq guobe" wrong:
	if (left.label === 'DP') {
		if ('right' in left && endsInDP(left.right)) return reject;
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

export function makePrefixLeaf([token]: [ToaqToken]) {
	const label = labelForPrefix(token.value);
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
