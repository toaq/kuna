import { Impossible } from '../core/error';
import type { Branch, Leaf } from '../tree';
import type { CompositionMode } from './compose';
import { typeToPlainText, typesToPlainText } from './render';

export type AnimacyClass = 'animate' | 'inanimate' | 'abstract' | 'descriptive';

export type Binding =
	| { type: 'resumptive' }
	| { type: 'verb'; verb: string }
	| { type: 'animacy'; class: AnimacyClass }
	| { type: 'head'; head: string };

/**
 * Determines whether two bindings are equal.
 */
export function bindingsEqual(b1: Binding, b2: Binding): boolean {
	switch (b1.type) {
		case 'resumptive':
			return b2.type === 'resumptive';
		case 'verb':
			return b2.type === 'verb' && b1.verb === b2.verb;
		case 'animacy':
			return b2.type === 'animacy' && b1.class === b2.class;
		case 'head':
			return b2.type === 'head' && b1.head === b2.head;
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
	| '1'
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
	// to a set of {inner}.
	| { head: 'gen'; inner: ExprType }
	// A question which behaves in local syntax like {inner}; isomorphic to a set
	// of {inner}.
	| { head: 'qn'; inner: ExprType }
	// A pair of meanings which behaves in local syntax like {inner} and carries a
	// {supplement}; isomorphic to {inner} × {supplement}.
	| { head: 'pair'; inner: ExprType; supplement: ExprType }
	// An expression which binds a variable and behaves in local syntax like
	// {inner}; isomorphic to {inner} × {binding} × e.
	| { head: 'bind'; binding: Binding; inner: ExprType }
	// An expression which references a variable and behaves in local syntax like
	// {inner}; isomorphic to {binding} × (e → {inner}).
	| { head: 'ref'; binding: Binding; inner: ExprType }
	// An expression which interacts with the discourse context (e.g. through
	// deixis or a speech act) and behaves in local syntax like {inner}; isomorphic
	// to context → ({inner} × context).
	| { head: 'io'; inner: ExprType };

export function Fn(domain: ExprType, range: ExprType): ExprType {
	return { head: 'fn', domain, range };
}

export function Int(inner: ExprType): ExprType {
	return { head: 'int', inner };
}

export function Cont(inner: ExprType): ExprType {
	return { head: 'cont', inner };
}

export function Pl(inner: ExprType): ExprType {
	return { head: 'pl', inner };
}

export function Gen(inner: ExprType): ExprType {
	return { head: 'gen', inner };
}

export function Qn(inner: ExprType): ExprType {
	return { head: 'qn', inner };
}

export function Pair(inner: ExprType, supplement: ExprType): ExprType {
	return { head: 'pair', inner, supplement };
}

export function Bind(binding: Binding, inner: ExprType): ExprType {
	return { head: 'bind', binding, inner };
}

export function Ref(binding: Binding, inner: ExprType): ExprType {
	return { head: 'ref', binding, inner };
}

export function IO(inner: ExprType): ExprType {
	return { head: 'io', inner };
}

/**
 * Determines whether the first type is a subtype of the second.
 */
export function subtype(t1: ExprType, t2: ExprType): boolean {
	if (typeof t1 === 'string' || typeof t2 === 'string') {
		return t1 === t2 || (t1 === 'v' && t2 === 'e');
	}
	if (t1 === t2) return true;
	switch (t1.head) {
		case 'fn':
			return (
				t2.head === 'fn' &&
				subtype(t2.domain, t1.domain) &&
				subtype(t1.range, t2.range)
			);
		case 'int':
			return t2.head === 'int' && subtype(t1.inner, t2.inner);
		case 'cont':
			return t2.head === 'cont' && subtype(t1.inner, t2.inner);
		case 'pl':
			return t2.head === 'pl' && subtype(t1.inner, t2.inner);
		case 'gen':
			return t2.head === 'gen' && subtype(t1.inner, t2.inner);
		case 'qn':
			return t2.head === 'qn' && subtype(t1.inner, t2.inner);
		case 'pair':
			return (
				t2.head === 'pair' &&
				subtype(t1.inner, t2.inner) &&
				subtype(t1.supplement, t2.supplement)
			);
		case 'bind':
			return (
				t2.head === 'bind' &&
				bindingsEqual(t1.binding, t2.binding) &&
				subtype(t1.inner, t2.inner)
			);
		case 'ref':
			return (
				t2.head === 'ref' &&
				bindingsEqual(t1.binding, t2.binding) &&
				subtype(t1.inner, t2.inner)
			);
		case 'io':
			return t2.head === 'io' && subtype(t1.inner, t2.inner);
	}
}

export function assertSubtype(t1: ExprType, t2: ExprType): void {
	if (!subtype(t1, t2))
		throw new Impossible(
			`Type ${typeToPlainText(t1)} is not assignable to type ${typeToPlainText(
				t2,
			)}`,
		);
}

/**
 * Determines whether two types are equal.
 */
export function typesEqual(t1: ExprType, t2: ExprType): boolean {
	if (typeof t1 === 'string' || typeof t2 === 'string') return t1 === t2;
	if (t1 === t2) return true;
	switch (t1.head) {
		case 'fn':
			return (
				t2.head === 'fn' &&
				typesEqual(t2.domain, t1.domain) &&
				typesEqual(t1.range, t2.range)
			);
		case 'int':
			return t2.head === 'int' && typesEqual(t1.inner, t2.inner);
		case 'cont':
			return t2.head === 'cont' && typesEqual(t1.inner, t2.inner);
		case 'pl':
			return t2.head === 'pl' && typesEqual(t1.inner, t2.inner);
		case 'gen':
			return t2.head === 'gen' && typesEqual(t1.inner, t2.inner);
		case 'qn':
			return t2.head === 'qn' && typesEqual(t1.inner, t2.inner);
		case 'pair':
			return (
				t2.head === 'pair' &&
				typesEqual(t1.inner, t2.inner) &&
				typesEqual(t1.supplement, t2.supplement)
			);
		case 'bind':
			return (
				t2.head === 'bind' &&
				bindingsEqual(t1.binding, t2.binding) &&
				typesEqual(t1.inner, t2.inner)
			);
		case 'ref':
			return (
				t2.head === 'ref' &&
				bindingsEqual(t1.binding, t2.binding) &&
				typesEqual(t1.inner, t2.inner)
			);
		case 'io':
			return t2.head === 'io' && typesEqual(t1.inner, t2.inner);
	}
}

/**
 * Determines whether two types are compatible (one is assignable to the other).
 */
export function typesCompatible(t1: ExprType, t2: ExprType): boolean {
	return subtype(t1, t2) || subtype(t2, t1);
}

export function assertTypesCompatible(t1: ExprType, t2: ExprType): void {
	if (!typesCompatible(t1, t2))
		throw new Impossible(
			`Types ${typeToPlainText(t1)} and ${typeToPlainText(
				t2,
			)} are not compatible`,
		);
}

export function assertFn(
	type: ExprType,
): asserts type is { head: 'fn'; domain: ExprType; range: ExprType } {
	if (typeof type === 'string' || type.head !== 'fn')
		throw new Impossible(`${typeToPlainText(type)} is not a function type`);
}

export function assertInt(
	type: ExprType,
): asserts type is { head: 'int'; inner: ExprType } {
	if (typeof type === 'string' || type.head !== 'int')
		throw new Impossible(`${typeToPlainText(type)} is not a intension type`);
}

function assertCont(
	type: ExprType,
): asserts type is { head: 'cont'; inner: ExprType } {
	if (typeof type === 'string' || type.head !== 'cont')
		throw new Impossible(`${typeToPlainText(type)} is not a continuation type`);
}

type SetHead = 'pl' | 'gen' | 'qn';

export function assertSet(
	type: ExprType,
): asserts type is { head: SetHead; inner: ExprType } {
	if (
		typeof type === 'string' ||
		(type.head !== 'pl' && type.head !== 'gen' && type.head !== 'qn')
	)
		throw new Impossible(`${typeToPlainText(type)} is not a set type`);
}

export function assertPair(
	type: ExprType,
): asserts type is { head: 'pair'; inner: ExprType; supplement: ExprType } {
	if (typeof type === 'string' || type.head !== 'pair')
		throw new Impossible(`${typeToPlainText(type)} is not a pair type`);
}

export function assertBind(
	type: ExprType,
): asserts type is { head: 'bind'; binding: Binding; inner: ExprType } {
	if (typeof type === 'string' || type.head !== 'bind')
		throw new Impossible(`${typeToPlainText(type)} is not a bind type`);
}

export function assertRef(
	type: ExprType,
): asserts type is { head: 'ref'; binding: Binding; inner: ExprType } {
	if (typeof type === 'string' || type.head !== 'ref')
		throw new Impossible(`${typeToPlainText(type)} is not a reference type`);
}

export function assertIO(
	type: ExprType,
): asserts type is { head: 'io'; inner: ExprType } {
	if (typeof type === 'string' || type.head !== 'io')
		throw new Impossible(`${typeToPlainText(type)} is not an IO type`);
}

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

interface Constant<Name extends string> extends ExprBase {
	head: 'constant';
	name: Name;
}

/**
 * A semantic expression.
 */
export type Expr =
	| Variable
	| Lambda
	| Apply
	| Lexeme
	| Quote
	| Constant<'int'>
	| Constant<'unint'>
	| Constant<'cont'>
	| Constant<'uncont'>
	| Constant<'empty'>
	| Constant<'cons'>
	| Constant<'build'>
	| Constant<'filter'>
	| Constant<'map'>
	| Constant<'flat_map'>
	| Constant<'element'>
	| Constant<'some'>
	| Constant<'every'>
	| Constant<'pair'>
	| Constant<'unpair'>
	| Constant<'bind'>
	| Constant<'unbind'>
	| Constant<'ref'>
	| Constant<'unref'>
	| Constant<'and_map'>
	| Constant<'then'>
	| Constant<'and_then'>
	| Constant<'and'>
	| Constant<'equals'>
	| Constant<'agent'>;

/**
 * A tree with denotations.
 */
export type DTree = (Leaf | (Branch<DTree> & { mode: CompositionMode[] })) & {
	denotation: Expr;
};

export function scopesEqual(s1: ExprType[], s2: ExprType[]): boolean {
	return (
		s1 === s2 ||
		(s1.length === s2.length && s1.every((t, i) => subtype(t, s2[i])))
	);
}

export function assertScopesEqual(s1: ExprType[], s2: ExprType[]): void {
	if (!scopesEqual(s1, s2))
		throw new Impossible(
			`Scopes ${typesToPlainText(s1)} and ${typesToPlainText(
				s2,
			)} are not equal`,
		);
}

/**
 * A user-friendly scope type combining an indexical typing context with a
 * naming context.
 */
export interface Scope {
	types: ExprType[];
	var: (name: symbol) => Variable;
}

/**
 * An empty scope; the scope of closed expressions.
 */
export const closed: Scope = {
	types: [],
	var: () => {
		throw new Impossible('Variable not in scope');
	},
};

/**
 * Constructor for lambda expressions.
 */
export function λ(
	inputType: ExprType,
	scope: Scope,
	body: (inputName: symbol, scope: Scope) => Expr,
): Expr {
	const inputName = Symbol();
	const innerScopeTypes = [inputType, ...scope.types];
	const innerScope: Scope = {
		types: innerScopeTypes,
		var: name => {
			if (name === inputName)
				return {
					head: 'variable',
					type: inputType,
					scope: innerScopeTypes,
					index: 0,
				};
			const outer = scope.var(name);
			return { ...outer, scope: innerScopeTypes, index: outer.index + 1 };
		},
	};
	const bodyResult = body(inputName, innerScope);
	assertScopesEqual(bodyResult.scope, innerScope.types);

	return {
		head: 'lambda',
		type: Fn(inputType, bodyResult.type),
		scope: scope.types,
		body: bodyResult,
	};
}

/**
 * Constructor for function application expressions.
 */
export function app(fn: Expr, arg: Expr): Expr {
	assertFn(fn.type);
	const { domain, range } = fn.type;
	assertSubtype(arg.type, domain);
	assertScopesEqual(fn.scope, arg.scope);

	return { head: 'apply', type: range, scope: fn.scope, fn, arg };
}

/**
 * Constructor for lexeme expressions.
 */
export function lex(entry: string, type: ExprType, scope: Scope): Expr {
	return { head: 'lexeme', type, scope: scope.types, name: entry };
}

/**
 * Constructor for quote expressions.
 */
export function quote(text: string, scope: Scope): Expr {
	return { head: 'quote', type: 'e', scope: scope.types, text };
}

/**
 * Constructs an intension.
 */
export function int(body: Expr): Expr {
	assertFn(body.type);
	const inner = body.type.range;
	return app(
		{
			head: 'constant',
			type: Fn(Fn('s', inner), Int(inner)),
			scope: body.scope,
			name: 'int',
		},
		body,
	);
}

/**
 * Deconstructs an intension.
 */
export function unint(int: Expr): Expr {
	assertInt(int.type);
	return app(
		{
			head: 'constant',
			type: Fn(int.type, Fn('s', int.type.inner)),
			scope: int.scope,
			name: 'unint',
		},
		int,
	);
}

/**
 * Constructs a continuation.
 */
export function cont(body: Expr): Expr {
	assertFn(body.type);
	assertFn(body.type.domain);
	const inner = body.type.domain.domain;
	return app(
		{
			head: 'constant',
			type: Fn(Fn(Fn(inner, 't'), 't'), Cont(inner)),
			scope: body.scope,
			name: 'cont',
		},
		body,
	);
}

/**
 * Deconstructs a continuation.
 */
export function uncont(cont: Expr): Expr {
	assertCont(cont.type);
	return app(
		{
			head: 'constant',
			type: Fn(cont.type, Fn(Fn(cont.type.inner, 't'), 't')),
			scope: cont.scope,
			name: 'uncont',
		},
		cont,
	);
}

/**
 * Constructs an empty set.
 */
export function empty(head: SetHead, inner: ExprType, scope: Scope): Expr {
	return {
		head: 'constant',
		type: { head, inner },
		scope: scope.types,
		name: 'empty',
	};
}

/**
 * Inserts an element into a set.
 */
export function cons(el: Expr, set: Expr): Expr {
	assertSet(set.type);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(set.type.inner, Fn(set.type, set.type)),
				scope: el.scope,
				name: 'cons',
			},
			el,
		),
		set,
	);
}

