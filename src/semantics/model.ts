import { Impossible } from '../core/error';
import { typeToPlainText, typesToPlainText } from './render';
import type { Binding, Expr, ExprType } from './types';

/**
 * Determines whether two bindings are equal.
 */
export function bindingsEqual(b1: Binding, b2: Binding): boolean {
	switch (b1.type) {
		case 'resumptive':
			return b2.type === 'resumptive';
		case 'gap':
			return b2.type === 'gap';
		case 'name':
			return b2.type === 'name' && b1.verb === b2.verb;
		case 'animacy':
			return b2.type === 'animacy' && b1.class === b2.class;
		case 'head':
			return b2.type === 'head' && b1.head === b2.head;
	}
}

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

export function Gen(domain: ExprType, inner: ExprType): ExprType {
	return { head: 'gen', domain, inner };
}

export function Qn(domain: ExprType, inner: ExprType): ExprType {
	return { head: 'qn', domain, inner };
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

export function Nf(domain: ExprType, inner: ExprType): ExprType {
	return { head: 'nf', domain, inner };
}

export function Dx(inner: ExprType): ExprType {
	return { head: 'dx', inner };
}

export function Act(inner: ExprType): ExprType {
	return { head: 'act', inner };
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
			return (
				t2.head === 'gen' &&
				subtype(t2.domain, t1.domain) &&
				subtype(t1.inner, t2.inner)
			);
		case 'qn':
			return (
				t2.head === 'qn' &&
				subtype(t2.domain, t1.domain) &&
				subtype(t1.inner, t2.inner)
			);
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
		case 'nf':
			return (
				t2.head === 'nf' &&
				subtype(t2.domain, t1.domain) &&
				subtype(t1.inner, t2.inner)
			);
		case 'dx':
			return t2.head === 'dx' && subtype(t1.inner, t2.inner);
		case 'act':
			return t2.head === 'act' && subtype(t1.inner, t2.inner);
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
		case 'nf':
			return (
				t2.head === 'nf' &&
				typesEqual(t2.domain, t1.domain) &&
				typesEqual(t1.inner, t2.inner)
			);
		case 'dx':
			return t2.head === 'dx' && typesEqual(t1.inner, t2.inner);
		case 'act':
			return t2.head === 'act' && typesEqual(t1.inner, t2.inner);
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

export function assertCont(
	type: ExprType,
): asserts type is { head: 'cont'; inner: ExprType } {
	if (typeof type === 'string' || type.head !== 'cont')
		throw new Impossible(`${typeToPlainText(type)} is not a continuation type`);
}

export function assertPl(
	type: ExprType,
): asserts type is { head: 'pl'; inner: ExprType } {
	if (typeof type === 'string' || type.head !== 'pl')
		throw new Impossible(`${typeToPlainText(type)} is not a plurality type`);
}

export function assertGen(
	type: ExprType,
): asserts type is { head: 'gen'; inner: ExprType; domain: ExprType } {
	if (typeof type === 'string' || type.head !== 'gen')
		throw new Impossible(
			`${typeToPlainText(type)} is not a generic reference type`,
		);
}

export function assertQn(
	type: ExprType,
): asserts type is { head: 'qn'; inner: ExprType; domain: ExprType } {
	if (typeof type === 'string' || type.head !== 'qn')
		throw new Impossible(`${typeToPlainText(type)} is not a question type`);
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

export function assertNf(
	type: ExprType,
): asserts type is { head: 'nf'; domain: ExprType; inner: ExprType } {
	if (typeof type === 'string' || type.head !== 'nf')
		throw new Impossible(`${typeToPlainText(type)} is not a non-finite type`);
}

export function assertDx(
	type: ExprType,
): asserts type is { head: 'dx'; inner: ExprType } {
	if (typeof type === 'string' || type.head !== 'dx')
		throw new Impossible(`${typeToPlainText(type)} is not a deixis type`);
}

export function assertAct(
	type: ExprType,
): asserts type is { head: 'act'; inner: ExprType } {
	if (typeof type === 'string' || type.head !== 'act')
		throw new Impossible(`${typeToPlainText(type)} is not an action type`);
}

export function assertDxOrAct(
	type: ExprType,
): asserts type is { head: 'dx' | 'act'; inner: ExprType } {
	if (typeof type === 'string' || (type.head !== 'dx' && type.head !== 'act'))
		throw new Impossible(
			`${typeToPlainText(type)} is not a deixis or action type`,
		);
}

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

export function unifyScopes(
	s1: (ExprType | undefined)[],
	s2: (ExprType | undefined)[],
): (ExprType | undefined)[] {
	if (s1.length === 0) return s2;
	if (s2.length === 0) return s1;

	const length = Math.max(s1.length, s2.length);
	const result = new Array<ExprType | undefined>(length);

	for (let i = 0; i < length; i++) {
		const t1 = s1[i];
		const t2 = s2[i];
		if (t1 === undefined) {
			if (t2 !== undefined) result[i] = t2;
		} else if (t2 === undefined) result[i] = t1;
		else if (subtype(t1, t2)) result[i] = t2;
		else if (subtype(t2, t1)) result[i] = t1;
		else
			throw new Impossible(
				`Scopes ${typesToPlainText(s1)} and ${typesToPlainText(s2)} are not compatible`,
			);
	}

	return result;
}

const scope: ExprType[] = [];

/**
 * Constructor for lambda expressions.
 */
export function λ(
	inputType: ExprType,
	body: (inputName: number) => Expr,
): Expr {
	const inputName = scope.length;
	scope.push(inputType);
	const bodyResult = body(inputName);
	scope.pop();
	if (bodyResult.scope[0] !== undefined)
		assertSubtype(inputType, bodyResult.scope[0]);

	return {
		head: 'lambda',
		type: Fn(inputType, bodyResult.type),
		scope: bodyResult.scope.slice(1),
		param: inputType,
		body: bodyResult,
	};
}

/**
 * Constructor for variable references. The input name must be a name generated
 * by an enclosing call to λ.
 */
export function v(inputName: number): Expr {
	const s = new Array<ExprType | undefined>(scope.length - inputName);
	s[s.length - 1] = scope[inputName];
	return {
		head: 'variable',
		type: scope[inputName],
		scope: s,
		index: s.length - 1,
	};
}

/**
 * Constructor for function application expressions.
 */
export function app(fn: Expr, arg: Expr): Expr {
	assertFn(fn.type);
	const { domain, range } = fn.type;
	assertSubtype(arg.type, domain);
	const scope = unifyScopes(fn.scope, arg.scope);

	return { head: 'apply', type: range, scope, fn, arg };
}

/**
 * Constructor for lexeme expressions.
 */
export function lex(entry: string, type: ExprType): Expr {
	return { head: 'lexeme', type, scope: [], name: entry };
}

/**
 * Constructor for quote expressions.
 */
export function quote(text: string): Expr {
	return { head: 'quote', type: 'e', scope: [], text };
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
			scope: [],
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
			scope: [],
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
			scope: [],
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
			scope: [],
			name: 'uncont',
		},
		cont,
	);
}

/**
 * Maps a plurality to another plurality by projecting each element.
 */
export function map(pl: Expr, project: Expr): Expr {
	assertPl(pl.type);
	assertFn(project.type);
	const range = project.type.range;
	return app(
		app(
			{
				head: 'constant',
				type: Fn(pl.type, Fn(Fn(pl.type.inner, range), Pl(range))),
				scope: [],
				name: 'map',
			},
			pl,
		),
		project,
	);
}

/**
 * Maps a plurality to another plurality by projecting each element and taking
 * the union of all projections.
 */
export function flatMap(pl: Expr, project: Expr): Expr {
	assertFn(project.type);
	const { domain, range } = project.type;
	assertPl(range);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(Pl(domain), Fn(project.type, range)),
				scope: [],
				name: 'flat_map',
			},
			pl,
		),
		project,
	);
}

