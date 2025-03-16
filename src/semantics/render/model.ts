import type { Expr, ExprType } from '../model';

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

interface Quantify extends ExprBase {
	head: 'quantify';
	q: 'lambda' | 'some' | 'every';
	body: RichExpr;
}

interface Apply extends ExprBase {
	head: 'apply';
	fn: RichExpr;
	arg: RichExpr;
}

interface Lexeme extends ExprBase {
	head: 'lexeme';
	name: string;
}

interface Quote extends ExprBase {
	head: 'quote';
	text: string;
}

interface Constant extends ExprBase {
	head: 'constant';
	name: (Expr & { head: 'constant' })['name'];
}

interface Subscript extends ExprBase {
	head: 'subscript';
	base: RichExpr;
	sub: RichExpr;
}

/**
 * A semantic expression with rich, human-readable syntax.
 */
export type RichExpr =
	| Variable
	| Quantify
	| Apply
	| Lexeme
	| Quote
	| Constant
	| Subscript;

export function toRichExpr(e: Expr): RichExpr {
	switch (e.head) {
		case 'variable':
		case 'lexeme':
		case 'quote':
		case 'constant':
			return e;
		case 'lambda':
			return { ...e, head: 'quantify', q: 'lambda', body: toRichExpr(e.body) };
		case 'apply':
			// Hide int/ref applications
			if (
				e.fn.head === 'constant' &&
				(e.fn.name === 'int' || e.fn.name === 'ref')
			)
				return { ...toRichExpr(e.arg), type: e.type };
			// Turn some/every into quantifiers
			if (
				e.fn.head === 'constant' &&
				(e.fn.name === 'some' || e.fn.name === 'every') &&
				e.arg.head === 'lambda'
			)
				return {
					...e,
					head: 'quantify',
					q: e.fn.name,
					body: toRichExpr(e.arg.body),
				};
			// Turn unint/unref into subscripts
			if (
				e.fn.head === 'apply' &&
				e.fn.fn.head === 'constant' &&
				(e.fn.fn.name === 'unint' || e.fn.fn.name === 'unref')
			)
				return {
					...e,
					head: 'subscript',
					base: toRichExpr(e.fn.arg),
					sub: toRichExpr(e.arg),
				};
			return { ...e, fn: toRichExpr(e.fn), arg: toRichExpr(e.arg) };
	}
}
