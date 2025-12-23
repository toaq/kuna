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
		case 'covert resumptive':
			return b2.type === 'covert resumptive';
		case 'gap':
			return b2.type === 'gap';
		case 'subject':
			return b2.type === 'subject';
		case 'reflexive':
			return b2.type === 'reflexive';
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

export function Indef(domain: ExprType, inner: ExprType): ExprType {
	return { head: 'indef', domain, inner };
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
		case 'indef':
			return (
				t2.head === 'indef' &&
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
		case 'indef':
			return t2.head === 'indef' && typesEqual(t1.inner, t2.inner);
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

export function assertIndef(
	type: ExprType,
): asserts type is { head: 'indef'; inner: ExprType; domain: ExprType } {
	if (typeof type === 'string' || type.head !== 'indef')
		throw new Impossible(
			`${typeToPlainText(type)} is not a indefinite reference type`,
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
			description: 'Constructs an intension.',
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
			description: 'Deconstructs an intension.',
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
			type: Fn(
				Fn(Fn(inner, Int(Fn('v', 't'))), Int(Fn('v', 't'))),
				Cont(inner),
			),
			scope: [],
			name: 'cont',
			description: 'Constructs a continuation.',
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
			type: Fn(
				cont.type,
				Fn(Fn(cont.type.inner, Int(Fn('v', 't'))), Int(Fn('v', 't'))),
			),
			scope: [],
			name: 'uncont',
			description: 'Deconstructs a continuation.',
		},
		cont,
	);
}

/**
 * Creates a plurality containing every value of a given type.
 */
export function universe(inner: ExprType): Expr {
	return {
		head: 'constant',
		type: Pl(inner),
		scope: [],
		name: 'universe',
		description:
			'The plurality containing every possible value of a given type.',
	};
}

/**
 * Creates a plurality containing a single element.
 */
export function single(element: Expr): Expr {
	return app(
		{
			head: 'constant',
			type: Fn(element.type, Pl(element.type)),
			scope: [],
			name: 'single',
			description: 'Creates a plurality containing a single element.',
		},
		element,
	);
}

/**
 * Creates a plurality containing all elements found in the left plurality
 * and/or the right plurality.
 */
export function union(left: Expr, right: Expr): Expr {
	assertPl(left.type);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(left.type, Fn(left.type, left.type)),
				scope: [],
				name: 'union',
				description:
					'Creates a plurality containing all elements found in the left plurality and/or the right plurality.',
			},
			left,
		),
		right,
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
				description:
					'Projects each element of a plurality with a given function.',
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
				description:
					'Projects each element of a plurality with a given function and takes the union of all projections.',
			},
			pl,
		),
		project,
	);
}

/**
 * Filters the elements of a plurality by a given predicate.
 */
export function filter(pl: Expr, predicate: Expr): Expr {
	assertPl(pl.type);
	return app(
		app(
			{
				head: 'constant',
				type: Fn(pl.type, Fn(Fn(pl.type.inner, 't'), pl.type)),
				scope: [],
				name: 'filter',
				description:
					'Filters the elements of a plurality, keeping only the elements that match a given predicate.',
			},
			pl,
		),
		predicate,
	);
}

/**
 * Constructs an indefinite reference.
 */
export function indef(restriction: Expr, body: Expr): Expr {
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
						Indef(restriction.type.domain, body.type.range),
					),
				),
				scope: [],
				name: 'indef',
				description:
					'Constructs an indefinite reference, taking a restriction and a body as arguments.',
			},
			restriction,
		),
		body,
	);
}

/**
 * Deconstructs an indefinite reference.
 */