/**
 * Constructs a generic reference.
 */
export function gen(restriction: Expr, body: Expr): Expr {
	assertFn(restriction.type);
	assertFn(body.type);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(
					Fn(restriction.type.domain, 't'),
					Fn(
						Fn(restriction.type.domain, body.type.range),
						Gen(restriction.type.domain, body.type.range),
					),
				),
				scope: [],
				name: 'gen',
			},
			restriction,
		),
		body,
	);
}

/**
 * Deconstructs a generic reference.
 */
export function ungen(gen: Expr, project: Expr): Expr {
	assertGen(gen.type);
	assertFn(project.type);
	assertFn(project.type.range);
	const out = project.type.range.range;
	return app(
		app(
			{
				head: 'constant',
				type: Fn(
					gen.type,
					Fn(
						Fn(
							Fn(gen.type.domain, 't'),
							Fn(Fn(gen.type.domain, gen.type.inner), out),
						),
						out,
					),
				),
				scope: [],
				name: 'ungen',
			},
			gen,
		),
		project,
	);
}

/**
 * Constructs a question.
 */
export function qn(restriction: Expr, body: Expr): Expr {
	assertFn(restriction.type);
	assertFn(body.type);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(
					Fn(restriction.type.domain, 't'),
					Fn(
						Fn(restriction.type.domain, body.type.range),
						Qn(restriction.type.domain, body.type.range),
					),
				),
				scope: [],
				name: 'qn',
			},
			restriction,
		),
		body,
	);
}

