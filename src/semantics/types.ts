import { bare } from '../morphology/tokenize';
import { Tone, inTone } from '../morphology/tone';
import type { Branch, Leaf } from '../tree';

export type AnimacyClass = 'animate' | 'inanimate' | 'abstract' | 'descriptive';

export type Binding =
	| { type: 'resumptive' }
	| { type: 'covert resumptive' }
	| { type: 'gap' }
	| { type: 'name'; verb: string }
	| { type: 'animacy'; class: AnimacyClass }
	| { type: 'head'; head: string };

export function animacyToString(a: AnimacyClass): string {
	switch (a) {
		case 'animate':
			return 'hó';
		case 'inanimate':
			return 'máq';
		case 'abstract':
			return 'hóq';
		case 'descriptive':
			return 'tá';
	}
}

export function bindingToString(b: Binding): string {
	switch (b.type) {
		case 'resumptive':
			return 'hóa';
		case 'covert resumptive':
			return 'PRO';
		case 'gap':
			return 'já';
		case 'name':
			return inTone(b.verb, Tone.T2);
		case 'animacy':
			return animacyToString(b.class);
		case 'head':
			return `hụ́${bare(b.head)}`;
	}
}

/**
 * A type of a semantic expression.
 */
export type ExprType =
	// An individual; anything which can act as a verbal argument.
	| 'e'
	// An event; a concrete instance of something happening.
	| 'v'
	// A time interval.
	| 'i'
	// A truth value.
	| 't'
	// A world; a frame of reference which associates intensions with extensions.
	| 's'
	// The unit type.
	| '()'
	// A total function from {domain} to {range}.
	| { head: 'fn'; domain: ExprType; range: ExprType }
	// An intension which behaves in local syntax like {inner}; isomorphic to
	// s → {inner}.
	| { head: 'int'; inner: ExprType }
	// A continuation which behaves in local syntax like {inner} and takes scope at
	// a t to produce a t; isomorphic to ({inner} → t) → t.
	| { head: 'cont'; inner: ExprType }
	// A plurality which behaves in local syntax like {inner}; isomorphic to a set
	// of {inner}.
	| { head: 'pl'; inner: ExprType }
	// A generic reference which behaves in local syntax like {inner}; isomorphic
	// to (a set of {domain}) × ({domain} → {inner}).
	| { head: 'gen'; domain: ExprType; inner: ExprType }
	// A question which behaves in local syntax like {inner}; isomorphic to
	// (a set of {domain}) × ({domain} → {inner}).
	| { head: 'qn'; domain: ExprType; inner: ExprType }
	// A pair of meanings which behaves in local syntax like {inner} and carries a
	// {supplement}; isomorphic to {inner} × {supplement}.
	| { head: 'pair'; inner: ExprType; supplement: ExprType }
	// An expression which binds a variable and behaves in local syntax like
	// {inner}; isomorphic to {inner} × {binding} × Int Pl e.
	| { head: 'bind'; binding: Binding; inner: ExprType }
	// An expression which references a variable and behaves in local syntax like
	// {inner}; isomorphic to {binding} × (Int Pl e → {inner}).
	| { head: 'ref'; binding: Binding; inner: ExprType }
	// An expression which references an element of the discourse context through
	// deixis; isomorphic to context → {inner}.
	| { head: 'dx'; inner: ExprType }
	// An expression which updates the discourse with a speech act; isomorphic to
	// {inner} × speech act.
	| { head: 'act'; inner: ExprType };

interface ExprBase {
	/**
	 * The type of this expression.
	 */
	type: ExprType;
	/**
	 * The types of all variables in scope, ordered by De Bruijn indexing.
	 */
	scope: ExprType[];
}

interface Variable extends ExprBase {
	head: 'variable';
	/**
	 * The De Bruijn index of the variable in the current scope.
	 */
	index: number;
}

interface Lambda extends ExprBase {
	head: 'lambda';
	body: Expr;
	nameHint?: string;
}

interface Apply extends ExprBase {
	head: 'apply';
	fn: Expr;
	arg: Expr;
}

interface Lexeme extends ExprBase {
	head: 'lexeme';
	name: string;
}

interface Quote extends ExprBase {
	head: 'quote';
	text: string;
}

interface Constant extends ExprBase {
	head: 'constant';
	name:
		| 'int'
		| 'unint'
		| 'cont'
		| 'uncont'
		| 'map'
		| 'flat_map'
		| 'gen'
		| 'ungen'
		| 'qn'
		| 'unqn'
		| 'some'
		| 'every'
		| 'pair'
		| 'unpair'
		| 'bind'
		| 'unbind'
		| 'ref'
		| 'unref'
		| 'and_map'
		| 'and_then'
		| 'salient'
		| 'bg'
		| 'not'
		| 'and'
		| 'or'
		| 'implies'
		| 'equals'
		| 'among'
		| 'animate'
		| 'agent'
		| 'accessibility';
}

/**
 * A semantic expression.
 */
export type Expr = Variable | Lambda | Apply | Lexeme | Quote | Constant;

/**
 * A tree with denotations.
 */
export type DTree = (Leaf | (Branch<DTree> & { mode: CompositionMode })) & {
	denotation: Expr;
};

/**
 * A user-friendly scope type combining an indexical typing context with a
 * naming context.
 */
export interface Scope {
	types: ExprType[];
	var: (name: symbol) => Variable;
}

export type CompositionMode =
	| '>' // Functional application
	| '<' // Reverse functional application
	| '+' // Semigroup combination
	| ['L', CompositionMode] // Lift left into functor
	| ['R', CompositionMode] // Lift right into functor
	| ['A', CompositionMode] // Sequence effects via applicative functor
	| ['←L', CompositionMode] // Pull distributive functor out of functor on the left
	| ['←R', CompositionMode] // Pull distributive functor out of functor on the right
	| ['←', CompositionMode] // Pull distributive functor out of functor
	| ['→L', CompositionMode] // Push traversable functor into applicative on the left
	| ['→R', CompositionMode] // Push traversable functor into applicative on the right
	| ['→', CompositionMode] // Push traversable functor into applicative
	| ['↓L', CompositionMode] // Extract from effect on the left
	| ['↓R', CompositionMode] // Extract from effect on the right
	| ['↓', CompositionMode] // Extract from effect
	| ['JL', CompositionMode] // Join monads on the left
	| ['JR', CompositionMode] // Join monads on the right
	| ['J', CompositionMode] // Join monads
	| ['Z', CompositionMode]; // Resolve binding relationship

export function modeToString(mode: CompositionMode): string {
	return typeof mode === 'string'
		? mode
		: // @ts-ignore TypeScript can't handle the infinite types here
			mode
				.flat(Number.POSITIVE_INFINITY)
				.join(' ');
}
