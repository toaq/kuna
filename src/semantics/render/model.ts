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

interface Infix extends ExprBase {
	head: 'infix';
	op: 'among' | 'and' | 'implies' | 'equals';
	left: RichExpr;
	right: RichExpr;
}

interface Subscript extends ExprBase {
	head: 'subscript';
	base: RichExpr;
	sub: RichExpr;
}

interface Do extends ExprBase {
	head: 'do';
	source: RichExpr;
	result: RichExpr;
	pure: boolean;
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

/**
 * A semantic expression with rich, human-readable syntax.
 */
export type RichExpr =
	| Variable
	| Quantify
	| Apply
	| Infix
	| Subscript
	| Do
	| Lexeme
	| Quote
	| Constant;

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
			// Hide int/cont/uncont/ref/unref applications
			if (
				e.fn.head === 'constant' &&
				(e.fn.name === 'int' ||
					e.fn.name === 'cont' ||
					e.fn.name === 'uncont' ||
					e.fn.name === 'ref' ||
					e.fn.name === 'unref')
			)
				return { ...toRichExpr(e.arg), type: e.type };

			// Quantifier notation
			if (
				e.fn.head === 'constant' &&
				(e.fn.name === 'some' || e.fn.name === 'every') &&
				e.arg.head === 'lambda'
			)
				return {
					type: e.type,
					scope: e.scope,
					head: 'quantify',
					q: e.fn.name,
					body: toRichExpr(e.arg.body),
				};

			// Infix notation
			if (
				e.fn.head === 'apply' &&
				e.fn.fn.head === 'constant' &&
				(e.fn.fn.name === 'among' ||
					e.fn.fn.name === 'and' ||
					e.fn.fn.name === 'implies' ||
					e.fn.fn.name === 'equals')
			)
				return {
					type: e.type,
					scope: e.scope,
					head: 'infix',
					op: e.fn.fn.name,
					left: toRichExpr(e.fn.arg),
					right: toRichExpr(e.arg),
				};

			// Subscript notation
			if (
				e.fn.head === 'apply' &&
				e.fn.fn.head === 'constant' &&
				e.fn.fn.name === 'unint'
			)
				return {
					type: e.type,
					scope: e.scope,
					head: 'subscript',
					base: toRichExpr(e.fn.arg),
					sub: toRichExpr(e.arg),
				};

			// Do notation
			if (
				e.fn.head === 'apply' &&
				e.fn.fn.head === 'constant' &&
				(e.fn.fn.name === 'and_map' || e.fn.fn.name === 'and_then') &&
				e.arg.head === 'lambda'
			)
				return {
					type: e.type,
					scope: e.scope,
					head: 'do',
					source: toRichExpr(e.fn.arg),
					result: toRichExpr(e.arg.body),
					pure: e.fn.fn.name === 'and_map',
				};

			return { ...e, fn: toRichExpr(e.fn), arg: toRichExpr(e.arg) };
	}
}