/**
 * Builds a set consisting of all values in a given domain.
 */
export function build(head: SetHead, domain: ExprType, scope: Scope): Expr {
	return {
		head: 'constant',
		type: { head, inner: domain },
		scope: scope.types,
		name: 'build',
	};
}

/**
 * Filters a set by a predicate.
 */
export function filter(set: Expr): Expr {
	assertSet(set.type);
	return app(
		{
			head: 'constant',
			type: Fn(set.type, Fn(Fn(set.type.inner, 't'), set.type)),
			scope: set.scope,
			name: 'filter',
		},
		set,
	);
}

/**
 * Maps a set to another set by projecting each element.
 */
export function map(set: Expr, project: Expr): Expr {
	assertSet(set.type);
	assertFn(project.type);
	const range = project.type.range;
	assertSet(range);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(
					set.type,
					Fn(Fn(set.type.inner, range), { head: set.type.head, inner: range }),
				),
				scope: set.scope,
				name: 'map',
			},
			set,
		),
		project,
	);
}

/**
 * Maps a set to another set by projecting each element and taking the union of
 * all projections.
 */
export function flatMap(set: Expr, project: Expr): Expr {
	assertFn(project.type);
	const { domain, range } = project.type;
	assertSet(range);
	return app(
		app(
			{
				head: 'constant',
				type: Fn({ head: range.head, inner: domain }, Fn(project.type, range)),
				scope: set.scope,
				name: 'flat_map',
			},
			set,
		),
		project,
	);
}

