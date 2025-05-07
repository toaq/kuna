import { dictionary } from '../morphology/dictionary';
import { toadua } from '../morphology/toadua';
import { type ToaqToken, bare } from '../morphology/tokenize';
import { tone } from '../morphology/tone';
import { describeSerial } from '../syntax/frame';
import {
	catSource,
	endsInClauseBoundary,
	endsInDP,
	labelForPrefix,
	skipFree,
} from './functions';
import type { Label, Leaf, Tree, Word } from './types';

/**
 * Make a null leaf with the given label.
 */
export function makeNull(label: Label): Leaf {
	return { label, word: { covert: true, value: '∅' }, source: '' };
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
		source: token.value,
	});
}

export function makeCovertLeaf(label: Label) {
	return () => makeNull(label);
}

export function makeEmptySerial() {
	return () => ({
		label: '*Serial',
		children: [makeNull('V')],
		source: '',
	});
}

export function makeBranch(label: Label) {
	return ([left, right]: [Tree, Tree]) => {
		return {
			label,
			left,
			right,
			source: catSource(left, right),
		};
	};
}

export function makeBranchCovertLeft(label: Label, covertLabel: Label) {
	return ([right]: [Tree, Tree]) => {
		return {
			label,
			left: makeNull(covertLabel),
			right,
			source: right.source,
		};
	};
}

export function make3L(label: Label, labelR: Label) {
	return ([left, rl, rr]: [Tree, Tree, Tree]) => {
		return {
			label,
			left,
			right: { label: labelR, left: rl, right: rr, source: catSource(rl, rr) },
			source: catSource(left, rl, rr),
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
			source: catSource(rl, rr),
		};
	};
}

export function makeRose(label: Label) {
	return ([children]: [Tree[]]) => {
		return {
			label,
			children,
			source: catSource(...children),
		};
	};
}

export function makeRose2(label: Label) {
	return ([left, rights]: [Tree, Tree[]]) => {
		return {
			label,
			children: [left, ...rights],
			source: catSource(left, ...rights),
		};
	};
}

export function makeSingleChild(label: Label) {
	return ([left]: [Tree]) => {
		return {
			label,
			children: [left],
			source: left.source,
		};
	};
}

export function makeOptLeaf(label: Label) {
	return ([leaf]: [Leaf | undefined]) => {
		return leaf ?? makeNull(label);
	};
}

export function makeSerial([verbs, vlast]: [Tree[], Tree]) {
	const children = verbs.concat([vlast]);
	return {
		label: '*Serial',
		arity: describeSerial(children)?.slots?.length,
		subject:
			'word' in children[0] &&
			!children[0].word.covert &&
			children[0].word.entry?.type === 'predicate'
				? children[0].word.entry.subject
				: 'free',
		children,
		source: catSource(...verbs, vlast),
	};
}

export function makevP(
	[serial, adjpsL, rest]: [Tree, Tree[], [Tree[], Tree[]] | null],
	_location: number,
	reject: unknown,
	depth: 'main' | 'sub',
) {
	let [args, adjpsR] = rest ?? [[], []];
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
	if (adjpsL.length && endsInClauseBoundary(serial)) {
		return reject;
	}

	return {
		label: '*𝘷P',
		children: [serial, ...adjpsL, ...args, ...adjpsR],
		source: catSource(serial, ...adjpsL, ...args, ...adjpsR),
	};
}

export function makevP_main(
	args: [Tree, Tree[], [Tree[], Tree[]] | null],
	location: number,
	reject: unknown,
) {
	return makevP(args, location, reject, 'main');
}

export function makevP_sub(
	args: [Tree, Tree[], [Tree[], Tree[]] | null],
	location: number,
	reject: unknown,
) {
	return makevP(args, location, reject, 'sub');
}

export function makevPdet(
	[serial]: [Tree],
	_location: number,
	reject: unknown,
) {
	const arity = (serial as any).arity;
	if (arity === 0) return reject;

	return {
		label: '*𝘷P',
		children: [
			serial,
			{ label: 'DP', word: { covert: true, value: 'PRO' }, source: '' },
		],
		source: serial.source,
	};
}

export function makeEvAP([rl, rr, left]: [Tree, Tree, Tree]) {
	return {
		label: 'EvAP',
		left,
		right: { label: "EvA'", left: rl, right: rr },
		source: catSource(left, rl, rr),
	};
}

export function makeEvAPdet([rl, rr]: [Tree, Tree]) {
	return {
		label: 'EvAP',
		left: { label: 'DP', word: { covert: true, value: 'PRO' }, source: '' },
		right: { label: "EvA'", left: rl, right: rr },
		source: catSource(rl, rr),
	};
}

function condClass(q: string): 'IF' | 'IF.CNTF' | 'WHEN' {
	if (q === 'she' || q === 'daı') return 'IF';
	if (q === 'ao' || q === 'ea') return 'IF.CNTF';
	return 'WHEN';
}

