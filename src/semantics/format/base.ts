import { Expr, KnownConstant, KnownInfix, KnownPolarizer } from '../model';

export type NameType = 'e' | 'v' | 'i' | 's' | 'fn';

export type Alphabets = Record<NameType, string[]>;

export const constantAlphabets: Alphabets = {
	e: ['a', 'b', 'c', 'd'],
	v: ['e'],
	i: ['t'],
	s: ['w'],
	fn: ['F', 'G', 'H'],
};

export const variableAlphabets: Alphabets = {
	e: ['x', 'y', 'z'],
	v: ['e'],
	i: ['t'],
	s: ['w'],
	fn: ['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
};

/**
 * Represents the 'id'th name available for variables/constants of type 'type'.
 */
export interface Name {
	readonly id: number;
	readonly type: NameType;
	readonly constant: boolean;
}

/**
 * A naming context to use when rendering an expression.
 */
export interface Names {
	readonly context: Name[];
	readonly nextVariableIds: Record<NameType, number>;
	readonly nextConstantIds: Record<NameType, number>;
}

export type Quantifier = (Expr & { head: 'quantifier' })['name'] | 'lambda';
export type Infix = KnownInfix['name'];
export type Polarizer = KnownPolarizer['name'];
export type Constant = KnownConstant['name'];

/**
 * Specification of a rendering format, such as plain text or LaTeX.
 */
export interface Format<T> {
	bracket: (e: T) => T;
	name: (name: Name) => T;
	verb: (name: string, args: T[], event: T, world: T) => T;
	symbolForQuantifier: (symbol: Quantifier) => T;
	quantifier: (symbol: T, name: T, body: T) => T;
	restrictedQuantifier: (symbol: T, name: T, restriction: T, body: T) => T;
	aspect: (infix: T, right: T) => T;
	eventCompound: (
		symbol: T,
		verbName: string,
		event: T,
		world: T,
		aspect: T,
		agent: T | undefined,
		args: T[],
		body: T | undefined,
	) => T;
	apply: (fn: T, argument: T) => T;
	presuppose: (body: T, presupposition: T) => T;
	let: (name: T, value: T, body: T) => T;
	symbolForInfix: (symbol: Infix) => T;
	infix: (symbol: T, left: T, right: T) => T;
	polarizer: (symbol: T, body: T) => T;
	symbolForConstant: (symbol: Constant) => T;
	quote: (text: string) => T;
}

export const formatName = (name: Name) => {
	const alphabets = name.constant ? constantAlphabets : variableAlphabets;
	const alphabet = alphabets[name.type];
	return (
		alphabet[name.id % alphabet.length] + "'".repeat(name.id / alphabet.length)
	);
};

export const fnFromMap =
	<const T extends string, U>(extension: Record<T, U>) =>
	(t: T): U =>
		extension[t];