/**
 * Determines whether something is an element of a given set.
 */
export function element(el: Expr, set: Expr): Expr {
	assertSet(set.type);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(set.type.inner, Fn(set.type, 't')),
				scope: el.scope,
				name: 'element',
			},
			el,
		),
		set,
	);
}

/**
 * Determines whether something in the domain satisfies a given predicate.
 */
export function some(predicate: Expr): Expr {
	assertFn(predicate.type);
	return app(
		{
			head: 'constant',
			type: Fn(Fn(predicate.type.domain, 't'), 't'),
			scope: predicate.scope,
			name: 'some',
		},
		predicate,
	);
}

/**
 * Determines whether everything in the domain satisfies a given predicate.
 */
export function every(predicate: Expr): Expr {
	assertFn(predicate.type);
	return app(
		{
			head: 'constant',
			type: Fn(Fn(predicate.type.domain, 't'), 't'),
			scope: predicate.scope,
			name: 'every',
		},
		predicate,
	);
}

/**
 * Constructs a pair of meanings.
 */
export function pair(body: Expr, supplement: Expr): Expr {
	return app(
		app(
			{
				head: 'constant',
				type: Fn(
					body.type,
					Fn(supplement.type, Pair(body.type, supplement.type)),
				),
				scope: body.scope,
				name: 'pair',
			},
			body,
		),
		supplement,
	);
}

