import { Branch, Leaf, StrictTree } from '../tree';
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
	noBindings,
	presuppose,
	realWorld,
	Bindings,
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
	cloneBindings,
	Binding,
	animate,
	inanimate,
	abstract,
} from './model';
import { mapBindings, reduce, rewriteContext } from './operations';

// 𝘢
const hoa = v(0, ['e']);

// 𝘢 | animate(𝘢)
const ho = presuppose(v(0, ['e']), app(animate(['e']), v(0, ['e'])));

// 𝘢 | inanimate(𝘢)
const maq = presuppose(v(0, ['e']), app(inanimate(['e']), v(0, ['e'])));

// 𝘢 | abstract(𝘢)
const hoq = presuppose(v(0, ['e']), app(abstract(['e']), v(0, ['e'])));

// 𝘢
const ta = hoa;

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

// t
const defaultTense = v(0, ['i']);

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

function denoteVerb(toaq: string, arity: number): Expr {
	switch (arity) {
		case 2:
			return λ('e', [], c =>
				λ('v', c, c => λ('s', c, c => verb(toaq, [v(2, c)], v(1, c), v(0, c)))),
			);
		case 3:
			return λ('e', [], c =>
				λ('e', c, c =>
					λ('v', c, c =>
						λ('s', c, c => verb(toaq, [v(3, c), v(2, c)], v(1, c), v(0, c))),
					),
				),
			);
		default:
			throw new Error(`Unhandled verb arity: ${toaq} (${arity})`);
	}
}

// λ𝘢. λ𝘦. λ𝘸. ᴀɢᴇɴᴛ(𝘦)(𝘸) = 𝘢
const littleV = λ('e', [], c =>
	λ('v', c, c =>
		λ('s', c, c => equals(app(app(agent(c), v(1, c)), v(0, c)), v(2, c))),
	),
);

