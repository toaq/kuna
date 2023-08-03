import { Branch, Leaf, StrictTree } from '../tree';
import {
	agent,
	ama,
	and,
	app,
	DTree,
	equals,
	Expr,
	ExprType,
	ime,
	ji,
	nhana,
	nhao,
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

function speechActToVerb(toaq: string): string {
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
		if (typeof leaf.word === 'string') throw new Error();
		const entry = leaf.word.entry;
		if (!entry) throw new Error();
		return denoteConstant(entry.toaq)([]);
	} else if (leaf.label === '𝘷') {
		return λ('e', [], c =>
			λ('v', c, c =>
				λ('s', c, c => equals(app(app(agent(c), v(1, c)), v(0, c)), v(2, c))),
			),
		);
	} else if (leaf.label === 'Asp') {
		if (leaf.word !== 'covert') throw new Error('TODO: non-covert Asp');
		return λ(['v', ['s', 't']], [], c =>
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
	} else if (leaf.label === 'T') {
		if (leaf.word !== 'covert') throw new Error('TODO: non-covert T');
		return v(0, ['i']);
	} else if (leaf.label === 'SA') {
		let toaq: string;
		if (typeof leaf.word === 'string') {
			toaq = 'da'; // TODO: covert móq
		} else {
			if (leaf.word.entry === undefined) throw new Error();
			toaq = leaf.word.entry.toaq;
		}

		return λ(['s', 't'], [], c =>
			some('v', c, c =>
				and(
					subinterval(app(temporalTrace(c), v(0, c)), speechTime(c)),
					and(
						equals(app(app(agent(c), v(0, c)), realWorld(c)), ji(c)),
						verb(speechActToVerb(toaq), [v(1, c)], v(0, c), realWorld(c)),
					),
				),
			),
		);
	} else {
		return null;
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
		return right.denotation;
	} else if (right.denotation === null) {
		return left.denotation;
	} else {
		const [l, r] = unifyContexts(left.denotation, right.denotation);
		return reduce(app(app(eventIdentificationTemplate, l), r));
	}
};

const unknownComposition: CompositionRule = () => null;

function getCompositionRule(left: DTree, right: DTree): CompositionRule {
	switch (left.label) {
		case 'V':
		case 'Asp':
		case 'C':
			return functionalApplication;
		case 'T':
			return reverseFunctionalApplication;
		case '𝘷':
			return eventIdentification;
	}

	switch (right.label) {
		case "𝘷'":
		case 'SA':
			return reverseFunctionalApplication;
	}

	return unknownComposition;
}

function denoteBranch(
	branch: Branch<StrictTree>,
	left: DTree,
	right: DTree,
): Expr | null {
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
			denotation: denoteBranch(tree, left, right),
		};
	}
}