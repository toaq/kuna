import { Impossible } from '../../core/error';
import { assertBind, assertFn, assertRef, pair } from '../model';
import { rewriteScope, substitute } from '../reduce';
import type { Binding, Expr, ExprType } from '../types';

interface ExprBase {
	/**
	 * The type of this expression.
	 */
	type: ExprType;
	/**
	 * A sparse array containing the types of all variables used in this
	 * subexpression, ordered by De Bruijn indexing.
	 */
	scope: (ExprType | undefined)[];
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
	param: RichExpr;
	body: RichExpr;
}

interface Apply extends ExprBase {
	head: 'apply';
	fn: RichExpr;
	arg: RichExpr;
}

interface Prefix extends ExprBase {
	head: 'prefix';
	op: 'not';
	body: RichExpr;
}

interface Infix extends ExprBase {
	head: 'infix';
	op: 'among' | 'and' | 'or' | 'implies' | 'equals';
	left: RichExpr;
	right: RichExpr;
}

interface Subscript extends ExprBase {
	head: 'subscript';
	base: RichExpr;
	sub: RichExpr;
}

interface Pair extends ExprBase {
	head: 'pair';
	left: RichExpr;
	right: RichExpr;
}

interface DoGet extends ExprBase {
	head: 'do';
	op: 'get';
	left: RichExpr;
	right: RichExpr | Binding;
	result: RichExpr;
	pure: boolean;
}

interface DoSet extends ExprBase {
	head: 'do';
	op: 'set';
	left: RichExpr;
	right: Binding;
	result: RichExpr;
	pure: boolean;
}

