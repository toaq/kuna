import _ from 'lodash';
import {
	among,
	andMap,
	andThen,
	app,
	assertDxOrAct,
	assertPl,
	closed,
	every,
	flatMap,
	implies,
	map,
	unbind,
	ungen,
	unpair,
	unqn,
	λ,
} from './model';
import type { Expr, ExprType } from './types';

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
 * Error which you can throw inside a rewriteScope callback to indicate that a
 * rewrite is not possible, as the expression uses a variable which would no
 * longer exist.
 */
export class VariableDeletedError extends Error {}

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
				// (λx body) arg
				if (isSmallExpr(expr.arg) || varOccurrences(expr.fn.body, 0) < 2) {
					return reducePass(substitute(0, expr.arg, expr.fn.body));
				}
			}
			if (expr.fn.head === 'constant') {
				const outer = expr.fn.name;
				if (expr.arg.head === 'apply' && expr.arg.fn.head === 'constant') {
					const inner = expr.arg.fn.name;
					if (outer === 'unint' && inner === 'int') {
						return reducePass(expr.arg.arg);
					}
					if (outer === 'int' && inner === 'unint') {
						return reducePass(expr.arg.arg);
					}
					if (outer === 'unref' && inner === 'ref') {
						return reducePass(expr.arg.arg);
					}
					if (outer === 'ref' && inner === 'unref') {
						return reducePass(expr.arg.arg);
					}
					if (outer === 'uncont' && inner === 'cont') {
						return reducePass(expr.arg.arg);
					}
					if (outer === 'cont' && inner === 'uncont') {
						return reducePass(expr.arg.arg);
					}
				}
			}

			// _ (_ x f) g
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				expr.fn.arg.head === 'apply' &&
				expr.fn.arg.fn.head === 'apply' &&
				expr.fn.arg.fn.fn.head === 'constant'
			) {
				const x = expr.fn.arg.fn.arg;
				const f = expr.fn.arg.arg;
				const g = expr.arg;

				// unpair (pair x f) g = g x f
				// and so on for Gen, Qn, Bind
				if (
					(expr.fn.fn.name === 'ungen' && expr.fn.arg.fn.fn.name === 'gen') ||
					(expr.fn.fn.name === 'unqn' && expr.fn.arg.fn.fn.name === 'qn') ||
					(expr.fn.fn.name === 'unpair' && expr.fn.arg.fn.fn.name === 'pair') ||
					(expr.fn.fn.name === 'unbind' && expr.fn.arg.fn.fn.name === 'bind')
				) {
					return app(app(expr.arg, expr.fn.arg.fn.arg), expr.fn.arg.arg);
				}

				// and_map (and_map x f) g = and_map x (λz g (f z))
				if (
					expr.fn.fn.name === 'and_map' &&
					expr.fn.arg.fn.fn.name === 'and_map'
				) {
					assertDxOrAct(x.type);
					const ff = rewriteScope(f, [x.type.inner, ...f.scope], i => i + 1);
					const gg = rewriteScope(g, [x.type.inner, ...g.scope], i => i + 1);
					return andMap(
						x,
						λ(x.type.inner, { ...closed, types: x.scope }, (z, s) =>
							app(gg, app(ff, s.var(z))),
						),
					);
				}

				// and_then (and_map x f) g = and_then x (λz g (f z))
				if (
					expr.fn.fn.name === 'and_then' &&
					expr.fn.arg.fn.fn.name === 'and_map'
				) {
					assertDxOrAct(x.type);
					const ff = rewriteScope(f, [x.type.inner, ...f.scope], i => i + 1);
					const gg = rewriteScope(g, [x.type.inner, ...g.scope], i => i + 1);
					return andThen(
						x,
						λ(x.type.inner, { ...closed, types: x.scope }, (z, s) =>
							app(gg, app(ff, s.var(z))),
						),
					);
				}

				// and_map (and_then x f) g = and_then x (λz and_map (f z) g)
				if (
					expr.fn.fn.name === 'and_map' &&
					expr.fn.arg.fn.fn.name === 'and_then'
				) {
					assertDxOrAct(x.type);
					const ff = rewriteScope(f, [x.type.inner, ...f.scope], i => i + 1);
					const gg = rewriteScope(g, [x.type.inner, ...g.scope], i => i + 1);
					return andThen(
						x,
						λ(x.type.inner, { ...closed, types: x.scope }, (z, s) =>
							andMap(app(ff, s.var(z)), gg),
						),
					);
				}

				// and_then (and_then x f) g = and_then x (λz and_then (f z) g)
				if (
					expr.fn.fn.name === 'and_then' &&
					expr.fn.arg.fn.fn.name === 'and_then'
				) {
					assertDxOrAct(x.type);
					const ff = rewriteScope(f, [x.type.inner, ...f.scope], i => i + 1);
					const gg = rewriteScope(g, [x.type.inner, ...g.scope], i => i + 1);
					return andThen(
						x,
						λ(x.type.inner, { ...closed, types: x.scope }, (z, s) =>
							andThen(app(ff, s.var(z)), gg),
						),
					);
				}

				// map (map x f) g = map x (λz g (f z))
				if (expr.fn.fn.name === 'map' && expr.fn.arg.fn.fn.name === 'map') {
					assertPl(x.type);
					const ff = rewriteScope(f, [x.type.inner, ...f.scope], i => i + 1);
					const gg = rewriteScope(g, [x.type.inner, ...g.scope], i => i + 1);
					return map(
						x,
						λ(x.type.inner, { ...closed, types: x.scope }, (z, s) =>
							app(gg, app(ff, s.var(z))),
						),
					);
				}

				// flat_map (map x f) g = flat_map x (λz. g (f z))
				if (
					expr.fn.fn.name === 'flat_map' &&
					expr.fn.arg.fn.fn.name === 'map'
				) {
					assertPl(x.type);
					const ff = rewriteScope(f, [x.type.inner, ...f.scope], i => i + 1);
					const gg = rewriteScope(g, [x.type.inner, ...g.scope], i => i + 1);
					return flatMap(
						x,
						λ(x.type.inner, { ...closed, types: x.scope }, (z, s) =>
							app(gg, app(ff, s.var(z))),
						),
					);
				}

				// map (flat_map x f) g = flat_map x (λz map (f z) g)
				if (
					expr.fn.fn.name === 'map' &&
					expr.fn.arg.fn.fn.name === 'flat_map'
				) {
					assertPl(x.type);
					const ff = rewriteScope(f, [x.type.inner, ...f.scope], i => i + 1);
					const gg = rewriteScope(g, [x.type.inner, ...g.scope], i => i + 1);
					return flatMap(
						x,
						λ(x.type.inner, { ...closed, types: x.scope }, (z, s) =>
							map(app(ff, s.var(z)), gg),
						),
					);
				}

				// flat_map (flat_map x f) g = flat_map x (λz flat_map (f z) g)
				if (
					expr.fn.fn.name === 'flat_map' &&
					expr.fn.arg.fn.fn.name === 'flat_map'
				) {
					assertPl(x.type);
					const ff = rewriteScope(f, [x.type.inner, ...f.scope], i => i + 1);
					const gg = rewriteScope(g, [x.type.inner, ...g.scope], i => i + 1);
					return flatMap(
						x,
						λ(x.type.inner, { ...closed, types: x.scope }, (z, s) =>
							flatMap(app(ff, s.var(z)), gg),
						),
					);
				}
			}

			// and_map x (λy y) = x
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				expr.fn.fn.name === 'and_map' &&
				expr.arg.head === 'lambda' &&
				expr.arg.body.head === 'variable' &&
				expr.arg.body.index === 0
			) {
				return expr.fn.arg;
			}

			// unpair (unpair x (λy λz pair f g)) h = unpair x (λy λz h f g)
			// and so on for Gen, Qn, Bind
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				expr.fn.arg.head === 'apply' &&
				expr.fn.arg.fn.head === 'apply' &&
				expr.fn.arg.fn.fn.head === 'constant' &&
				expr.fn.arg.arg.head === 'lambda' &&
				expr.fn.arg.arg.body.head === 'lambda' &&
				expr.fn.arg.arg.body.body.head === 'apply' &&
				expr.fn.arg.arg.body.body.fn.head === 'apply' &&
				expr.fn.arg.arg.body.body.fn.fn.head === 'constant'
			) {
				const x = expr.fn.arg.fn.arg;
				const f = expr.fn.arg.arg.body.body.fn.arg;
				const g = expr.fn.arg.arg.body.body.arg;
				const h = expr.arg;
				const innerScope = expr.fn.arg.arg.body.body.scope;
				const [z, y] = innerScope;

				if (
					expr.fn.fn.name === 'ungen' &&
					expr.fn.arg.fn.fn.name === 'ungen' &&
					expr.fn.arg.arg.body.body.fn.fn.name === 'gen'
				) {
					const hh = rewriteScope(h, innerScope, i => i + 2);
					return ungen(
						x,
						λ(y, { ...closed, types: x.scope }, (_, s) =>
							λ(z, s, () => app(app(hh, f), g)),
						),
					);
				}

				if (
					expr.fn.fn.name === 'unqn' &&
					expr.fn.arg.fn.fn.name === 'unqn' &&
					expr.fn.arg.arg.body.body.fn.fn.name === 'qn'
				) {
					const hh = rewriteScope(h, innerScope, i => i + 2);
					return unqn(
						x,
						λ(y, { ...closed, types: x.scope }, (_, s) =>
							λ(z, s, () => app(app(hh, f), g)),
						),
					);
				}

				if (
					expr.fn.fn.name === 'unpair' &&
					expr.fn.arg.fn.fn.name === 'unpair' &&
					expr.fn.arg.arg.body.body.fn.fn.name === 'pair'
				) {
					const hh = rewriteScope(h, innerScope, i => i + 2);
					return unpair(
						x,
						λ(y, { ...closed, types: x.scope }, (_, s) =>
							λ(z, s, () => app(app(hh, f), g)),
						),
					);
				}

				if (
					expr.fn.fn.name === 'unbind' &&
					expr.fn.arg.fn.fn.name === 'unbind' &&
					expr.fn.arg.arg.body.body.fn.fn.name === 'bind'
				) {
					const hh = rewriteScope(h, innerScope, i => i + 2);
					return unbind(
						x,
						λ(y, { ...closed, types: x.scope }, (_, s) =>
							λ(z, s, () => app(app(hh, f), g)),
						),
					);
				}
			}

			// every (λy implies (among y (_ x f)) g)
			if (
				expr.fn.head === 'constant' &&
				expr.fn.name === 'every' &&
				expr.arg.head === 'lambda' &&
				expr.arg.body.head === 'apply' &&
				expr.arg.body.fn.head === 'apply' &&
				expr.arg.body.fn.fn.head === 'constant' &&
				expr.arg.body.fn.fn.name === 'implies' &&
				expr.arg.body.fn.arg.head === 'apply' &&
				expr.arg.body.fn.arg.fn.head === 'apply' &&
				expr.arg.body.fn.arg.fn.fn.head === 'constant' &&
				expr.arg.body.fn.arg.fn.fn.name === 'among' &&
				expr.arg.body.fn.arg.fn.arg.head === 'variable' &&
				expr.arg.body.fn.arg.fn.arg.index === 0 &&
				expr.arg.body.fn.arg.arg.head === 'apply' &&
				expr.arg.body.fn.arg.arg.fn.head === 'apply' &&
				expr.arg.body.fn.arg.arg.fn.fn.head === 'constant'
			) {
				const x = expr.arg.body.fn.arg.arg.fn.arg;
				const f = expr.arg.body.fn.arg.arg.arg;
				const g = expr.arg.body.arg;
				const originalDomain = g.scope[0];

				// every (λy implies (among y (map x f)) g) = every (λz implies (among z x) ((λy g) (f z)))
				if (expr.arg.body.fn.arg.arg.fn.fn.name === 'map') {
					assertPl(x.type);
					let varError = false;
					let xx: Expr;
					let ff: Expr;
					try {
						xx = rewriteScope(x, [x.type.inner, ...x.scope.slice(1)], i => {
							if (i === 0) throw new VariableDeletedError();
							return i;
						});
						ff = rewriteScope(f, [x.type.inner, ...f.scope.slice(1)], i => {
							if (i === 0) throw new VariableDeletedError();
							return i;
						});
					} catch (e) {
						if (e instanceof VariableDeletedError) varError = true;
						else throw e;
					}
					if (!varError) {
						const gg = rewriteScope(
							g,
							[originalDomain, x.type.inner, ...g.scope.slice(1)],
							i => (i === 0 ? 0 : i + 1),
						);
						return every(
							λ(x.type.inner, { ...closed, types: expr.scope }, (z, s) =>
								app(
									app(implies(s), among(s.var(z), xx)),
									app(
										λ(originalDomain, s, () => gg),
										app(ff, s.var(z)),
									),
								),
							),
						);
					}
				}

				// every (λy implies (among y (flat_map x f)) g) = every (λz implies (among z x) (every (λy implies (among y (f z)) g)))
				if (expr.arg.body.fn.arg.arg.fn.fn.name === 'flat_map') {
					assertPl(x.type);
					let varError = false;
					let xx: Expr;
					let ff: Expr;
					try {
						xx = rewriteScope(x, [x.type.inner, ...x.scope.slice(1)], i => {
							if (i === 0) throw new VariableDeletedError();
							return i;
						});
						ff = rewriteScope(
							f,
							[originalDomain, x.type.inner, ...f.scope.slice(1)],
							i => (i === 0 ? 0 : i + 1),
						);
					} catch (e) {
						if (e instanceof VariableDeletedError) varError = true;
						else throw e;
					}
					if (!varError) {
						const gg = rewriteScope(
							g,
							[originalDomain, x.type.inner, ...g.scope.slice(1)],
							i => (i === 0 ? 0 : i + 1),
						);
						return every(
							λ(x.type.inner, { ...closed, types: expr.scope }, (z, s) =>
								app(
									app(implies(s), among(s.var(z), xx)),
									every(
										λ(originalDomain, s, (y, s) =>
											app(
												app(implies(s), among(s.var(y), app(ff, s.var(z)))),
												gg,
											),
										),
									),
								),
							),
						);
					}
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