export function unindef(indef: Expr, project: Expr): Expr {
	assertIndef(indef.type);
	assertFn(project.type);
	assertFn(project.type.range);
	const out = project.type.range.range;
	return app(
		app(
			{
				head: 'constant',
				type: Fn(
					indef.type,
					Fn(
						Fn(
							Fn(indef.type.domain, 't'),
							Fn(Fn(indef.type.domain, indef.type.inner), out),
						),
						out,
					),
				),
				scope: [],
				name: 'unindef',
				description: 'Deconstructs an indefinite reference.',
			},
			indef,
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
				description:
					'Constructs a question, taking a restriction and a body as arguments.',
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
				description: 'Deconstructs a question.',
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
			description:
				'Determines whether something in the domain satisfies a given predicate.',
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
			description:
				'Determines whether everything in the domain satisfies a given predicate.',
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
				description: 'Constructs a pair of meanings.',
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
				description: 'Deconstructs a pair of meanings.',
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
				description: 'Constructs an expression that binds a variable.',
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
				description: 'Deconstructs an expression that binds a variable.',
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
			description: 'Constructs an expression that references a variable.',
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
			description: 'Deconstructs an expression that references a variable.',
		},
		ref,
	);
}

/**
 * Lifts a value into a deixis or speech act operation that does nothing.
 */
export function pure(e: Expr, head: 'dx' | 'act'): Expr {
	const dxDescription =
		'Lifts a value into a deixis operation that does nothing.';
	const actDescription = 'Lifts a value into a speech act that does nothing.';
	return app(
		{
			head: 'constant',
			type: Fn(e.type, { head, inner: e.type }),
			scope: [],
			name: 'pure',
			description: head === 'dx' ? dxDescription : actDescription,
		},
		e,
	);
}

/**
 * Projects the value returned by a deixis or speech act operation.
 */
export function andMap(op: Expr, project: Expr): Expr {
	const dxDescription = 'Projects the value returned by a deixis operation.';
	const actDescription = 'Projects the value returned by a speech act.';
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
				description: op.type.head === 'dx' ? dxDescription : actDescription,
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
	const dxDescription =
		'Sequences two deixis operations, with the second operation being dependent on the value returned by the first.';
	const actDescription =
		'Sequences two speech acts, with the second speech act being dependent on the value returned by the first.';
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
				description: range.head === 'dx' ? dxDescription : actDescription,
			},
			first,
		),
		continuation,
	);
}

/**
 * Picks out a salient value from deictic context.
 */
export function salient(inner: ExprType): Expr {
	return {
		head: 'constant',
		type: Dx(inner),
		scope: [],
		name: 'salient',
		description: 'Picks out a salient value from the deictic context.',
	};
}

/**
 * Indicates who the current addressees are within the deictic context.
 */
export const address: Expr = {
	head: 'constant',
	type: Fn(Pl('e'), Dx('()')),
	scope: [],
	name: 'address',
	description:
		'Indicates who the current addressees are within the deictic context.',
};

/**
 * Evaluates deictic references relative to a given topic.
 */
export function topic(inner: ExprType): Expr {
	return {
		head: 'constant',
		type: Fn(Pl('e'), Fn(Dx(inner), Dx(inner))),
		scope: [],
		name: 'topic',
		description: 'Evaluates deictic references relative to a given topic.',
	};
}

/**
 * Backgrounds a speech act, indicating that its content is not at-issue.
 */
export const bg: Expr = {
	head: 'constant',
	type: Fn(Act('()'), Act('()')),
	scope: [],
	name: 'bg',
	description:
		'Backgrounds a speech act, indicating that its content is not at-issue.',
};

/**
 * Speech act claiming that there is a certain contrast between the two
 * arguments.
 */
export function contrast(left: Expr, right: Expr): Expr {
	return app(
		app(
			{
				head: 'constant',
				type: Fn(left.type, Fn(left.type, Act('()'))),
				scope: [],
				name: 'contrast',
				description:
					'Claims that there is a certain contrast between the two arguments.',
			},
			left,
		),
		right,
	);
}

/**
 * Asks whether one is in the position to produce a given speech act.
 */
export const ask: Expr = {
	head: 'constant',
	type: Fn(Act('()'), Act('()')),
	scope: [],
	name: 'ask',
	description:
		'Asks whether one is in the position to produce a given speech act.',
};