/**
 * Deconstructs a pair of meanings.
 */
export function unpair(pair: Expr, project: Expr): Expr {
	assertPair(pair.type);
	assertFn(project.type);
	assertFn(project.type.range);
	const out = project.type.range.range;
	return app(
		app(
			{
				head: 'constant',
				type: Fn(
					pair.type,
					Fn(Fn(pair.type.inner, Fn(pair.type.supplement, out)), out),
				),
				scope: pair.scope,
				name: 'unpair',
			},
			pair,
		),
		project,
	);
}

/**
 * Constructs an expression that binds a variable.
 */
export function bind(binding: Binding, value: Expr, body: Expr): Expr {
	const inner = body.type;
	return app(
		app(
			{
				head: 'constant',
				type: Fn('e', Fn(inner, Bind(binding, inner))),
				scope: body.scope,
				name: 'bind',
			},
			value,
		),
		body,
	);
}

/**
 * Deconstructs an expression that binds a variable.
 */
export function unbind(bind: Expr, project: Expr): Expr {
	assertBind(bind.type);
	assertFn(project.type);
	assertFn(project.type.range);
	const out = project.type.range.range;
	return app(
		app(
			{
				head: 'constant',
				type: Fn(bind.type, Fn(Fn('e', Fn(bind.type.inner, out)), out)),
				scope: bind.scope,
				name: 'unbind',
			},
			bind,
		),
		project,
	);
}