function denoteLeaf(leaf: Leaf): DTree {
	let denotation: Expr | null;
	let bindings = noBindings;

	if (leaf.label === 'V') {
		if (typeof leaf.word === 'string') throw new Error();
		const entry = leaf.word.entry;
		if (!entry) throw new Error();
		if (entry.type !== 'predicate') throw new Error();

		denotation = denoteVerb(entry.toaq, entry.frame.split(' ').length);
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

		switch (toaq) {
			case 'jí':
				denotation = ji([]);
				break;
			case 'súq':
				denotation = suq([]);
				break;
			case 'nháo':
				denotation = nhao([]);
				break;
			case 'súna':
				denotation = suna([]);
				break;
			case 'nhána':
				denotation = nhana([]);
				break;
			case 'úmo':
				denotation = umo([]);
				break;
			case 'íme':
				denotation = ime([]);
				break;
			case 'súo':
				denotation = suo([]);
				break;
			case 'áma':
				denotation = ama([]);
				break;
			case 'hóa':
				denotation = hoa;
				break;
			case 'hó':
				denotation = ho;
				bindings = {
					variable: {},
					animacy: { animate: { index: 0, subordinate: false } },
					head: {},
				};
				break;
			case 'máq':
				denotation = maq;
				bindings = {
					variable: {},
					animacy: { inanimate: { index: 0, subordinate: false } },
					head: {},
				};
				break;
			case 'hóq':
				denotation = hoq;
				bindings = {
					variable: {},
					animacy: { abstract: { index: 0, subordinate: false } },
					head: {},
				};
				break;
			case 'tá':
				denotation = ta;
				bindings = {
					variable: {},
					animacy: { descriptive: { index: 0, subordinate: false } },
					head: {},
				};
				break;
			default:
				throw new Error(`Unrecognized DP: ${toaq}`);
		}
	} else if (leaf.label === '𝘷') {
		denotation = littleV;
	} else if (leaf.label === '𝘷0') {
		denotation = null;
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

		denotation = denoteAspect(toaq);
	} else if (leaf.label === 'T') {
		if (leaf.word === 'functional') {
			throw new Error('Functional T');
		} else if (leaf.word === 'covert') {
			denotation = defaultTense;
		} else if (leaf.word.entry === undefined) {
			throw new Error(`Unrecognized T: ${leaf.word.text}`);
		} else {
			denotation = denoteTense(leaf.word.entry.toaq);
		}
	} else if (leaf.label === 'C' || leaf.label === 'Crel') {
		denotation = null;
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

		denotation = λ(['s', 't'], [], c =>
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

	return { ...leaf, denotation, bindings };
}

export function unifyDenotations(
	left: DTree,
	right: DTree,
): [Expr, Expr, Bindings] {
	if (left.denotation === null)
		throw new Error(
			`Can't unify a semantically empty ${left.label} with a ${right.label}`,
		);
	if (right.denotation === null)
		throw new Error(
			`Can't unify a ${left.label} with a semantically empty ${right.label}`,
		);

	const bindings = cloneBindings(left.bindings);
	const context = [...left.denotation.context];

	const rightSubordinate = right.label === 'CP' || right.label === 'CPrel';
	const rightMapping = new Array<number>(right.denotation.context.length);

	// TODO: clean up these types
	// also implement the 'Cho máma hó/áq' using the subordinate field
	for (const [kind_, map] of Object.entries(right.bindings)) {
		const kind = kind_ as keyof Bindings;
		for (const [slot, rb_] of Object.entries(map)) {
			const rb = rb_ as Binding;
			if (rb !== undefined) {
				const lb = (left.bindings[kind] as any)[slot] as Binding;
				if (lb === undefined) {
					(bindings[kind] as any)[slot] = {
						index: context.length,
						subordinate: rightSubordinate,
					};
					rightMapping[rb.index] = context.length;
					context.push(right.denotation.context[rb.index]);
				} else {
					(bindings[kind] as any)[slot] = {
						index: lb.index,
						subordinate: lb.subordinate && rb.subordinate,
					};
					rightMapping[rb.index] = lb.index;
				}
			}
		}
	}

	for (let i = 0; i < rightMapping.length; i++) {
		if (rightMapping[i] === undefined) {
			rightMapping[i] = context.length;
			context.push(right.denotation.context[i]);
		}
	}

	return [
		rewriteContext(left.denotation, context, i => i),
		rewriteContext(right.denotation, context, i => rightMapping[i]),
		bindings,
	];
}

type CompositionRule = (
	branch: Branch<StrictTree>,
	left: DTree,
	right: DTree,
) => DTree;

function functionalApplicationInner(
	branch: Branch<StrictTree>,
	left: DTree,
	right: DTree,
	fn: DTree,
	argument: DTree,
): DTree {
	let denotation: Expr | null;
	let bindings: Bindings;

	if (fn.denotation === null) {
		({ denotation, bindings } = argument);
	} else if (argument.denotation === null) {
		({ denotation, bindings } = fn);
	} else {
		const [f, a, b] = unifyDenotations(fn, argument);
		denotation = reduce(app(f, a));
		bindings = b;
	}

	return { ...branch, left, right, denotation, bindings };
}

const functionalApplication: CompositionRule = (branch, left, right) =>
	functionalApplicationInner(branch, left, right, left, right);

const reverseFunctionalApplication: CompositionRule = (branch, left, right) =>
	functionalApplicationInner(branch, left, right, right, left);

// λ𝘗. λ𝘘. λ𝘢. λ𝘦. λ𝘸. 𝘗(𝘢)(𝘦)(𝘸) ∧ 𝘘(𝘦)(𝘸)
const eventIdentificationTemplate = (context: ExprType[]) =>
	λ(['e', ['v', ['s', 't']]], context, c =>
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

// λ𝘗. λ𝘢. λ𝘦. λ𝘸. 𝘗(𝘦)(𝘸)
const eventIdentificationRightOnlyTemplate = (context: ExprType[]) =>
	λ(['v', ['s', 't']], context, c =>
		λ('e', c, c =>
			λ('v', c, c => λ('s', c, c => app(app(v(3, c), v(1, c)), v(0, c)))),
		),
	);

const eventIdentification: CompositionRule = (branch, left, right) => {
	let denotation: Expr | null;
	let bindings: Bindings;

	if (left.denotation === null) {
		denotation =
			right.denotation === null
				? null
				: reduce(
						app(
							eventIdentificationRightOnlyTemplate(right.denotation.context),
							right.denotation,
						),
				  );
		bindings = right.bindings;
	} else if (right.denotation === null) {
		({ denotation, bindings } = left);
	} else {
		const [l, r, b] = unifyDenotations(left, right);
		denotation = reduce(app(app(eventIdentificationTemplate(l.context), l), r));
		bindings = b;
	}

	return { ...branch, left, right, denotation, bindings };
};

const cRelComposition: CompositionRule = (branch, left, right) => {
	if (right.denotation === null) {
		throw new Error(`Crel composition on a null ${right.label}`);
	} else {
		return {
			...branch,
			left,
			right,
			denotation: λ(
				'e',
				right.denotation.context.slice(1),
				() => right.denotation!,
			),
			bindings: mapBindings(right.bindings, b => {
				if (b.index === 0)
					throw new Error("TODO: Relative clauses that don't use hóa");
				return { index: b.index - 1, subordinate: true };
			}),
		};
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
		case "V'":
			return reverseFunctionalApplication;
	}

	throw new Error(`TODO: composition of ${left.label} and ${right.label}`);
}

function denoteBranch(
	branch: Branch<StrictTree>,
	left: DTree,
	right: DTree,
): DTree {
	return getCompositionRule(left, right)(branch, left, right);
}

/**
 * Annotates a tree with denotations.
 */
export function denote(tree: StrictTree): DTree {
	if ('word' in tree) {
		// TODO: n and SA leaves require information about their sibling
		return denoteLeaf(tree);
	} else {
		const left = denote(tree.left);
		const right = denote(tree.right);
		return denoteBranch(tree, left, right);
	}
}
