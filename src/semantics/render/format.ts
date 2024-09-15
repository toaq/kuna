import type { ExprType } from '../model';

export type Associativity = 'left' | 'right' | 'any' | 'none';

interface Token<Out> {
	type: 'token';
	content: Out;
}

interface Join<Out> {
	type: 'join';
	precedence: number;
	associativity: Associativity;
	parts: Render<Out>[];
}

export type Render<Out> = Token<Out> | Join<Out>;

export function token<T>(content: T): Render<T> {
	return { type: 'token', content };
}

export function join<T>(
	precedence: number,
	associativity: Associativity,
	parts: Render<T>[],
): Render<T> {
	return { type: 'join', precedence, associativity, parts };
}

export abstract class Renderer<In, Out> {
	/**
	 * Renders a subexpression.
	 */
	protected abstract sub(input: In): Render<Out>;

	/**
	 * Wraps an expression in brackets.
	 */
	protected abstract bracket(r: Render<Out>): Render<Out>;

	/**
	 * Joins a sequence of tokens together.
	 */
	protected abstract join(tokens: Out[]): Out;

	private bracketAll(r: Render<Out>): Render<Out> {
		if (r.type === 'token') return r;

		return {
			...r,
			parts: r.parts.map((part, i) => {
				if (part.type === 'token') return part;

				const sub = this.bracketAll(part);
				if (part.precedence > r.precedence || (i > 0 && i < r.parts.length - 1))
					return sub;
				if (part.precedence < r.precedence) return this.bracket(sub);
				if (r.associativity === 'left' && i === 0) return sub;
				if (r.associativity === 'right' && i === r.parts.length - 1) return sub;
				if (r.associativity === 'any') return sub;
				return this.bracket(sub);
			}),
		};
	}

	private tokens(r: Render<Out>): Out[] {
		return r.type === 'token'
			? [r.content]
			: r.parts.flatMap(part => this.tokens(part));
	}

	/**
	 * Renders an expression.
	 */
	render(input: In): Out {
		const raw = this.sub(input);
		const bracketed = this.bracketAll(raw);
		return this.join(this.tokens(bracketed));
	}
}

export type NameType = 'e' | 'v' | 'i' | 's' | 'exotic';

export const alphabets: Record<NameType, string[]> = {
	e: ['a', 'b', 'c', 'd'],
	v: ['e'],
	i: ['t'],
	s: ['w'],
	exotic: ['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
};

/**
 * Represents the 'id'th name available for variables of type 'type'.
 */
export interface Name {
	readonly id: number;
	readonly type: NameType;
}

/**
 * A naming context to use when rendering an expression.
 */
export interface Names {
	readonly scope: Name[];
	readonly nextIds: Record<NameType, number>;
}

export const noNames: Names = {
	scope: [],
	nextIds: {
		e: 0,
		v: 0,
		i: 0,
		s: 0,
		exotic: 0,
	},
};

export function getNameType(type: ExprType): NameType {
	return typeof type === 'string' && type !== 't' && type !== '1'
		? type
		: 'exotic';
}

/**
 * Adds a new name of type 'type' to the given naming context.
 */
export function addName(type: ExprType, { scope, nextIds }: Names): Names {
	const nameType = getNameType(type);
	const alphabetSize = alphabets[nameType].length;

	let id = nextIds[nameType];
	// If this name is already taken, try the same name one alphabetSize later
	while (scope.some(n => n.type === type && n.id === id)) id += alphabetSize;

	const name = { id, type: nameType };
	return {
		scope: [name, ...scope],
		nextIds: { ...nextIds, [nameType]: nextIds[nameType] + 1 },
	};
}
