import _ from 'lodash';
import { Impossible } from '../core/error';
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

/**
 * Rewrites an expression to use a different scope, given a function mapping
 * indices in the original scope to indices in the new scope.
 */
export function rewriteScope(
	e: Expr,
	mapping: (index: number) => number,
): Expr {
	if (e.scope.every((_t, i) => mapping(i) === i)) return e;
	const scope: (ExprType | undefined)[] = [];
	e.scope.forEach((t, i) => {
		scope[mapping(i)] = t;
	});

	switch (e.head) {
		case 'variable':
			return {
				head: 'variable',
				type: e.type,
				scope,
				index: mapping(e.index),
			};
		case 'lambda':
			return {
				head: 'lambda',
				type: e.type,
				scope,
				param: e.param,
				body: rewriteScope(e.body, i => (i === 0 ? 0 : mapping(i - 1) + 1)),
			};
		case 'apply':
			return {
				head: 'apply',
				type: e.type,
				scope,
				fn: rewriteScope(e.fn, mapping),
				arg: rewriteScope(e.arg, mapping),
			};
		case 'lexeme':
		case 'quote':
		case 'constant':
			throw new Impossible('Atomic expression references a variable');
	}
}

/**
 * Substitutes all references to the variable at the given index with a target
 * expression that has the scope
 * [...e.scope.slice(0, index), ...e.scope.slice(index + 1)].
 */
export function substitute(index: number, target: Expr, e: Expr): Expr {
	if (e.scope.length <= index) return e;

	switch (e.head) {
		case 'variable': {
			if (e.index === index) return target;
			const scope = new Array<ExprType | undefined>(e.index);
			scope[e.index - 1] = e.type;
			return { head: 'variable', type: e.type, scope, index: e.index - 1 };
		}
		case 'lambda': {
			const body =
				e.scope[index] === undefined
					? rewriteScope(e.body, i => {
							if (i === index + 1) throw new Impossible('Variable deleted');
							return i < index + 1 ? i : i - 1;
						})
					: substitute(
							index + 1,
							rewriteScope(target, i => i + 1),
							e.body,
						);
			return {
				head: 'lambda',
				type: e.type,
				scope: body.scope.slice(1),
				param: e.param,
				body,
			};
		}
		case 'apply':
			return app(
				substitute(index, target, e.fn),
				substitute(index, target, e.arg),
			);
		case 'lexeme':
		case 'quote':
		case 'constant':
			throw new Impossible('Atomic expression references a variable');
	}
}

function pairlikeDeconstructor(
	name: (Expr & object & { head: 'constant' })['name'],
): ((e: Expr, project: Expr) => Expr) | null {
	switch (name) {
		case 'ungen':
			return ungen;
		case 'unqn':
			return unqn;
		case 'unpair':
			return unpair;
		case 'unbind':
			return unbind;
		default:
			return null;
	}
}

/**
 * Simplify an expression by walking through the tree looking for patterns like
 * β-reduction and `unint (int x)`.
 */
