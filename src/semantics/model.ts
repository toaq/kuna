import { Branch, Leaf } from '../tree';

/**
 * The possible types of semantic expressions.
 */
export type ExprType =
	| 'e' // Individual
	| 'v' // Event
	| 'i' // Time interval
	| 't' // Truth value
	| 's' // World
	| [ExprType, ExprType]; // Function

interface Variable {
	head: 'variable';
	type: ExprType;
	context: ExprType[];
	/**
	 * The De Bruijn index of the intended variable.
	 */
	index: number;
}

interface Verb {
	head: 'verb';
	type: 't';
	context: ExprType[];
	name: string;
	args: [] | [Expr] | [Expr, Expr];
	event: Expr;
	world: Expr;
}

interface Lambda {
	head: 'lambda';
	type: [ExprType, ExprType];
	context: ExprType[];
	body: Expr;
	restriction?: Expr;
}

interface Apply {
	head: 'apply';
	type: ExprType;
	context: ExprType[];
	fn: Expr;
	argument: Expr;
}

interface Presuppose {
	head: 'presuppose';
	type: ExprType;
	context: ExprType[];
	body: Expr;
	presupposition: Expr;
}

type Polarizer<Name extends string> = {
	head: 'polarizer';
	type: 't';
	context: ExprType[];
	name: Name;
	body: Expr;
};

interface Quantifier<Name extends string> {
	head: 'quantifier';
	type: 't';
	context: ExprType[];
	name: Name;
	body: Expr;
	restriction?: Expr;
}

interface Infix<Name extends string, Output extends ExprType> {
	head: 'infix';
	type: Output;
	context: ExprType[];
	name: Name;
	left: Expr;
	right: Expr;
}

type Conjunction<Name extends string> = Infix<Name, 't'>;

type TimeRelation<Name extends string> = Infix<Name, 't'>;

interface Constant<Name extends string, T extends ExprType> {
	head: 'constant';
	type: T;
	context: ExprType[];
	name: Name;
}

type Role<Name extends string> = Constant<Name, ['v', ['s', 'e']]>;

// A modal accessibility relation
type Accessibility<Name extends string> = Constant<Name, ['s', ['s', 't']]>;

type Pronoun<Name extends string> = Constant<Name, 'e'>;

/**
 * A semantic expression. The field 'type' represents the expression's type,
 * while the field 'context' represents the types of variables in scope, ordered
 * by De Bruijn indexing.
 */
export type Expr =
	| Variable
	| Verb
	| Lambda
	| Apply
	| Presuppose
	| Conjunction<'and'>
	| Conjunction<'or'>
	| Polarizer<'not'>
	| Polarizer<'indeed'>
	| Quantifier<'some'>
	| Quantifier<'every'>
	| Infix<'equals', 't'>
	| TimeRelation<'subinterval'>
	| TimeRelation<'before'>
	| TimeRelation<'after'>
	| TimeRelation<'before_near'>
	| TimeRelation<'after_near'>
	| Infix<'roi', 'e'>
	| Pronoun<'ji'>
	| Pronoun<'suq'>
	| Pronoun<'nhao'>
	| Pronoun<'suna'>
	| Pronoun<'nhana'>
	| Pronoun<'umo'>
	| Pronoun<'ime'>
	| Pronoun<'suo'>
	| Pronoun<'ama'>
	| Role<'agent'>
	| Accessibility<'she'>
	| Accessibility<'ao'>
	| Constant<'real_world', 's'>
	| Constant<'inertia_worlds', ['s', ['s', ['i', 't']]]>
	| Constant<'temporal_trace', ['v', 'i']>
	| Constant<'expected_start', ['v', 'i']>
	| Constant<'expected_end', ['v', 'i']>
	| Constant<'speech_time', 'i'>;

/**
 * A tree with denotations.
 */
export type DTree = { denotation: Expr | null } & (Leaf | Branch<DTree>);

export function typesEqual(t1: ExprType, t2: ExprType): boolean {
	if (typeof t1 === 'string' || typeof t2 === 'string') {
		return t1 === t2;
	} else {
		return t1 === t2 || (typesEqual(t1[0], t2[0]) && typesEqual(t1[1], t2[1]));
	}
}

export function assertTypesEqual(t1: ExprType, t2: ExprType): void {
	if (!typesEqual(t1, t2))
		throw new Error(`Types ${t1} and ${t2} are not equal`);
}