/**
 * Constructs an expression that references a variable.
 */
export function ref(binding: Binding, body: Expr): Expr {
	assertFn(body.type);
	const inner = body.type.range;
	return app(
		{
			head: 'constant',
			type: Fn(Fn('e', inner), Ref(binding, inner)),
			scope: body.scope,
			name: 'ref',
		},
		body,
	);
}

/**
 * Deconstructs an expression that references a variable.
 */
export function unref(ref: Expr): Expr {
	assertRef(ref.type);
	return app(
		{
			head: 'constant',
			type: Fn(ref.type, Fn('e', ref.type.inner)),
			scope: ref.scope,
			name: 'unref',
		},
		ref,
	);
}

/**
 * Projects the value returned by a context operation.
 */
export function andMap(op: Expr, project: Expr): Expr {
	assertIO(op.type);
	assertFn(project.type);
	const range = project.type.range;
	return app(
		app(
			{
				head: 'constant',
				type: Fn(op.type, Fn(Fn(op.type.inner, range), IO(range))),
				scope: op.scope,
				name: 'and_map',
			},
			op,
		),
		project,
	);
}

/**
 * Sequences two context operations, discarding their results.
 */
export function then(first: Expr, second: Expr): Expr {
	assertIO(first.type);
	assertIO(second.type);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(first.type, Fn(second.type, IO('1'))),
				scope: first.scope,
				name: 'then',
			},
			first,
		),
		second,
	);
}

/**
 * Sequences two context operations, with the second operation being dependent
 * on the value returned by the first.
 */
export function andThen(first: Expr, continuation: Expr): Expr {
	assertFn(continuation.type);
	const { domain, range } = continuation.type;
	assertIO(range);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(IO(domain), Fn(continuation.type, range)),
				scope: first.scope,
				name: 'and_then',
			},
			first,
		),
		continuation,
	);
}

export function and(scope: Scope): Expr {
	return {
		head: 'constant',
		type: Fn('t', Fn('t', 't')),
		scope: scope.types,
		name: 'and',
	};
}

export function equals(left: Expr, right: Expr): Expr {
	assertTypesCompatible(left.type, right.type);
	assertScopesEqual(left.scope, right.scope);

	return app(
		app(
			{
				head: 'constant',
				type: Fn(left.type, Fn(right.type, 't')),
				scope: left.scope,
				name: 'equals',
			},
			left,
		),
		right,
	);
}

export function agent(scope: Scope): Expr {
	return {
		head: 'constant',
		type: Fn('v', Fn('s', 'e')),
		scope: scope.types,
		name: 'agent',
	};
}