/**
 * Expresses empathy by acknowledging that one is in the position to produce a
 * given speech act.
 */
export const empathize: Expr = {
	head: 'constant',
	type: Fn(Act('()'), Act('()')),
	scope: [],
	name: 'empathize',
	description:
		'Expresses empathy by acknowledging that one is in the position to produce a given speech act.',
};

export const unit: Expr = {
	head: 'constant',
	type: '()',
	scope: [],
	name: 'unit',
	description: 'A value with no meaningful content.',
};

export const trueExpr: Expr = {
	head: 'constant',
	type: 't',
	scope: [],
	name: 'true',
	description: 'A constant truth value.',
};

export const falseExpr: Expr = {
	head: 'constant',
	type: 't',
	scope: [],
	name: 'false',
	description: 'A constant truth value.',
};

export const not: Expr = {
	head: 'constant',
	type: Fn('t', 't'),
	scope: [],
	name: 'not',
	description: 'Negates a truth value.',
};

export const and: Expr = {
	head: 'constant',
	type: Fn('t', Fn('t', 't')),
	scope: [],
	name: 'and',
	description: 'Logical and; requires both truth values to be true.',
};

export const or: Expr = {
	head: 'constant',
	type: Fn('t', Fn('t', 't')),
	scope: [],
	name: 'or',
	description: 'Logical or; requires at least one truth value to be true.',
};

export const xor: Expr = {
	head: 'constant',
	type: Fn('t', Fn('t', 't')),
	scope: [],
	name: 'xor',
	description: 'Exclusive or; requires exactly one truth value to be true.',
};

export const implies: Expr = {
	head: 'constant',
	type: Fn('t', Fn('t', 't')),
	scope: [],
	name: 'implies',
	description:
		'Material implication; requires the second truth value to be true in case the first is true.',
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
				description: 'Determines whether two values are extensionally equal.',
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
				description: 'Determines whether something is among a given plurality.',
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
	description: 'Determines whether an individual is animate.',
};

/**
 * Sums two events together, returning the event that encompasses them both.
 */
export const sum: Expr = {
	head: 'constant',
	type: Fn('v', Fn('v', 'v')),
	scope: [],
	name: 'sum',
	description:
		'Sums two events together, returning the event that encompasses them both.',
};

/**
 * Negates an event predicate P, returning the event predicate which holds true
 * of events representing the non-existence of any P events.
 */
export const neg: Expr = {
	head: 'constant',
	type: Fn(Int(Fn('v', 't')), Int(Fn('v', 't'))),
	scope: [],
	name: 'neg',
	description:
		'Negates an event predicate 𝑃, returning the event predicate which holds true of events representing the non-existence of any 𝑃 events.',
};

/**
 * Gets the temporal trace of an event.
 */
export const trace: Expr = {
	head: 'constant',
	type: Int(Fn('v', 'i')),
	scope: [],
	name: 'trace',
	description: 'Gets the temporal trace of an event.',
};

/**
 * Determines whether two events overlap each other (that is, whether their
 * temporal traces overlap and they share a common sub-event).
 */
export const overlap: Expr = {
	head: 'constant',
	type: Int(Fn('v', Fn('v', 't'))),
	scope: [],
	name: 'overlap',
	description:
		'Determines whether two events overlap each other (that is, whether their temporal traces overlap and they share a common sub-event).',
};

/**
 * Determines whether one time interval lies fully within another interval.
 */
export const subinterval: Expr = {
	head: 'constant',
	type: Fn('i', Fn('i', 't')),
	scope: [],
	name: 'subinterval',
	description:
		'Determines whether one time interval lies fully within another interval.',
};

/**
 * Picks out a salient accessibility relation on worlds.
 */
export const accessibility: Expr = {
	head: 'constant',
	type: Dx(Fn('s', Fn('s', 't'))),
	scope: [],
	name: 'accessibility',
	description: 'Picks out a salient accessibility relation on worlds.',
};
