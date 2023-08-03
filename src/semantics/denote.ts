import { Leaf, StrictTree } from '../tree';
import {
	after,
	afterNear,
	agent,
	ama,
	and,
	app,
	before,
	beforeNear,
	DTree,
	equals,
	every,
	expectedEnd,
	expectedStart,
	Expr,
	ExprType,
	ime,
	inertiaWorlds,
	ji,
	nhana,
	nhao,
	presuppose,
	realWorld,
	some,
	speechTime,
	subinterval,
	suna,
	suo,
	suq,
	temporalTrace,
	umo,
	v,
	verb,
	λ,
} from './model';
import { reduce, unifyContexts } from './operations';

function denoteConstant(toaq: string): (context: ExprType[]) => Expr {
	switch (toaq) {
		case 'jí':
			return ji;
		case 'súq':
			return suq;
		case 'nháo':
			return nhao;
		case 'súna':
			return suna;
		case 'nhána':
			return nhana;
		case 'úmo':
			return umo;
		case 'íme':
			return ime;
		case 'súo':
			return suo;
		case 'áma':
			return ama;
		default:
			throw new Error(`Unrecognized constant: ${toaq}`);
	}
}

// λ𝘗. λ𝘵. λ𝘸. ∃𝘦. (τ(𝘦) ⊆ 𝘵) ∧ 𝘗(𝘦)(𝘸)
const tam = λ(['v', ['s', 't']], [], c =>
	λ('i', c, c =>
		λ('s', c, c =>
			some('v', c, c =>
				and(
					subinterval(app(temporalTrace(c), v(0, c)), v(2, c)),
					app(app(v(3, c), v(0, c)), v(1, c)),
				),
			),
		),
	),
);

// λ𝘗. λ𝘵. λ𝘸. ∀𝘸' : ɪᴡ(𝘸')(𝘸)(𝘵). ∃𝘦. (𝘵 ⊆ τ(𝘦)) ∧ 𝘗(𝘦)(𝘸')
const chum = λ(['v', ['s', 't']], [], c =>
	λ('i', c, c =>
		λ('s', c, c =>
			every(
				's',
				c,
				c =>
					some('v', c, c =>
						and(
							subinterval(v(3, c), app(temporalTrace(c), v(0, c))),
							app(app(v(4, c), v(0, c)), v(1, c)),
						),
					),
				c => app(app(app(inertiaWorlds(c), v(0, c)), v(1, c)), v(2, c)),
			),
		),
	),
);

// λ𝘗. λ𝘵. λ𝘸. ∃𝘦. (τ(𝘦) < 𝘵) ∧ 𝘗(𝘦)(𝘸)
const lui = λ(['v', ['s', 't']], [], c =>
	λ('i', c, c =>
		λ('s', c, c =>
			some('v', c, c =>
				and(
					before(app(temporalTrace(c), v(0, c)), v(2, c)),
					app(app(v(3, c), v(0, c)), v(1, c)),
				),
			),
		),
	),
);

// λ𝘗. λ𝘵. λ𝘸. ∃𝘦. (τ(𝘦) > 𝘵) ∧ 𝘗(𝘦)(𝘸)
const za = λ(['v', ['s', 't']], [], c =>
	λ('i', c, c =>
		λ('s', c, c =>
			some('v', c, c =>
				and(
					after(app(temporalTrace(c), v(0, c)), v(2, c)),
					app(app(v(3, c), v(0, c)), v(1, c)),
				),
			),
		),
	),
);

// λ𝘗. λ𝘵. λ𝘸. ∃𝘦. (𝘵 ⊆ τ(𝘦)) ∧ ((𝘵 > ExpEnd(𝘦)) ∧ 𝘗(𝘦)(𝘸))
const hoai = λ(['v', ['s', 't']], [], c =>
	λ('i', c, c =>
		λ('s', c, c =>
			some('v', c, c =>
				and(
					subinterval(v(2, c), app(temporalTrace(c), v(0, c))),
					and(
						after(v(2, c), app(expectedEnd(c), v(0, c))),
						app(app(v(3, c), v(0, c)), v(1, c)),
					),
				),
			),
		),
	),
);

// λ𝘗. λ𝘵. λ𝘸. ∃𝘦. (𝘵 ⊆ τ(𝘦)) ∧ ((𝘵 < ExpStart(𝘦)) ∧ 𝘗(𝘦)(𝘸))
const hai = λ(['v', ['s', 't']], [], c =>
	λ('i', c, c =>
		λ('s', c, c =>
			some('v', c, c =>
				and(
					subinterval(v(2, c), app(temporalTrace(c), v(0, c))),
					and(
						before(v(2, c), app(expectedStart(c), v(0, c))),
						app(app(v(3, c), v(0, c)), v(1, c)),
					),
				),
			),
		),
	),
);

