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

type Variable<Index extends number, C extends ExprType[]> = {
	head: 'variable';
	/**
	 * The De Bruijn index of the intended variable.
	 */
	index: Index;
	type: C[Index];
	context: C;
};

type Verb<C extends ExprType[]> = {
	head: 'verb';
	name: string;
	args: Expr<ExprType, C>[];
	event: Expr<'v', C>;
	world: Expr<'s', C>;
	type: 't';
	context: C;
};

type Lambda<
	Input extends ExprType,
	Output extends ExprType,
	C extends ExprType[],
> = {
	head: 'lambda';
	body: Expr<Output, [Input, ...C]>;
	restriction?: Expr<'t', [Input, ...C]>;
	type: [Input, Output];
	context: C;
};

type Apply<
	Input extends ExprType,
	Output extends ExprType,
	C extends ExprType[],
> = {
	head: 'apply';
	function: Expr<[Input, Output], C>;
	argument: Expr<Input, C>;
	type: Output;
	context: C;
};

type Presuppose<T extends ExprType, C extends ExprType[]> = {
	head: 'presuppose';
	body: Expr<T, C>;
	presupposition: Expr<'t', C>;
	type: T;
	context: C;
};

type Polarizer<Name extends string, C extends ExprType[]> = {
	head: 'polarizer';
	name: Name;
	body: Expr<'t', C>;
	type: 't';
	context: C;
};

type Quantifier<
	Name extends string,
	Domain extends ExprType,
	C extends ExprType[],
> = {
	head: 'quantifier';
	name: Name;
	body: Expr<'t', [Domain, ...C]>;
	restriction?: Expr<'t', [Domain, ...C]>;
	type: 't';
	context: C;
};

type Infix<
	Name extends string,
	Input extends ExprType,
	Output extends ExprType,
	C extends ExprType[],
> = {
	head: 'infix';
	name: Name;
	left: Expr<Input, C>;
	right: Expr<Input, C>;
	type: Output;
	context: C;
};

type Conjunction<Name extends string, C extends ExprType[]> = Infix<
	Name,
	't',
	't',
	C
>;

type Equals<T extends ExprType, C extends ExprType[]> = Infix<
	'equals',
	T,
	't',
	C
>;

type TimeRelation<Name extends string, C extends ExprType[]> = Infix<
	Name,
	'i',
	't',
	C
>;

type Constant<Name extends string, T extends ExprType, C extends ExprType[]> = {
	head: 'constant';
	name: Name;
	type: T;
	context: C;
};

type Role<Name extends string, C extends ExprType[]> = Constant<
	Name,
	['v', 'e'],
	C
>;

// A modal accessibility relation
type Accessibility<Name extends string, C extends ExprType[]> = Constant<
	Name,
	['s', ['s', 't']],
	C
>;

type Pronoun<Name extends string, C extends ExprType[]> = Constant<
	Name,
	'e',
	C
>;

/**
 * A semantic expression of type T, with free variables defined by the context
 * C, following De Bruijn indexing.
 */
// These 'extends any' conditions are necessary to stop TypeScript from falling
// into infinite recursion when evaluating this type
export type Expr<T extends ExprType, C extends ExprType[]> = T extends any
	? C extends any
		? {
				type: T;
				context: C;
		  } & (
				| Variable<number, C> // Sadly it's not feasible to infer a specific index
				| Verb<C>
				| (T extends [infer I extends ExprType, infer O extends ExprType]
						? Lambda<I, O, C>
						: never)
				| Apply<ExprType, T, C> // Ideally we would use an existential type here in place of ExprType
				| Presuppose<T, C>
				| Conjunction<'and', C>
				| Conjunction<'or', C>
				| Polarizer<'not', C>
				| Polarizer<'indeed', C>
				| Quantifier<'some', 'e', C>
				| Quantifier<'some', 'v', C>
				| Quantifier<'some', 's', C>
				| Quantifier<'every', 'e', C>
				| Quantifier<'every', 'v', C>
				| Quantifier<'every', 's', C>
				| Equals<'e', C> // Also ought to use an existential type
				| TimeRelation<'subinterval', C>
				| TimeRelation<'before', C>
				| TimeRelation<'after', C>
				| TimeRelation<'before_near', C>
				| TimeRelation<'after_near', C>
				| Infix<'roi', 'e', 'e', C>
				| Pronoun<'ji', C>
				| Pronoun<'suq', C>
				| Pronoun<'nhao', C>
				| Pronoun<'suna', C>
				| Pronoun<'nhana', C>
				| Pronoun<'umo', C>
				| Pronoun<'ime', C>
				| Pronoun<'suo', C>
				| Pronoun<'ama', C>
				| Role<'agent', C>
				| Accessibility<'she', C>
				| Accessibility<'ao', C>
				| Constant<'real_world', 's', C>
				| Constant<'inertia_worlds', ['s', ['s', ['i', 't']]], C>
				| Constant<'temporal_trace', ['v', 'i'], C>
				| Constant<'expected_start', ['v', 'i'], C>
				| Constant<'expected_end', ['v', 'i'], C>
				| Constant<'speech_time', 'i', C>
		  )
		: never
	: never;

/**
 * A semantic expression of any type, and with any number of free variables.
 */
export type AnyExpr = Expr<ExprType, ExprType[]>;

/**
 * A tree with denotations.
 */
export type DTree = { denotation: AnyExpr } & (Leaf | Branch<DTree>);
