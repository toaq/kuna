import { bare } from '../../morphology/tokenize';
import type { ExprType } from '../types';

export type Associativity = 'left' | 'right' | 'any' | 'none';

interface Token<Out> {
	type: 'token';
	content: Out;
	exprType?: ExprType;
}

interface Join<Out> {
	type: 'join';
	precedence: number;
	associativity: Associativity;
	parts: Render<Out>[];
	exprType?: ExprType;
}

interface Wrap<Out> {
	type: 'wrap';
	precedence: number | null;
	wrapper: (inner: Out) => Out;
	inner: Render<Out>;
	exprType?: ExprType;
}

export type Render<Out> = Token<Out> | Join<Out> | Wrap<Out>;

export function token<Out>(content: Out): Token<Out> {
	return { type: 'token', content };
}

export function join<Out>(
	precedence: number,
	associativity: Associativity,
	parts: Render<Out>[],
): Join<Out> {
	return { type: 'join', precedence, associativity, parts };
}

export function wrap<Out>(
	precedence: number | null,
	wrapper: (inner: Out) => Out,
	inner: Render<Out>,
): Wrap<Out> {
	return { type: 'wrap', precedence, wrapper, inner };
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

	private needsBrackets(r: Join<Out>, part: Render<Out>, i: number): boolean {
		if (part.type === 'token') return false;
		if (part.type === 'wrap' && part.precedence === null)
			return this.needsBrackets(r, part.inner, i);

		if (part.precedence! > r.precedence || (i > 0 && i < r.parts.length - 1))
			return false;
		if (part.precedence! < r.precedence) return true;
		if (r.associativity === 'left' && i === 0) return false;
		if (r.associativity === 'right' && i === r.parts.length - 1) return false;
		if (r.associativity === 'any') return false;
		return true;
	}

	protected bracketAll(r: Render<Out>): Render<Out> {
		switch (r.type) {
			case 'token':
				return r;
			case 'join':
				return {
					...r,
					parts: r.parts.map((part, i) => {
						const sub = this.bracketAll(part);
						return this.needsBrackets(r, part, i) ? this.bracket(sub) : sub;
					}),
				};
			case 'wrap':
				return { ...r, inner: this.bracketAll(r.inner) };
		}
	}

	private tokens(r: Render<Out>): Out[] {
		switch (r.type) {
			case 'token':
				return [r.content];
			case 'join':
				return r.parts.flatMap(part => this.tokens(part));
			case 'wrap':
				return [r.wrapper(this.join(this.tokens(r.inner)))];
		}
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
	e: ['𝑎', '𝑏', '𝑐', '𝑑'],
	v: ['𝑒'],
	i: ['𝑡'],
	s: ['𝑤'],
	exotic: Array.from({ length: 26 }, (_, i) =>
		String.fromCodePoint(0x1d434 + i),
	),
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
		exotic: 15, // Start at P
	},
};

export function getNameType(type: ExprType): NameType {
	return typeof type === 'string' && type !== 't' && type !== '()'
		? type
		: 'exotic';
}

function bindingLetterIndex(word: string): number | undefined {
	if (word) {
		const i = bare(word.toLowerCase())
			.replace('ı', 'i')
			.replace('ꝡ', 'v')
			.codePointAt(0);
		if (i && i >= 0x61 && i <= 0x7a) return i - 0x61;
	}
	return undefined;
}

/**
 * Adds names for all variables in scope to the given naming context.
 */
export function addNames(
	scope: ExprType[],
	{ scope: prevScope, nextIds: prevNextIds }: Names,
	word?: string,
): Names {
	const newScope = [...prevScope];
	const newNextIds = { ...prevNextIds };

	for (let i = scope.length - 1; i >= 0; i--) {
		const type = scope[i];
		const nameType = getNameType(type);
		const alphabetSize = alphabets[nameType].length;

		// Try to pick a nice letter for the binding; default to P, Q, R...
		let id: number | undefined;
		if (word && nameType === 'exotic') id ??= bindingLetterIndex(word);
		id ??= newNextIds[nameType]++;

		// If this name is already taken, try the same name one alphabetSize later
		while (newScope.some(n => n.type === nameType && n.id === id))
			id += alphabetSize;

		newScope.unshift({ id, type: nameType });
	}

	return { scope: newScope, nextIds: newNextIds };
}