// λ𝘗. λ𝘵. λ𝘸. ∃𝘦. (τ(𝘦) <.near 𝘵) ∧ 𝘗(𝘦)(𝘸)
const hiq = λ(['v', ['s', 't']], [], c =>
	λ('i', c, c =>
		λ('s', c, c =>
			some('v', c, c =>
				and(
					beforeNear(app(temporalTrace(c), v(0, c)), v(2, c)),
					app(app(v(3, c), v(0, c)), v(1, c)),
				),
			),
		),
	),
);

// λ𝘗. λ𝘵. λ𝘸. ∃𝘦. (τ(𝘦) >.near 𝘵) ∧ 𝘗(𝘦)(𝘸)
const fi = λ(['v', ['s', 't']], [], c =>
	λ('i', c, c =>
		λ('s', c, c =>
			some('v', c, c =>
				and(
					afterNear(app(temporalTrace(c), v(0, c)), v(2, c)),
					app(app(v(3, c), v(0, c)), v(1, c)),
				),
			),
		),
	),
);

function denoteAspect(toaq: string): Expr {
	switch (toaq) {
		case 'tam':
			return tam;
		case 'chum':
			return chum;
		case 'luı':
			return lui;
		case 'za':
			return za;
		case 'hoaı':
			return hoai;
		case 'haı':
			return hai;
		case 'hıq':
			return hiq;
		case 'fı':
			return fi;
		default:
			throw new Error(`Unrecognized aspect: ${toaq}`);
	}
}

// t | (t ⊆ t0)
const nai = presuppose(
	v(0, ['i']),
	subinterval(v(0, ['i']), speechTime(['i'])),
);

// t | (t < t0)
const pu = presuppose(v(0, ['i']), before(v(0, ['i']), speechTime(['i'])));

// t | (t > t0)
const jia = presuppose(v(0, ['i']), after(v(0, ['i']), speechTime(['i'])));

// λ𝘗. λ𝘸. ∃𝘵. 𝘗(𝘵)(𝘸)
const sula = λ(['i', ['s', 't']], [], c =>
	λ('s', c, c => some('i', c, c => app(app(v(2, c), v(0, c)), v(1, c)))),
);

// λ𝘗. λ𝘸. ∃𝘵 : 𝘵 < t0. 𝘗(𝘵)(𝘸)
const mala = λ(['i', ['s', 't']], [], c =>
	λ('s', c, c =>
		some(
			'i',
			c,
			c => app(app(v(2, c), v(0, c)), v(1, c)),
			c => before(v(0, c), speechTime(c)),
		),
	),
);

// λ𝘗. λ𝘸. ∃𝘵 : 𝘵 > t0. 𝘗(𝘵)(𝘸)
const jela = λ(['i', ['s', 't']], [], c =>
	λ('s', c, c =>
		some(
			'i',
			c,
			c => app(app(v(2, c), v(0, c)), v(1, c)),
			c => after(v(0, c), speechTime(c)),
		),
	),
);

function denoteTense(toaq: string): Expr {
	switch (toaq) {
		case 'naı':
			return nai;
		case 'pu':
			return pu;
		case 'jıa':
			return jia;
		case 'sula':
			return sula;
		case 'mala':
			return mala;
		case 'jela':
			return jela;
		default:
			throw new Error(`Unrecognized tense: ${toaq}`);
	}
}

function denoteSpeechAct(toaq: string): string {
	switch (toaq) {
		case 'da':
			return 'ruaq';
		case 'ka':
			return 'karuaq';
		case 'ba':
			return 'baruaq';
		case 'ꝡo':
			return 'zaru';
		case 'nha':
			return 'nue';
		case 'móq':
			return 'teqga';
		default:
			throw new Error(`Unrecognized speech act: ${toaq}`);
	}
}