function reducePass(expr: Expr): Expr {
	switch (expr.head) {
		case 'lambda': {
			const body = reducePass(expr.body);
			return {
				head: 'lambda',
				type: expr.type,
				scope: body.scope.slice(1),
				param: expr.param,
				body,
			};
		}
		case 'apply': {
			if (expr.fn.head === 'lambda') {
				// (λx body) arg
				return reducePass(substitute(0, expr.arg, expr.fn.body));
			}
			if (expr.fn.head === 'constant') {
				const outer = expr.fn.name;
				if (expr.arg.head === 'apply' && expr.arg.fn.head === 'constant') {
					const inner = expr.arg.fn.name;
					if (
						(outer === 'unint' && inner === 'int') ||
						(outer === 'int' && inner === 'unint') ||
						(outer === 'unref' && inner === 'ref') ||
						(outer === 'ref' && inner === 'unref') ||
						(outer === 'unnf' && inner === 'nf') ||
						(outer === 'nf' && inner === 'unnf') ||
						(outer === 'uncont' && inner === 'cont') ||
						(outer === 'cont' && inner === 'uncont')
					)
						return reducePass(expr.arg.arg);
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
					const ff = rewriteScope(f, i => i + 1);
					const gg = rewriteScope(g, i => i + 1);
					return andMap(
						x,
						λ(x.type.inner, closed, (z, s) => app(gg, app(ff, s.var(z)))),
					);
				}

				// and_then (and_map x f) g = and_then x (λz g (f z))
				if (
					expr.fn.fn.name === 'and_then' &&
					expr.fn.arg.fn.fn.name === 'and_map'
				) {
					assertDxOrAct(x.type);
					const ff = rewriteScope(f, i => i + 1);
					const gg = rewriteScope(g, i => i + 1);
					return andThen(
						x,
						λ(x.type.inner, closed, (z, s) => app(gg, app(ff, s.var(z)))),
					);
				}

				// and_map (and_then x f) g = and_then x (λz and_map (f z) g)
				if (
					expr.fn.fn.name === 'and_map' &&
					expr.fn.arg.fn.fn.name === 'and_then'
				) {
					assertDxOrAct(x.type);
					const ff = rewriteScope(f, i => i + 1);
					const gg = rewriteScope(g, i => i + 1);
					return andThen(
						x,
						λ(x.type.inner, closed, (z, s) => andMap(app(ff, s.var(z)), gg)),
					);
				}

				// and_then (and_then x f) g = and_then x (λz and_then (f z) g)
				if (
					expr.fn.fn.name === 'and_then' &&
					expr.fn.arg.fn.fn.name === 'and_then'
				) {
					assertDxOrAct(x.type);
					const ff = rewriteScope(f, i => i + 1);
					const gg = rewriteScope(g, i => i + 1);
					return andThen(
						x,
						λ(x.type.inner, closed, (z, s) => andThen(app(ff, s.var(z)), gg)),
					);
				}

				// map (map x f) g = map x (λz g (f z))
				if (expr.fn.fn.name === 'map' && expr.fn.arg.fn.fn.name === 'map') {
					assertPl(x.type);
					const ff = rewriteScope(f, i => i + 1);
					const gg = rewriteScope(g, i => i + 1);
					return map(
						x,
						λ(x.type.inner, closed, (z, s) => app(gg, app(ff, s.var(z)))),
					);
				}

				// flat_map (map x f) g = flat_map x (λz. g (f z))
				if (
					expr.fn.fn.name === 'flat_map' &&
					expr.fn.arg.fn.fn.name === 'map'
				) {
					assertPl(x.type);
					const ff = rewriteScope(f, i => i + 1);
					const gg = rewriteScope(g, i => i + 1);
					return flatMap(
						x,
						λ(x.type.inner, closed, (z, s) => app(gg, app(ff, s.var(z)))),
					);
				}

				// map (flat_map x f) g = flat_map x (λz map (f z) g)
				if (
					expr.fn.fn.name === 'map' &&
					expr.fn.arg.fn.fn.name === 'flat_map'
				) {
					assertPl(x.type);
					const ff = rewriteScope(f, i => i + 1);
					const gg = rewriteScope(g, i => i + 1);
					return flatMap(
						x,
						λ(x.type.inner, closed, (z, s) => map(app(ff, s.var(z)), gg)),
					);
				}

				// flat_map (flat_map x f) g = flat_map x (λz flat_map (f z) g)
				if (
					expr.fn.fn.name === 'flat_map' &&
					expr.fn.arg.fn.fn.name === 'flat_map'
				) {
					assertPl(x.type);
					const ff = rewriteScope(f, i => i + 1);
					const gg = rewriteScope(g, i => i + 1);
					return flatMap(
						x,
						λ(x.type.inner, closed, (z, s) => flatMap(app(ff, s.var(z)), gg)),
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

			// f (unpair x (λy λz g)) = unpair x (λy λz f g)
			// and so on for Gen, Qn, Bind
			if (
				expr.arg.head === 'apply' &&
				expr.arg.fn.head === 'apply' &&
				expr.arg.fn.fn.head === 'constant' &&
				expr.arg.arg.head === 'lambda' &&
				expr.arg.arg.body.head === 'lambda'
			) {
				const deconstruct = pairlikeDeconstructor(expr.arg.fn.fn.name);
				if (deconstruct !== null) {
					const f = expr.fn;
					const x = expr.arg.fn.arg;
					const g = expr.arg.arg.body.body;
					const y = expr.arg.arg.param;
					const z = expr.arg.arg.body.param;
					const ff = rewriteScope(f, i => i + 2);
					return deconstruct(
						x,
						λ(y, closed, (_, s) => λ(z, s, () => app(ff, g))),
					);
				}
			}

			// unpair x (λy λz g) f = unpair x (λy λz g f)
			// and so on for Gen, Qn, Bind
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'apply' &&
				expr.fn.fn.fn.head === 'constant' &&
				expr.fn.arg.head === 'lambda' &&
				expr.fn.arg.body.head === 'lambda'
			) {
				const deconstruct = pairlikeDeconstructor(expr.fn.fn.fn.name);
				if (deconstruct !== null) {
					const f = expr.arg;
					const x = expr.fn.fn.arg;
					const g = expr.fn.arg.body.body;
					const y = expr.fn.arg.param;
					const z = expr.fn.arg.body.param;
					const ff = rewriteScope(f, i => i + 2);
					return deconstruct(
						x,
						λ(y, closed, (_, s) => λ(z, s, () => app(g, ff))),
					);
				}
			}

			// unpair x (λy λz unpair x f) = unpair x (λy λz f y z)
			// and so on for Gen, Qn, Bind
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				(expr.fn.fn.name === 'ungen' ||
					expr.fn.fn.name === 'unqn' ||
					expr.fn.fn.name === 'unpair' ||
					expr.fn.fn.name === 'unbind') &&
				expr.fn.arg.head === 'variable' &&
				expr.arg.head === 'lambda' &&
				expr.arg.body.head === 'lambda' &&
				expr.arg.body.body.head === 'apply' &&
				expr.arg.body.body.fn.head === 'apply' &&
				expr.arg.body.body.fn.fn.head === 'constant' &&
				expr.arg.body.body.fn.fn.name === expr.fn.fn.name &&
				expr.arg.body.body.fn.arg.head === 'variable' &&
				expr.arg.body.body.fn.arg.index === expr.fn.arg.index + 2
			) {
				const f = expr.arg.body.body.arg;
				const y = expr.arg.param;
				const z = expr.arg.body.param;
				return app(
					expr.fn,
					λ(y, closed, (y, s) =>
						λ(z, s, (z, s) => app(app(f, s.var(y)), s.var(z))),
					),
				);
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
				const originalDomain = expr.arg.param;

				// every (λy implies (among y (map x f)) g) = every (λz implies (among z x) ((λy g) (f z)))
				if (
					expr.arg.body.fn.arg.arg.fn.fn.name === 'map' &&
					x.scope[0] === undefined &&
					f.scope[0] === undefined
				) {
					assertPl(x.type);
					const gg = rewriteScope(g, i => (i === 0 ? 0 : i + 1));
					return every(
						λ(x.type.inner, closed, (z, s) =>
							app(
								app(implies, among(s.var(z), x)),
								app(
									λ(originalDomain, s, () => gg),
									app(f, s.var(z)),
								),
							),
						),
					);
				}

				// every (λy implies (among y (flat_map x f)) g) = every (λz implies (among z x) (every (λy implies (among y (f z)) g)))
				if (
					expr.arg.body.fn.arg.arg.fn.fn.name === 'flat_map' &&
					x.scope[0] === undefined
				) {
					assertPl(x.type);
					const ff = rewriteScope(f, i => (i === 0 ? 0 : i + 1));
					const gg = rewriteScope(g, i => (i === 0 ? 0 : i + 1));
					return every(
						λ(x.type.inner, closed, (z, s) =>
							app(
								app(implies, among(s.var(z), x)),
								every(
									λ(originalDomain, s, (y, s) =>
										app(app(implies, among(s.var(y), app(ff, s.var(z)))), gg),
									),
								),
							),
						),
					);
				}
			}

			return app(reducePass(expr.fn), reducePass(expr.arg));
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