function qpComplement(
	q: Leaf & { word: Word },
	condition: [Leaf & { word: Word }, Tree, Leaf] | null,
	consequent: Tree,
): Tree {
	const condValue = condClass(q.word.bare);
	if (condition === null) {
		return condValue === 'WHEN'
			? consequent
			: {
					label: 'CondP',
					left: {
						label: "Cond'",
						left: {
							label: 'Cond',
							word: { covert: true, value: condValue },
							source: '',
						},
						right: makeNull('CP'),
						source: '',
					},
					right: consequent,
					source: consequent.source,
				};
	}
	const [c, antecedent, na] = condition;
	const bareC = {
		...c,
		word: makeWord([
			{ type: 'complementizer', value: c.word.bare, index: c.word.index },
		]),
		source: c.word.bare,
	};
	const cpSource = catSource(bareC, antecedent);
	const cond1Source = catSource(c, antecedent);
	const cond2Source = catSource(cond1Source, na);
	return {
		label: 'CondP',
		left: {
			label: "Cond'",
			left: {
				label: "Cond'",
				left: {
					label: 'Cond',
					word: { covert: true, value: condValue },
					source: '',
				},
				right: {
					label: 'CP',
					left: bareC,
					right: antecedent,
					source: cpSource,
				},
				source: cond1Source,
			},
			right: na,
			source: cond2Source,
		},
		right: consequent,
		source: catSource(cond2Source, consequent),
	};
}

function qp(
	q: Leaf & { word: Word },
	condition: [Leaf & { word: Word }, Tree, Leaf] | null,
	consequent: Tree,
): Tree {
	const complement = qpComplement(q, condition, consequent);
	return {
		label: 'QP',
		left: q,
		right: complement,
		source: catSource(q, complement.source),
	};
}

export function makeQP([q, c, antecedent, na, consequent]: [
	Leaf & { word: Word },
	Leaf & { word: Word },
	Tree,
	Leaf,
	Tree,
]): Tree {
	return qp(q, [c, antecedent, na], consequent);
}

export function makeConn(
	[left, c, right]: [Tree, Tree, Tree],
	_location: number,
	reject: unknown,
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
		right: { label: "&'", left: c, right, source: catSource(c, right) },
		source: catSource(left, c, right),
	};
}

export function makeAdjunctPI(
	[adjunct, serial]: [Tree, Tree],
	_location: number,
	reject: unknown,
) {
	const { arity } = serial as any;
	if (arity !== undefined && arity !== 1) {
		return reject;
	}

	return {
		label: 'AdjunctP',
		left: adjunct,
		right: {
			label: '*𝘷P',
			children: [
				serial,
				{
					label: 'DP',
					word: {
						covert: true,
						value:
							subject === 'agent' || subject === 'individual'
								? 'PRO'
								: 'PRO.EV',
					},
					source: '',
				},
			],
			source: catSource(serial),
		},
		source: catSource(adjunct, serial),
	};
}

export function makeAdjunctPT(
	[adjunct, serial, obj]: [Tree, Tree, Tree],
	_location: number,
	reject: unknown,
) {
	const { arity, subject } = serial as any;
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
				{
					label: 'DP',
					word: {
						covert: true,
						value:
							subject === 'agent' || subject === 'individual'
								? 'PRO'
								: 'PRO.EV',
					},
					source: '',
				},
				obj,
			],
			source: catSource(serial, obj),
		},
		source: catSource(adjunct, serial, obj),
	};
}

export function makeT1QP([modal, tp]: [Leaf & { word: Word }, Tree]) {
	return qp(modal, null, {
		label: 'CP',
		left: makeNull('C'),
		right: tp,
		source: tp.source,
	});
}

export function makeSigmaT1QP([sigma, modal, tp]: [
	Tree,
	Leaf & { word: Word },
	Tree,
]) {
	return {
		label: 'ΣP',
		left: sigma,
		right: makeT1QP([modal, tp]),
		source: catSource(sigma, modal, tp),
	};
}

export function makePrefixLeaf([token]: [ToaqToken]) {
	const label = labelForPrefix(token.value);
	return {
		label,
		word: makeWord([token]),
		source: token.value,
	};
}

export function makePrefixP([prefix, verb]: [Tree, Tree]) {
	return {
		label: `${prefix.label}P`,
		left: prefix,
		right: verb,
		source: catSource(prefix, verb),
	};
}

export function makeRetroactiveCleft([tp, vgo, clause]: [Tree, Tree, Tree]) {
	return {
		label: '𝘷P',
		left: {
			label: 'CP',
			left: makeNull('C'),
			right: tp,
			source: tp.source,
		},
		right: {
			label: "𝘷'",
			left: vgo,
			right: {
				label: 'CPrel',
				left: makeNull('C'),
				right: clause,
				source: clause.source,
			},
			source: catSource(vgo, clause),
		},
		source: catSource(tp, vgo, clause),
	};
}

export function makeDiscourse(
	[left, right]: [Tree, Tree],
	_location: number,
	reject: unknown,
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

	return { label: 'Discourse', left, right, source: catSource(left, right) };
}