function denoteLeaf(leaf: Leaf): Expr | null {
	if (leaf.label === 'V') {
		if (typeof leaf.word === 'string') throw new Error();
		const entry = leaf.word.entry;
		if (!entry) throw new Error();
		if (entry.type !== 'predicate') throw new Error();

		const arity = entry.frame.split(' ').length;
		if (arity === 3) {
			return λ('e', [], c =>
				λ('e', c, c =>
					λ('v', c, c =>
						λ('s', c, c =>
							verb(entry.toaq, [v(3, c), v(2, c)], v(1, c), v(0, c)),
						),
					),
				),
			);
		} else {
			return λ('e', [], c =>
				λ('v', c, c =>
					λ('s', c, c => verb(entry.toaq, [v(2, c)], v(1, c), v(0, c))),
				),
			);
		}
	} else if (leaf.label === 'DP') {
		let toaq: string;
		if (leaf.word === 'functional') {
			throw new Error('Functional DP');
		} else if (leaf.word === 'covert') {
			toaq = 'hóa';
		} else if (leaf.word.entry === undefined) {
			throw new Error(`Unrecognized DP: ${leaf.word.text}`);
		} else {
			toaq = leaf.word.entry.toaq;
		}

		return toaq === 'hóa' ? v(0, ['e']) : denoteConstant(toaq)([]);
	} else if (leaf.label === '𝘷') {
		return λ('e', [], c =>
			λ('v', c, c =>
				λ('s', c, c => equals(app(app(agent(c), v(1, c)), v(0, c)), v(2, c))),
			),
		);
	} else if (leaf.label === '𝘷0') {
		return null;
	} else if (leaf.label === 'Asp') {
		let toaq: string;
		if (leaf.word === 'functional') {
			throw new Error('Functional Asp');
		} else if (leaf.word === 'covert') {
			toaq = 'tam';
		} else if (leaf.word.entry === undefined) {
			throw new Error(`Unrecognized Asp: ${leaf.word.text}`);
		} else {
			toaq = leaf.word.entry.toaq;
		}

		return denoteAspect(toaq);
	} else if (leaf.label === 'T') {
		if (leaf.word === 'functional') {
			throw new Error('Functional T');
		} else if (leaf.word === 'covert') {
			return v(0, ['i']);
		} else if (leaf.word.entry === undefined) {
			throw new Error(`Unrecognized T: ${leaf.word.text}`);
		} else {
			return denoteTense(leaf.word.entry.toaq);
		}
	} else if (leaf.label === 'C' || leaf.label === 'Crel') {
		return null;
	} else if (leaf.label === 'SA') {
		let toaq: string;
		if (leaf.word === 'functional') {
			throw new Error('Functional SA');
		} else if (leaf.word === 'covert') {
			toaq = 'da'; // TODO: covert móq
		} else if (leaf.word.entry === undefined) {
			throw new Error(`Unrecognized SA: ${leaf.word.text}`);
		} else {
			toaq = leaf.word.entry.toaq;
		}

		return λ(['s', 't'], [], c =>
			some('v', c, c =>
				and(
					subinterval(app(temporalTrace(c), v(0, c)), speechTime(c)),
					and(
						equals(app(app(agent(c), v(0, c)), realWorld(c)), ji(c)),
						verb(denoteSpeechAct(toaq), [v(1, c)], v(0, c), realWorld(c)),
					),
				),
			),
		);
	} else {
		throw new Error(`TODO: ${leaf.label}`);
	}
}

type CompositionRule = (left: DTree, right: DTree) => Expr | null;

const functionalApplication: CompositionRule = (left, right) => {
	if (left.denotation === null) {
		return right.denotation;
	} else if (right.denotation === null) {
		return left.denotation;
	} else {
		const [fn, argument] = unifyContexts(left.denotation, right.denotation);
		return reduce(app(fn, argument));
	}
};

const reverseFunctionalApplication: CompositionRule = (left, right) =>
	functionalApplication(right, left);

// λ𝘗. λ𝘘. λ𝘢. λ𝘦. λ𝘸. 𝘗(𝘢)(𝘦)(𝘸) ∧ 𝘘(𝘦)(𝘸)
const eventIdentificationTemplate = λ(['e', ['v', ['s', 't']]], [], c =>
	λ(['v', ['s', 't']], c, c =>
		λ('e', c, c =>
			λ('v', c, c =>
				λ('s', c, c =>
					and(
						app(app(app(v(4, c), v(2, c)), v(1, c)), v(0, c)),
						app(app(v(3, c), v(1, c)), v(0, c)),
					),
				),
			),
		),
	),
);

const eventIdentification: CompositionRule = (left, right) => {
	if (left.denotation === null) {
		return right.denotation === null
			? null
			: λ('e', right.denotation.context.slice(1), () => right.denotation!);
	} else if (right.denotation === null) {
		return left.denotation;
	} else {
		const [t, l, r] = unifyContexts(
			eventIdentificationTemplate,
			left.denotation,
			right.denotation,
		);
		return reduce(app(app(t, l), r));
	}
};

const cRelComposition: CompositionRule = (_left, right) => {
	if (right.denotation === null) {
		throw new Error(`Crel composition on a null ${right.label}`);
	} else {
		return λ('e', right.denotation.context.slice(1), () => right.denotation!);
	}
};

function getCompositionRule(left: DTree, right: DTree): CompositionRule {
	switch (left.label) {
		case 'V':
		case 'Asp':
		case '𝘷0':
		case 'C':
			return functionalApplication;
		case 'T':
			// Existential tenses use FA, while pronomial tenses use reverse FA
			return Array.isArray(left.denotation?.type)
				? functionalApplication
				: reverseFunctionalApplication;
		case '𝘷':
			return eventIdentification;
		case 'Crel':
			return cRelComposition;
	}

	switch (right.label) {
		case "𝘷'":
		case 'SA':
			return reverseFunctionalApplication;
	}

	throw new Error(`TODO: composition of ${left.label} and ${right.label}`);
}

function denoteBranch(left: DTree, right: DTree): Expr | null {
	return getCompositionRule(left, right)(left, right);
}

/**
 * Annotates a tree with denotations.
 */
export function denote(tree: StrictTree): DTree {
	if ('word' in tree) {
		return { ...tree, denotation: denoteLeaf(tree) };
	} else {
		const left = denote(tree.left);
		const right = denote(tree.right);
		return {
			...tree,
			left,
			right,
			denotation: denoteBranch(left, right),
		};
	}
}