/**
 * Deconstructs a question.
 */
export function unqn(qn: Expr, project: Expr): Expr {
	assertQn(qn.type);
	assertFn(project.type);
	assertFn(project.type.range);
	const out = project.type.range.range;
	return app(
		app(
			{
				head: 'constant',
				type: Fn(
					qn.type,
					Fn(
						Fn(
							Fn(qn.type.domain, 't'),
							Fn(Fn(qn.type.domain, qn.type.inner), out),
						),
						out,
					),
				),
				scope: [],
				name: 'unqn',
			},
			qn,
		),
		project,
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
			scope: [],
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
			scope: [],
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
				scope: [],
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
				scope: [],
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
				type: Fn(Int(Pl('e')), Fn(inner, Bind(binding, inner))),
				scope: [],
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
				type: Fn(
					bind.type,
					Fn(Fn(Int(Pl('e')), Fn(bind.type.inner, out)), out),
				),
				scope: [],
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
			type: Fn(Fn(Int(Pl('e')), inner), Ref(binding, inner)),
			scope: [],
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
			type: Fn(ref.type, Fn(Int(Pl('e')), ref.type.inner)),
			scope: [],
			name: 'unref',
		},
		ref,
	);
}

/**
 * Constructs a non-finite expression.
 */
export function nf(body: Expr): Expr {
	assertFn(body.type);
	const { domain, range: inner } = body.type;
	return app(
		{
			head: 'constant',
			type: Fn(body.type, Nf(domain, inner)),
			scope: [],
			name: 'nf',
		},
		body,
	);
}

/**
 * Deconstructs a non-finite expression.
 */
export function unnf(nf: Expr): Expr {
	assertNf(nf.type);
	return app(
		{
			head: 'constant',
			type: Fn(nf.type, Fn(nf.type.domain, nf.type.inner)),
			scope: [],
			name: 'unnf',
		},
		nf,
	);
}

/**
 * Projects the value returned by a deixis or speech act operation.
 */
export function andMap(op: Expr, project: Expr): Expr {
	assertDxOrAct(op.type);
	assertFn(project.type);
	const range = project.type.range;
	return app(
		app(
			{
				head: 'constant',
				type: Fn(
					op.type,
					Fn(Fn(op.type.inner, range), { head: op.type.head, inner: range }),
				),
				scope: [],
				name: 'and_map',
			},
			op,
		),
		project,
	);
}

/**
 * Sequences two context operations, with the second operation being dependent
 * on the value returned by the first.
 */
export function andThen(first: Expr, continuation: Expr): Expr {
	assertFn(continuation.type);
	const { domain, range } = continuation.type;
	assertDxOrAct(range);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(
					{ head: range.head, inner: domain },
					Fn(continuation.type, range),
				),
				scope: [],
				name: 'and_then',
			},
			first,
		),
		continuation,
	);
}

export function salient(inner: ExprType): Expr {
	return {
		head: 'constant',
		type: Dx(inner),
		scope: [],
		name: 'salient',
	};
}

export const bg: Expr = {
	head: 'constant',
	type: Fn(Act('()'), Act('()')),
	scope: [],
	name: 'bg',
};

export const not: Expr = {
	head: 'constant',
	type: Fn('t', 't'),
	scope: [],
	name: 'not',
};

export const and: Expr = {
	head: 'constant',
	type: Fn('t', Fn('t', 't')),
	scope: [],
	name: 'and',
};

export const or: Expr = {
	head: 'constant',
	type: Fn('t', Fn('t', 't')),
	scope: [],
	name: 'or',
};

export const implies: Expr = {
	head: 'constant',
	type: Fn('t', Fn('t', 't')),
	scope: [],
	name: 'implies',
};

export function equals(left: Expr, right: Expr): Expr {
	assertTypesCompatible(left.type, right.type);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(left.type, Fn(right.type, 't')),
				scope: [],
				name: 'equals',
			},
			left,
		),
		right,
	);
}

/**
 * Determines whether something is among a given plurality.
 */
export function among(el: Expr, pl: Expr): Expr {
	assertPl(pl.type);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(pl.type.inner, Fn(pl.type, 't')),
				scope: [],
				name: 'among',
			},
			el,
		),
		pl,
	);
}

/**
 * Determines whether an individual is animate.
 */
export const animate: Expr = {
	head: 'constant',
	type: Int(Fn('e', 't')),
	scope: [],
	name: 'animate',
};

/**
 * Picks out a salient accessibility relation on worlds.
 */
export const accessibility: Expr = {
	head: 'constant',
	type: Dx(Fn('s', Fn('s', 't'))),
	scope: [],
	name: 'accessibility',
};
