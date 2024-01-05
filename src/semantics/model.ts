import { Impossible } from '../error';
import { Branch, Leaf } from '../tree';
import { toPlainText, typesToPlainText, typeToPlainText } from './render';

/**
 * The possible types of semantic expressions.
 */
export type ExprType =
	| 'e' // Individual
	| 'v' // Event
	| 'i' // Time interval
	| 't' // Truth value
	| 's' // World
	| 'a' // Speech act
	| [ExprType, ExprType]; // Function

interface Variable {
	head: 'variable';
	type: ExprType;
	context: ExprType[];
	/**
	 * The De Bruijn index of the variable in the context.
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
	/**
	 * The De Bruijn index of the variable that is said to be "defined" by this
	 * presupposition.
	 */
	defines?: number;
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

type Animacy<Name extends string> = Constant<Name, ['e', 't']>;

type PropSpeechAct<Name extends string> = Constant<Name, [['s', 't'], 'a']>;

interface Quote {
	head: 'quote';
	type: 'e';
	context: ExprType[];
	text: string;
}

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
	| Quantifier<'every_sing'>
	| Quantifier<'every_cuml'>
	| Quantifier<'gen'>
	| Infix<'equals', 't'>
	| TimeRelation<'subinterval'>
	| TimeRelation<'before'>
	| TimeRelation<'after'>
	| TimeRelation<'before_near'>
	| TimeRelation<'after_near'>
	| Infix<'roi', 'e'>
	| Infix<'coevent', 't'>
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
	| Role<'subject'>
	| Accessibility<'she'>
	| Animacy<'animate'>
	| Animacy<'inanimate'>
	| Animacy<'abstract'>
	| Constant<'real_world', 's'>
	| Constant<'inertia_worlds', ['s', ['s', ['i', 't']]]>
	| Constant<'alternative', ['e', ['e', ['s', 't']]]>
	// TODO: all temporal features of events should have world parameters
	| Constant<'temporal_trace', ['v', 'i']>
	| Constant<'expected_start', ['v', 'i']>
	| Constant<'expected_end', ['v', 'i']>
	| Constant<'speech_time', 'i'>
	| PropSpeechAct<'assert'>
	| PropSpeechAct<'perform'>
	| PropSpeechAct<'wish'>
	| PropSpeechAct<'promise'>
	| PropSpeechAct<'permit'>
	| PropSpeechAct<'warn'>
	| Quote;

export type AnimacyClass = 'animate' | 'inanimate' | 'abstract' | 'descriptive';

export interface Binding {
	/**
	 * The De Bruijn index of the free variable in the relevant expression
	 * corresponding to this binding.
	 */
	index: number;
	/**
	 * Whether this binding originates from a subordinate clause.
	 */
	subordinate: boolean;
	/**
	 * The De Bruijn indices of the time interval variables associated with this
	 * binding.
	 */
	timeIntervals: number[];
}

/**
 * A summary of all the bindings originating from within a given subtree.
 *
 * Bindings are created by any node in the tree that conjures a new variable, or
 * otherwise represents something that could be referenced elsewhere in the
 * tree.
 *
 * For example, in "Sá duao nä jea jí tá", the DP "sá duao" binds the
 * variable duao, the descriptive animacy class, the head anaphor hụ́sa, and an
 * index associating it with its QP. Similarly, the DP "tá" binds the
 * descriptive animacy class, allowing its variable to be matched up with "sá
 * duao" during the composition process.
 *
 * It might seem counter-intuitive that even a simple reference like "tá" counts
 * as a binding, but this is what allows matching exophoric references to be
 * resolved to the same variable in a sentence like "Jea jí tá nûa tá".
 */
export interface Bindings {
	/**
	 * Bindings that can be abstracted away by a binding site of the given index.
	 */
	index: Map<number, Binding>;
	/**
	 * Bindings that can be referenced by a variable of the given name.
	 */
	variable: Map<string, Binding>;
	/**
	 * Bindings that can be referenced by an anaphoric pronoun of the given animacy
	 * class.
	 */
	animacy: Map<AnimacyClass, Binding>;
	/**
	 * Bindings that can be referenced by a head anaphor (hu-) for the given head.
	 */
	head: Map<string, Binding>;
	/**
	 * The binding associated with the resumptive pronoun (hóa).
	 */
	resumptive?: Binding;
	/**
	 * The binding associated with the covert resumptive pronoun (PRO).
	 */
	covertResumptive?: Binding;
}

export const noBindings: Bindings = {
	index: new Map(),
	variable: new Map(),
	animacy: new Map(),
	head: new Map(),
};

export function cloneBindings({
	index,
	variable,
	animacy,
	head,
	...rest
}: Bindings): Bindings {
	return {
		index: new Map(index),
		variable: new Map(variable),
		animacy: new Map(animacy),
		head: new Map(head),
		...rest,
	};
}

/**
 * A tree with denotations.
 */
export type DTree = (Leaf | Branch<DTree>) & {
	denotation: Expr | null;
	/**
	 * References to bindings originating from this subtree.
	 */
	bindings: Bindings;
};

/**
 * Determines whether the first type is a subtype of the second.
 */
export function subtype(t1: ExprType, t2: ExprType): boolean {
	if (typeof t1 === 'string' || typeof t2 === 'string') {
		return t1 === t2 || (t1 === 'v' && t2 === 'e');
	} else {
		return t1 === t2 || (subtype(t2[0], t1[0]) && subtype(t1[1], t2[1]));
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
	if (typeof t1 === 'string' || typeof t2 === 'string') {
		return t1 === t2;
	} else {
		return t1 === t2 || (typesEqual(t1[0], t2[0]) && typesEqual(t1[1], t2[1]));
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

export function contextsEqual(c1: ExprType[], c2: ExprType[]): boolean {
	return (
		c1 === c2 ||
		(c1.length === c2.length && c1.every((t, i) => subtype(t, c2[i])))
	);
}

export function assertContextsEqual(c1: ExprType[], c2: ExprType[]): void {
	if (!contextsEqual(c1, c2))
		throw new Impossible(
			`Contexts ${typesToPlainText(c1)} and ${typesToPlainText(
				c2,
			)} are not equal`,
		);
}

function assertInBounds(index: number, context: ExprType[]): void {
	if (index < 0 || index >= context.length)
		throw new Impossible(
			`Index ${index} out of bounds for context ${typesToPlainText(context)}`,
		);
}

/**
 * Constructor for variable expressions.
 */
export function v(index: number, context: ExprType[]): Expr {
	assertInBounds(index, context);
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
		assertSubtype(restrictionResult.type, 't');
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
	if (!Array.isArray(fn.type))
		throw new Impossible(`${toPlainText(fn)} is not a function`);
	const [inputType, outputType] = fn.type;
	assertSubtype(argument.type, inputType);
	assertContextsEqual(fn.context, argument.context);

	return { head: 'apply', type: outputType, context: fn.context, fn, argument };
}

export function verb(
	name: string,
	args: [] | [Expr] | [Expr, Expr],
	event: Expr,
	world: Expr,
): Expr {
	assertSubtype(event.type, 'v');
	assertSubtype(world.type, 's');
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

export function presuppose(
	body: Expr,
	presupposition: Expr,
	defines?: number,
): Expr {
	assertSubtype(presupposition.type, 't');
	assertContextsEqual(body.context, presupposition.context);
	if (defines !== undefined) assertInBounds(defines, body.context);

	return {
		head: 'presuppose',
		type: body.type,
		context: body.context,
		body,
		presupposition,
		defines,
	};
}

export function infix(
	name: (Expr & { head: 'infix' })['name'],
	type: (Expr & { head: 'infix' })['type'],
	left: Expr,
	right: Expr,
): Expr {
	assertContextsEqual(left.context, right.context);

	return {
		head: 'infix',
		type,
		context: left.context,
		name,
		left,
		right,
	} as Expr;
}

function conjunction(name: 'and' | 'or', left: Expr, right: Expr): Expr {
	assertSubtype(left.type, 't');
	assertSubtype(right.type, 't');
	return infix(name, 't', left, right);
}

export function and(left: Expr, right: Expr): Expr {
	return conjunction('and', left, right);
}

export function or(left: Expr, right: Expr): Expr {
	return conjunction('or', left, right);
}

export function polarizer(
	name: (Expr & { head: 'polarizer' })['name'],
	body: Expr,
): Expr {
	assertSubtype(body.type, 't');

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
	domain: ExprType,
	context: ExprType[],
	body: (context: ExprType[]) => Expr,
	restriction?: (context: ExprType[]) => Expr,
): Expr {
	const innerContext = [domain, ...context];
	const bodyResult = body(innerContext);
	assertSubtype(bodyResult.type, 't');
	assertContextsEqual(bodyResult.context, innerContext);

	let restrictionResult = undefined;
	if (restriction !== undefined) {
		restrictionResult = restriction(innerContext);
		assertSubtype(restrictionResult.type, 't');
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
	domain: ExprType,
	context: ExprType[],
	body: (context: ExprType[]) => Expr,
	restriction?: (context: ExprType[]) => Expr,
): Expr {
	return quantifier('some', domain, context, body, restriction);
}

export function every(
	domain: ExprType,
	context: ExprType[],
	body: (context: ExprType[]) => Expr,
	restriction?: (context: ExprType[]) => Expr,
): Expr {
	return quantifier('every', domain, context, body, restriction);
}

export function everySing(
	domain: ExprType,
	context: ExprType[],
	body: (context: ExprType[]) => Expr,
	restriction?: (context: ExprType[]) => Expr,
): Expr {
	return quantifier('every_sing', domain, context, body, restriction);
}

export function everyCuml(
	domain: ExprType,
	context: ExprType[],
	body: (context: ExprType[]) => Expr,
	restriction?: (context: ExprType[]) => Expr,
): Expr {
	return quantifier('every_cuml', domain, context, body, restriction);
}

export function gen(
	domain: ExprType,
	context: ExprType[],
	body: (context: ExprType[]) => Expr,
	restriction?: (context: ExprType[]) => Expr,
): Expr {
	return quantifier('gen', domain, context, body, restriction);
}

export function equals(left: Expr, right: Expr): Expr {
	assertTypesCompatible(left.type, right.type);
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
	assertSubtype(left.type, 'i');
	assertSubtype(right.type, 'i');
	return infix(name, 't', left, right);
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
	assertSubtype(left.type, 'e');
	assertSubtype(right.type, 'e');
	return infix('roi', 'e', left, right);
}

export function coevent(left: Expr, right: Expr): Expr {
	assertSubtype(left.type, 'v');
	assertSubtype(right.type, 'v');
	return infix('coevent', 't', left, right);
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

export function subject(context: ExprType[]): Expr {
	return role('subject', context);
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

function animacy(
	name: (Expr & { head: 'constant'; type: ['e', 't'] })['name'],
	context: ExprType[],
): Expr {
	return constant(name, ['e', 't'], context);
}

export function animate(context: ExprType[]): Expr {
	return animacy('animate', context);
}

export function inanimate(context: ExprType[]): Expr {
	return animacy('inanimate', context);
}

export function abstract(context: ExprType[]): Expr {
	return animacy('abstract', context);
}

export function realWorld(context: ExprType[]): Expr {
	return constant('real_world', 's', context);
}

export function inertiaWorlds(context: ExprType[]): Expr {
	return constant('inertia_worlds', ['s', ['s', ['i', 't']]], context);
}

export function alternative(context: ExprType[]): Expr {
	return constant('alternative', ['e', ['e', ['s', 't']]], context);
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

export function assert(context: ExprType[]): Expr {
	return constant('assert', [['s', 't'], 'a'], context);
}

export function perform(context: ExprType[]): Expr {
	return constant('perform', [['s', 't'], 'a'], context);
}

export function wish(context: ExprType[]): Expr {
	return constant('wish', [['s', 't'], 'a'], context);
}

export function promise(context: ExprType[]): Expr {
	return constant('promise', [['s', 't'], 'a'], context);
}

export function permit(context: ExprType[]): Expr {
	return constant('permit', [['s', 't'], 'a'], context);
}

export function warn(context: ExprType[]): Expr {
	return constant('warn', [['s', 't'], 'a'], context);
}

export function quote(text: string, context: ExprType[]): Expr {
	return { head: 'quote', type: 'e', context, text };
}
