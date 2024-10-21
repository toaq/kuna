import _ from 'lodash';
import { type Expr, type ExprType, app } from './model';

function mapVariables(
	e: Expr,
	newScope: ExprType[],
	mapVariable: (index: number) => Expr,
	mapQuantifierBody: (body: Expr, newScope: ExprType[]) => Expr,
): Expr {
	switch (e.head) {
		case 'variable': {
			return mapVariable(e.index);
		}
		case 'lambda': {
			return {
				head: 'lambda',
				type: e.type,
				scope: newScope,
				body: mapQuantifierBody(e.body, [e.body.scope[0], ...newScope]),
			};
		}
		case 'apply': {
			return app(
				mapVariables(e.fn, newScope, mapVariable, mapQuantifierBody),
				mapVariables(e.arg, newScope, mapVariable, mapQuantifierBody),
			);
		}
		default:
			return { ...e, scope: newScope };
	}
}

/**
 * Rewrites an expression to use a different scope, given a function mapping
 * indices in the original scope to indices in the new scope.
 */
export function rewriteScope(
	e: Expr,
	newScope: ExprType[],
	mapping: (index: number) => number,
): Expr {
	return mapVariables(
		e,
		newScope,
		i => ({
			head: 'variable',
			type: newScope[mapping(i)],
			scope: newScope,
			index: mapping(i),
		}),
		(body, s) =>
			rewriteScope(body, s, (index: number) =>
				index === 0 ? 0 : mapping(index - 1) + 1,
			),
	);
}

/**
 * Substitutes all references to the variable at the given index with a target
 * expression that has the scope
 * [...e.scope.slice(0, index), ...e.scope.slice(index + 1)].
 */
function substitute(index: number, target: Expr, e: Expr): Expr {
	const newScope = [...e.scope];
	newScope.splice(index, 1);

	return mapVariables(
		e,
		newScope,
		i => {
			if (i === index) {
				return rewriteScope(
					target,
					newScope,
					i => i + newScope.length - target.scope.length,
				);
			}
			const shifted = i < index ? i : i - 1;
			return {
				head: 'variable',
				type: newScope[shifted],
				scope: newScope,
				index: shifted,
			};
		},
		body => substitute(index + 1, target, body),
	);
}

/**
 * Determine whether an Expr is small enough to always β-reduce it.
 */
function isSmallExpr(e: Expr): boolean {
	switch (e.head) {
		case 'variable':
		case 'constant':
		case 'quote':
			return true;
		default:
			return false;
	}
}

/**
 * Count occurrences of a variable in an expression.
 */
function varOccurrences(expr: Expr, index: number): number {
	let count = 0;
	function walk(e: Expr, index: number) {
		switch (e.head) {
			case 'apply':
				walk(e.fn, index);
				walk(e.arg, index);
				break;
			case 'lambda':
				walk(e.body, index + 1);
				break;
			case 'variable':
				if (e.index === index) {
					++count;
				}
				break;
			default:
				break;
		}
	}
	walk(expr, index);
	return count;
}

/**
 * Simplify an expression by walking through the tree looking for patterns like
 * β-reduction and `unint (int x)`.
 */
function reducePass(expr: Expr): Expr {
	switch (expr.head) {
		case 'lambda': {
			return {
				head: 'lambda',
				type: expr.type,
				scope: expr.scope,
				body: reducePass(expr.body),
			};
		}
		case 'apply': {
			if (expr.fn.head === 'lambda') {
				// (λx. body) arg
				if (isSmallExpr(expr.arg) || varOccurrences(expr.fn.body, 0) < 2) {
					return substitute(0, expr.arg, expr.fn.body);
				}
			}
			return {
				head: 'apply',
				type: expr.type,
				scope: expr.scope,
				fn: reducePass(expr.fn),
				arg: reducePass(expr.arg),
			};
		}
		case 'variable':
		case 'lexeme':
		case 'quote':
		case 'constant': {
			return expr;
		}
	}
}

/**
 * Simplify an expression by calling `reducePass` on it until it stops changing.
 */
export function reduceExpr(expr: Expr): Expr {
	let current = expr;
	while (true) {
		const next = reducePass(current);
		if (_.isEqual(current, next)) return next;
		current = next;
	}
}