export function contextsEqual(c1: ExprType[], c2: ExprType[]): boolean {
	return (
		c1 === c2 ||
		(c1.length === c2.length && c1.every((t, i) => typesEqual(t, c2[i])))
	);
}

export function assertContextsEqual(c1: ExprType[], c2: ExprType[]): void {
	if (!contextsEqual(c1, c2))
		throw new Error(`Contexts ${c1} and ${c2} are not equal`);
}

/**
 * Constructor for variable expressions.
 */
export function v(index: number, context: ExprType[]): Expr {
	if (index >= context.length)
		throw new Error(`Index ${index} out of bounds for context ${context}`);

	return { head: 'variable', type: context[index], context, index };
}

/**
 * Constructor for lambda expressions.
 */
export function λ(
	inputType: ExprType,
	context: ExprType[],
	body: (context: ExprType[]) => Expr,
	restriction?: (context: ExprType[]) => Expr,
): Expr {
	const innerContext = [inputType, ...context];
	const bodyResult = body(innerContext);
	assertContextsEqual(bodyResult.context, innerContext);

	let restrictionResult = undefined;
	if (restriction !== undefined) {
		restrictionResult = restriction(innerContext);
		assertTypesEqual(restrictionResult.type, 't');
		assertContextsEqual(restrictionResult.context, innerContext);
	}

	return {
		head: 'lambda',
		type: [inputType, bodyResult.type],
		context,
		body: bodyResult,
		restriction: restrictionResult,
	};
}

/**
 * Constructor for function application expressions.
 */
export function app(fn: Expr, argument: Expr): Expr {
	if (!Array.isArray(fn.type)) throw new Error(`${fn} is not a function`);
	const [inputType, outputType] = fn.type;
	assertTypesEqual(inputType, argument.type);
	assertContextsEqual(fn.context, argument.context);

	return { head: 'apply', type: outputType, context: fn.context, fn, argument };
}

export function verb(
	name: string,
	args: [] | [Expr] | [Expr, Expr],
	event: Expr,
	world: Expr,
): Expr {
	assertTypesEqual(event.type, 'v');
	assertTypesEqual(world.type, 's');
	for (const arg of args) assertContextsEqual(arg.context, event.context);
	assertContextsEqual(event.context, world.context);

	return {
		head: 'verb',
		type: 't',
		context: event.context,
		name,
		args,
		event,
		world,
	};
}

export function presuppose(body: Expr, presupposition: Expr): Expr {
	assertTypesEqual(presupposition.type, 't');
	assertContextsEqual(body.context, presupposition.context);

	return {
		head: 'presuppose',
		type: body.type,
		context: body.context,
		body,
		presupposition,
	};
}

export function infix(
	name: (Expr & { head: 'infix' })['name'],
	inputType: ExprType,
	outputType: (Expr & { head: 'infix' })['type'],
	left: Expr,
	right: Expr,
): Expr {
	assertTypesEqual(left.type, inputType);
	assertTypesEqual(right.type, inputType);
	assertContextsEqual(left.context, right.context);

	return {
		head: 'infix',
		type: outputType,
		context: left.context,
		name,
		left,
		right,
	} as Expr;
}

function conjunction(name: 'and' | 'or', left: Expr, right: Expr): Expr {
	return infix(name, 't', 't', left, right);
}

export function and(left: Expr, right: Expr): Expr {
	return conjunction('and', left, right);
}

export function or(left: Expr, right: Expr): Expr {
	return conjunction('and', left, right);
}

export function polarizer(
	name: (Expr & { head: 'polarizer' })['name'],
	body: Expr,
): Expr {
	assertTypesEqual(body.type, 't');

	return { head: 'polarizer', type: 't', context: body.context, name, body };
}

export function not(body: Expr): Expr {
	return polarizer('not', body);
}

export function indeed(body: Expr): Expr {
	return polarizer('indeed', body);
}

export function quantifier(
	name: (Expr & { head: 'quantifier' })['name'],
	domain: 'e' | 'v' | 's',
	context: ExprType[],
	body: (context: ExprType[]) => Expr,
	restriction?: (context: ExprType[]) => Expr,
): Expr {
	const innerContext = [domain, ...context];
	const bodyResult = body(innerContext);
	assertTypesEqual(bodyResult.type, 't');
	assertContextsEqual(bodyResult.context, innerContext);

	let restrictionResult = undefined;
	if (restriction !== undefined) {
		restrictionResult = restriction(innerContext);
		assertTypesEqual(restrictionResult.type, 't');
		assertContextsEqual(restrictionResult.context, innerContext);
	}

	return {
		head: 'quantifier',
		type: 't',
		context,
		name,
		body: bodyResult,
		restriction: restrictionResult,
	};
}

