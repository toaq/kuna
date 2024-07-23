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