interface DoRun extends ExprBase {
	head: 'do';
	op: 'run';
	right: RichExpr;
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
	| Prefix
	| Infix
	| Subscript
	| Pair
	| DoGet
	| DoSet
	| DoRun
	| Lexeme
	| Quote
	| Constant;

function enrichLambda_(param: Expr, body: Expr): { param: Expr; body: Expr } {
	// Pair destructuring
	// body: unpair x (λy λz f)
	if (
		body.head === 'apply' &&
		body.fn.head === 'apply' &&
		body.fn.fn.head === 'constant' &&
		body.fn.fn.name === 'unpair' &&
		body.fn.arg.head === 'variable' &&
		param.scope[body.fn.arg.index] !== undefined &&
		body.arg.head === 'lambda' &&
		body.arg.body.head === 'lambda'
	) {
		const f = body.arg.body.body;
		const index = body.fn.arg.index + 2;
		if (f.scope[index] === undefined)
			return enrichLambda_(
				substitute(
					index,
					pair(
						{
							type: body.arg.param,
							scope: [, body.arg.param],
							head: 'variable',
							index: 1,
						},
						{
							type: body.arg.body.param,
							scope: [body.arg.body.param],
							head: 'variable',
							index: 0,
						},
					),
					rewriteScope(param, i => i + 2),
				),
				rewriteScope(body.arg.body.body, i => {
					if (i === index) throw new Impossible('Variable deleted');
					return i > index ? i - 1 : i;
				}),
			);
	}

	return { param, body };
}

function enrichLambda(e: Expr & { head: 'lambda' }): {
	param: Expr;
	body: Expr;
} {
	return enrichLambda_(
		{ type: e.param, scope: [e.param], head: 'variable', index: 0 },
		e.body,
	);
}

export function enrich(e: Expr): RichExpr {
	switch (e.head) {
		case 'variable':
		case 'lexeme':
		case 'quote':
		case 'constant':
			return e;
		case 'lambda': {
			const { param, body } = enrichLambda(e);
			return {
				...e,
				head: 'quantify',
				q: 'lambda',
				param: enrich(param),
				body: enrich(body),
			};
		}
		case 'apply':
			// Hide int/cont/uncont applications
			if (
				e.fn.head === 'constant' &&
				(e.fn.name === 'int' || e.fn.name === 'cont' || e.fn.name === 'uncont')
			)
				return { ...enrich(e.arg), type: e.type };

			// Quantifier notation
			if (
				e.fn.head === 'constant' &&
				(e.fn.name === 'some' || e.fn.name === 'every') &&
				e.arg.head === 'lambda'
			) {
				const { param, body } = enrichLambda(e.arg);
				return {
					type: e.type,
					scope: e.scope,
					head: 'quantify',
					q: e.fn.name,
					param: enrich(param),
					body: enrich(body),
				};
			}

			// Prefix notation
			if (e.fn.head === 'constant' && e.fn.name === 'not')
				return {
					type: e.type,
					scope: e.scope,
					head: 'prefix',
					op: 'not',
					body: enrich(e.arg),
				};

			// Infix notation
			if (
				e.fn.head === 'apply' &&
				e.fn.fn.head === 'constant' &&
				(e.fn.fn.name === 'among' ||
					e.fn.fn.name === 'and' ||
					e.fn.fn.name === 'or' ||
					e.fn.fn.name === 'implies' ||
					e.fn.fn.name === 'equals')
			)
				return {
					type: e.type,
					scope: e.scope,
					head: 'infix',
					op: e.fn.fn.name,
					left: enrich(e.fn.arg),
					right: enrich(e.arg),
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
					base: enrich(e.fn.arg),
					sub: enrich(e.arg),
				};

			// Pair notation
			if (
				e.fn.head === 'apply' &&
				e.fn.fn.head === 'constant' &&
				e.fn.fn.name === 'pair'
			)
				return {
					type: e.type,
					scope: e.scope,
					head: 'pair',
					left: enrich(e.fn.arg),
					right: enrich(e.arg),
				};

			// Do notation (get value from monad)
			if (
				e.fn.head === 'apply' &&
				e.fn.fn.head === 'constant' &&
				(e.fn.fn.name === 'and_map' || e.fn.fn.name === 'and_then') &&
				e.arg.head === 'lambda'
			) {
				if (e.arg.body.scope[0] === undefined)
					return {
						type: e.type,
						scope: e.scope,
						head: 'do',
						op: 'run',
						right: enrich(e.fn.arg),
						result: enrich(
							rewriteScope(e.arg.body, i => {
								if (i === 0) throw new Impossible('Variable deleted');
								return i - 1;
							}),
						),
						pure: e.fn.fn.name === 'and_map',
					};

				const { param, body } = enrichLambda(e.arg);
				return {
					type: e.type,
					scope: e.scope,
					head: 'do',
					op: 'get',
					left: enrich(param),
					right: enrich(e.fn.arg),
					result: enrich(body),
					pure: e.fn.fn.name === 'and_map',
				};
			}

			// Do notation (get reference)
			if (
				e.fn.head === 'constant' &&
				e.fn.name === 'ref' &&
				e.arg.head === 'lambda'
			) {
				assertFn(e.fn.type);
				assertRef(e.fn.type.range);
				const { param, body } = enrichLambda(e.arg);
				return {
					type: e.type,
					scope: e.scope,
					head: 'do',
					op: 'get',
					left: enrich(param),
					right: e.fn.type.range.binding,
					result: enrich(body),
					pure: true,
				};
			}

			// Do notation (set binding)
			if (
				e.fn.head === 'apply' &&
				e.fn.fn.head === 'constant' &&
				e.fn.fn.name === 'bind'
			) {
				assertFn(e.fn.fn.type);
				assertFn(e.fn.fn.type.range);
				assertBind(e.fn.fn.type.range.range);
				const result = enrich(e.arg);
				return {
					type: e.type,
					scope: e.scope,
					head: 'do',
					op: 'set',
					left: enrich(e.fn.arg),
					right: e.fn.fn.type.range.range.binding,
					result,
					pure: !(result.head === 'do' && result.op === 'set'),
				};
			}

			return { ...e, fn: enrich(e.fn), arg: enrich(e.arg) };
	}
}