export function some(
	domain: 'e' | 'v' | 's',
	context: ExprType[],
	body: (context: ExprType[]) => Expr,
	restriction?: (context: ExprType[]) => Expr,
): Expr {
	return quantifier('some', domain, context, body, restriction);
}

export function every(
	domain: 'e' | 'v' | 's',
	context: ExprType[],
	body: (context: ExprType[]) => Expr,
	restriction?: (context: ExprType[]) => Expr,
): Expr {
	return quantifier('every', domain, context, body, restriction);
}

export function equals(left: Expr, right: Expr): Expr {
	assertTypesEqual(left.type, right.type);
	assertContextsEqual(left.context, right.context);

	return {
		head: 'infix',
		type: 't',
		context: left.context,
		name: 'equals',
		left,
		right,
	};
}

function timeRelation(
	name: 'subinterval' | 'before' | 'after' | 'before_near' | 'after_near',
	left: Expr,
	right: Expr,
): Expr {
	return infix(name, 'i', 't', left, right);
}

export function subinterval(left: Expr, right: Expr): Expr {
	return timeRelation('subinterval', left, right);
}

export function before(left: Expr, right: Expr): Expr {
	return timeRelation('before', left, right);
}

export function after(left: Expr, right: Expr): Expr {
	return timeRelation('after', left, right);
}

export function beforeNear(left: Expr, right: Expr): Expr {
	return timeRelation('before_near', left, right);
}

export function afterNear(left: Expr, right: Expr): Expr {
	return timeRelation('after_near', left, right);
}

export function roi(left: Expr, right: Expr): Expr {
	return infix('roi', 'e', 'e', left, right);
}

export function constant(
	name: (Expr & { head: 'constant' })['name'],
	type: (Expr & { head: 'constant' })['type'],
	context: ExprType[],
): Expr {
	return { head: 'constant', type, context, name } as Expr;
}

function pronoun(
	name: (Expr & { head: 'constant'; type: 'e' })['name'],
	context: ExprType[],
): Expr {
	return constant(name, 'e', context);
}

export function ji(context: ExprType[]): Expr {
	return pronoun('ji', context);
}

export function suq(context: ExprType[]): Expr {
	return pronoun('suq', context);
}

export function nhao(context: ExprType[]): Expr {
	return pronoun('nhao', context);
}

export function suna(context: ExprType[]): Expr {
	return pronoun('suna', context);
}

export function nhana(context: ExprType[]): Expr {
	return pronoun('nhana', context);
}

export function umo(context: ExprType[]): Expr {
	return pronoun('umo', context);
}

export function ime(context: ExprType[]): Expr {
	return pronoun('ime', context);
}

export function suo(context: ExprType[]): Expr {
	return pronoun('suo', context);
}

export function ama(context: ExprType[]): Expr {
	return pronoun('ama', context);
}

function role(
	name: (Expr & { head: 'constant'; type: ['v', ['s', 'e']] })['name'],
	context: ExprType[],
): Expr {
	return constant(name, ['v', ['s', 'e']], context);
}

export function agent(context: ExprType[]): Expr {
	return role('agent', context);
}

function accessibility(
	name: (Expr & { head: 'constant'; type: ['s', ['s', 't']] })['name'],
	context: ExprType[],
): Expr {
	return constant(name, ['s', ['s', 't']], context);
}

export function she(context: ExprType[]): Expr {
	return accessibility('she', context);
}

export function ao(context: ExprType[]): Expr {
	return accessibility('ao', context);
}

export function realWorld(context: ExprType[]): Expr {
	return constant('real_world', 's', context);
}

export function inertiaWorlds(context: ExprType[]): Expr {
	return constant('inertia_worlds', ['s', ['s', ['i', 't']]], context);
}

export function temporalTrace(context: ExprType[]): Expr {
	return constant('temporal_trace', ['v', 'i'], context);
}

export function expectedStart(context: ExprType[]): Expr {
	return constant('expected_start', ['v', 'i'], context);
}

export function expectedEnd(context: ExprType[]): Expr {
	return constant('expected_end', ['v', 'i'], context);
}

export function speechTime(context: ExprType[]): Expr {
	return constant('speech_time', 'i', context);
}
