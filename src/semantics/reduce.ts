import { Impossible } from '../core/error';
import {
	Pair,
	among,
	and,
	andMap,
	andThen,
	app,
	assertDx,
	assertDxOrAct,
	assertPl,
	every,
	flatMap,
	implies,
	map,
	or,
	pair,
	single,
	topic,
	trueExpr,
	unbind,
	unindef,
	unpair,
	unqn,
	v,
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
		case 'unindef':
			return unindef;
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

interface DxResult {
	tupleDx: Expr;
	cont: Expr;
}

function extractDxResult_(e: Expr, cont: Expr, depth: number): DxResult | null {
	// _ x (λy _)
	if (
		e.head === 'apply' &&
		e.fn.head === 'apply' &&
		e.fn.fn.head === 'constant' &&
		e.arg.head === 'lambda'
	) {
		// and_then x (λy f)
		if (e.fn.fn.name === 'and_then') {
			const result = extractDxResult_(e.arg.body, cont, depth + 1);
			return (
				result && {
					tupleDx: andThen(
						e.fn.arg,
						λ(e.arg.param, () => result.tupleDx),
					),
					cont: result.cont,
				}
			);
		}

		// unpair x (λy λz f)
		// Needed to fully reduce Topic complements containing donkey DPs
		if (e.fn.fn.name === 'unpair' && e.arg.body.head === 'lambda') {
			const y = e.arg.param;
			const z = e.arg.body.param;
			const result = extractDxResult_(e.arg.body.body, cont, depth + 2);
			return (
				result && {
					tupleDx: unpair(
						e.fn.arg,
						λ(y, () => λ(z, () => result.tupleDx)),
					),
					cont: result.cont,
				}
			);
		}

		// and_map x (λy f)
		if (e.fn.fn.name === 'and_map') {
			let tuple: Expr = {
				head: 'variable',
				type: e.arg.param,
				scope: [e.arg.param],
				index: 0,
			};
			let tupleSize = 1;
			const mapping = [0];
			for (let i = 0; i < e.scope.length; i++) {
				if (e.arg.scope[i] !== undefined) {
					const scope = new Array<ExprType>(i + 2);
					scope[i + 1] = e.arg.scope[i]!;
					tuple = pair(
						{ head: 'variable', type: scope[i + 1], scope, index: i + 1 },
						tuple,
					);
					mapping[i + 1] = tupleSize;
					tupleSize++;
				}
			}
			let cont_ = substitute(
				tupleSize * 2 - 1,
				rewriteScope(e.arg.body, i =>
					i > depth + 1
						? i - depth - 1 + 2 * tupleSize - 1
						: Math.max(0, mapping[i] * 2 - 1),
				),
				rewriteScope(cont, i => i + 2 * tupleSize - 1),
			);
			let type = e.arg.param;
			for (let i = 0; i < e.scope.length; i++) {
				if (e.arg.scope[i] !== undefined) {
					const x = e.arg.scope[i]!;
					const y = type;
					type = Pair(x, y);
					cont_ = unpair(
						{ head: 'variable', type, scope: [type], index: 0 },
						λ(x, () => λ(y, () => cont_)),
					);
				}
			}
			return {
				tupleDx: andMap(
					e.fn.arg,
					λ(e.arg.param, () => tuple),
				),
				cont: cont_,
			};
		}
	}

	return null;
}

/**
 * Given a Dx expression like "and_then w (λx and_map y (λz f))", extract the
 * result out of the final and_map lambda to leave us with the expressions
 * "and_then w (λx and_map y (λz pair x z))" and "unpair p (λx λz f)".
 */
function extractDxResult(e: Expr, cont: Expr): DxResult | null {
	return extractDxResult_(e, cont, 0);
}

function reduce_(expr: Expr): Expr {
	switch (expr.head) {
		case 'lambda': {
			const body = reduce(expr.body);
			return body === expr.body
				? expr
				: {
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
				return reduce(substitute(0, expr.arg, expr.fn.body));
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
						(outer === 'uncont' && inner === 'cont') ||
						(outer === 'cont' && inner === 'uncont')
					)
						return reduce(expr.arg.arg);
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
				// and so on for Indef, Qn, Bind
				if (
					(expr.fn.fn.name === 'unindef' &&
						expr.fn.arg.fn.fn.name === 'indef') ||
					(expr.fn.fn.name === 'unqn' && expr.fn.arg.fn.fn.name === 'qn') ||
					(expr.fn.fn.name === 'unpair' && expr.fn.arg.fn.fn.name === 'pair') ||
					(expr.fn.fn.name === 'unbind' && expr.fn.arg.fn.fn.name === 'bind')
				) {
					return reduce(
						app(app(expr.arg, expr.fn.arg.fn.arg), expr.fn.arg.arg),
					);
				}

				// and_map (and_map x f) g = and_map x (λz g (f z))
				if (
					expr.fn.fn.name === 'and_map' &&
					expr.fn.arg.fn.fn.name === 'and_map'
				) {
					assertDxOrAct(x.type);
					const ff = rewriteScope(f, i => i + 1);
					const gg = rewriteScope(g, i => i + 1);
					return reduce(
						andMap(
							x,
							λ(x.type.inner, z => app(gg, app(ff, v(z)))),
						),
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
					return reduce(
						andThen(
							x,
							λ(x.type.inner, z => app(gg, app(ff, v(z)))),
						),
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
					return reduce(
						andThen(
							x,
							λ(x.type.inner, z => andMap(app(ff, v(z)), gg)),
						),
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
					return reduce(
						andThen(
							x,
							λ(x.type.inner, z => andThen(app(ff, v(z)), gg)),
						),
					);
				}

				// map (map x f) g = map x (λz g (f z))
				if (expr.fn.fn.name === 'map' && expr.fn.arg.fn.fn.name === 'map') {
					assertPl(x.type);
					const ff = rewriteScope(f, i => i + 1);
					const gg = rewriteScope(g, i => i + 1);
					return reduce(
						map(
							x,
							λ(x.type.inner, z => app(gg, app(ff, v(z)))),
						),
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
					return reduce(
						flatMap(
							x,
							λ(x.type.inner, z => app(gg, app(ff, v(z)))),
						),
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
					return reduce(
						flatMap(
							x,
							λ(x.type.inner, z => map(app(ff, v(z)), gg)),
						),
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
					return reduce(
						flatMap(
							x,
							λ(x.type.inner, z => flatMap(app(ff, v(z)), gg)),
						),
					);
				}
			}

			// _ (single x) f
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				expr.fn.arg.head === 'apply' &&
				expr.fn.arg.fn.head === 'constant' &&
				expr.fn.arg.fn.name === 'single'
			) {
				const f = expr.arg;
				const x = expr.fn.arg.arg;

				// map (single x) f = single (f x)
				if (expr.fn.fn.name === 'map') return reduce(single(app(f, x)));

				// flat_map (single x) f = f x
				if (expr.fn.fn.name === 'flat_map') return reduce(app(f, x));
			}

			// map/and_map x (λy y/unit) = x
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				(expr.fn.fn.name === 'map' || expr.fn.fn.name === 'and_map') &&
				expr.arg.head === 'lambda' &&
				((expr.arg.body.head === 'variable' && expr.arg.body.index === 0) ||
					(expr.arg.param === '()' &&
						expr.arg.body.head === 'constant' &&
						expr.arg.body.name === 'unit'))
			)
				return reduce(expr.fn.arg);

			// f (unpair x (λy λz g)) = unpair x (λy λz f g)
			// and so on for Indef, Qn, Bind
			if (
				expr.arg.head === 'apply' &&
				expr.arg.fn.head === 'apply' &&
				expr.arg.fn.fn.head === 'constant' &&
				expr.arg.arg.head === 'lambda' &&
				expr.arg.arg.body.head === 'lambda' &&
				expr.arg.fn.arg.scope.every(
					(_type, i) => expr.fn.scope[i] === undefined,
				)
			) {
				const deconstruct = pairlikeDeconstructor(expr.arg.fn.fn.name);
				if (deconstruct !== null) {
					const f = expr.fn;
					const x = expr.arg.fn.arg;
					const g = expr.arg.arg.body.body;
					const y = expr.arg.arg.param;
					const z = expr.arg.arg.body.param;
					const ff = rewriteScope(f, i => i + 2);
					return reduce(
						deconstruct(
							x,
							λ(y, () => λ(z, () => app(ff, g))),
						),
					);
				}
			}

			// f (λw unpair x (λy λz g)) = unpair x (λy λz f (λw g))
			// and so on for Indef, Qn, Bind
			if (
				expr.arg.head === 'lambda' &&
				expr.arg.body.head === 'apply' &&
				expr.arg.body.fn.head === 'apply' &&
				expr.arg.body.fn.fn.head === 'constant' &&
				expr.arg.body.fn.arg.scope[0] === undefined &&
				expr.arg.body.arg.head === 'lambda' &&
				expr.arg.body.arg.body.head === 'lambda'
			) {
				const deconstruct = pairlikeDeconstructor(expr.arg.body.fn.fn.name);
				if (deconstruct !== null) {
					const x = expr.arg.body.fn.arg;
					const xx = rewriteScope(x, i => {
						if (i === 0) throw new Impossible('Variable deleted');
						return i - 1;
					});
					const f = expr.fn;
					const ff = rewriteScope(f, i => i + 2);
					const g = expr.arg.body.arg.body.body;
					const gg = rewriteScope(g, i => (i === 2 ? 0 : i < 2 ? i + 1 : i));
					const w = expr.arg.param;
					const y = expr.arg.body.arg.param;
					const z = expr.arg.body.arg.body.param;
					return reduce(
						deconstruct(
							xx,
							λ(y, () =>
								λ(z, () =>
									app(
										ff,
										λ(w, () => gg),
									),
								),
							),
						),
					);
				}
			}

			// unpair x (λy λz f) = f (given y and z are unused in f)
			// and so on for Indef, Qn, Bind
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				(expr.fn.fn.name === 'unindef' ||
					expr.fn.fn.name === 'unqn' ||
					expr.fn.fn.name === 'unpair' ||
					expr.fn.fn.name === 'unbind') &&
				expr.arg.head === 'lambda' &&
				expr.arg.body.scope[0] === undefined &&
				expr.arg.body.head === 'lambda' &&
				expr.arg.body.body.scope[0] === undefined
			) {
				return reduce(
					rewriteScope(expr.arg.body.body, i => {
						if (i < 2) throw new Impossible('Variable deleted');
						return i - 2;
					}),
				);
			}

			// unpair x (λy λz g) f = unpair x (λy λz g f)
			// and so on for Indef, Qn, Bind
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'apply' &&
				expr.fn.fn.fn.head === 'constant' &&
				expr.fn.arg.head === 'lambda' &&
				expr.fn.arg.body.head === 'lambda' &&
				expr.fn.fn.arg.scope.every(
					(_type, i) => expr.arg.scope[i] === undefined,
				)
			) {
				const deconstruct = pairlikeDeconstructor(expr.fn.fn.fn.name);
				if (deconstruct !== null) {
					const f = expr.arg;
					const x = expr.fn.fn.arg;
					const g = expr.fn.arg.body.body;
					const y = expr.fn.arg.param;
					const z = expr.fn.arg.body.param;
					const ff = rewriteScope(f, i => i + 2);
					return reduce(
						deconstruct(
							x,
							λ(y, () => λ(z, () => app(g, ff))),
						),
					);
				}
			}

			// unpair x (λy λz unpair x f) = unpair x (λy λz f y z)
			// and so on for Indef, Qn, Bind
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				(expr.fn.fn.name === 'unindef' ||
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
				return reduce(
					app(
						expr.fn,
						λ(y, y => λ(z, z => app(app(f, v(y)), v(z)))),
					),
				);
			}

			// (unpair x (λy λz f)) (unpair x (λy λz g)) = unpair x (λy λz f g)
			// and so on for Indef, Qn, Bind
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'apply' &&
				expr.fn.fn.fn.head === 'constant' &&
				expr.fn.fn.arg.head === 'variable' &&
				expr.fn.arg.head === 'lambda' &&
				expr.fn.arg.body.head === 'lambda' &&
				expr.arg.head === 'apply' &&
				expr.arg.fn.head === 'apply' &&
				expr.arg.fn.fn.head === 'constant' &&
				expr.arg.fn.fn.name === expr.fn.fn.fn.name &&
				expr.arg.fn.arg.head === 'variable' &&
				expr.arg.fn.arg.index === expr.fn.fn.arg.index &&
				expr.arg.arg.head === 'lambda' &&
				expr.arg.arg.body.head === 'lambda'
			) {
				const deconstruct = pairlikeDeconstructor(expr.fn.fn.fn.name);
				if (deconstruct !== null) {
					const x = expr.fn.fn.arg;
					const y = expr.fn.arg.param;
					const z = expr.fn.arg.body.param;
					const f = expr.fn.arg.body.body;
					const g = expr.arg.arg.body.body;
					return reduce(
						deconstruct(
							x,
							λ(y, () => λ(z, () => app(f, g))),
						),
					);
				}
			}

			// every (λy implies (among y (_ f)) g)
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
				expr.arg.body.fn.arg.arg.head === 'apply'
			) {
				const f = expr.arg.body.fn.arg.arg.arg;
				const g = expr.arg.body.arg;
				const originalDomain = expr.arg.param;

				// every (λy implies (among y (single f)) g) = (λy g) f
				if (
					expr.arg.body.fn.arg.arg.fn.head === 'constant' &&
					expr.arg.body.fn.arg.arg.fn.name === 'single' &&
					f.scope[0] === undefined
				) {
					const ff = rewriteScope(f, i => {
						if (i === 0) throw new Impossible('Variable deleted');
						return i - 1;
					});
					return reduce(
						app(
							λ(originalDomain, () => g),
							ff,
						),
					);
				}

				// every (λy implies (among y (_ x f)) g)
				if (
					expr.arg.body.fn.arg.arg.fn.head === 'apply' &&
					expr.arg.body.fn.arg.arg.fn.fn.head === 'constant'
				) {
					const x = expr.arg.body.fn.arg.arg.fn.arg;

					// every (λy implies (among y (map x f)) g) = every (λz implies (among z x) ((λy g) (f z)))
					if (
						expr.arg.body.fn.arg.arg.fn.fn.name === 'map' &&
						x.scope[0] === undefined &&
						f.scope[0] === undefined
					) {
						assertPl(x.type);
						const gg = rewriteScope(g, i => (i === 0 ? 0 : i + 1));
						return reduce(
							every(
								λ(x.type.inner, z =>
									app(
										app(implies, among(v(z), x)),
										app(
											λ(originalDomain, () => gg),
											app(f, v(z)),
										),
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
						return reduce(
							every(
								λ(x.type.inner, z =>
									app(
										app(implies, among(v(z), x)),
										every(
											λ(originalDomain, y =>
												app(app(implies, among(v(y), app(ff, v(z)))), gg),
											),
										),
									),
								),
							),
						);
					}
				}
			}

			// among _ _
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				expr.fn.fn.name === 'among'
			) {
				// among _ universe = true
				if (expr.arg.head === 'constant' && expr.arg.name === 'universe')
					return trueExpr;

				// among x (_ y z)
				if (
					expr.arg.head === 'apply' &&
					expr.arg.fn.head === 'apply' &&
					expr.arg.fn.fn.head === 'constant'
				) {
					const amongX = expr.fn;
					const x = expr.fn.arg;
					const y = expr.arg.fn.arg;
					const z = expr.arg.arg;

					// among x (filter y z) = and (among x y) (z x)
					if (expr.arg.fn.fn.name === 'filter')
						return reduce(app(app(and, app(amongX, y)), app(z, x)));

					// among x (union y z) = or (among x y) (among x z)
					if (expr.arg.fn.fn.name === 'union')
						return reduce(app(app(or, among(x, y)), among(x, z)));
				}
			}

			// and _ _
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				expr.fn.fn.name === 'and'
			) {
				// and true f = f
				if (expr.fn.arg.head === 'constant' && expr.fn.arg.name === 'true')
					return reduce(expr.arg);
				// and f true = f
				if (expr.arg.head === 'constant' && expr.arg.name === 'true')
					return reduce(expr.fn.arg);
			}

			// or _ _
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				expr.fn.fn.name === 'or'
			) {
				// or false f = f
				if (expr.fn.arg.head === 'constant' && expr.fn.arg.name === 'false')
					return reduce(expr.arg);
				// or f false = f
				if (expr.arg.head === 'constant' && expr.arg.name === 'false')
					return reduce(expr.fn.arg);
			}

			// and_map/and_then (topic x y) (λz f)
			if (
				expr.fn.head === 'apply' &&
				expr.fn.fn.head === 'constant' &&
				(expr.fn.fn.name === 'and_map' || expr.fn.fn.name === 'and_then') &&
				expr.fn.arg.head === 'apply' &&
				expr.fn.arg.fn.head === 'apply' &&
				expr.fn.arg.fn.fn.head === 'constant' &&
				expr.fn.arg.fn.fn.name === 'topic' &&
				expr.arg.head === 'lambda'
			) {
				const extracted = extractDxResult(
					reduce(expr.fn.arg.arg),
					reduce(expr.arg.body),
				);
				if (extracted !== null) {
					assertDx(extracted.tupleDx.type);
					const tuple = extracted.tupleDx.type.inner;
					const result = (expr.fn.fn.name === 'and_map' ? andMap : andThen)(
						app(app(topic(tuple), expr.fn.arg.fn.arg), extracted.tupleDx),
						λ(tuple, () => reduce(extracted.cont)),
					);
					// Assert that the result is fully reduced to prevent an infinite loop
					// where we would try to extract the result from the new tupleDx once more
					(result as ReducedExpr)[reduced] = result;
					return result;
				}
			}

			const fn = reduce(expr.fn);
			const arg = reduce(expr.arg);
			return fn === expr.fn && arg === expr.arg ? expr : reduce(app(fn, arg));
		}
		case 'variable':
		case 'lexeme':
		case 'quote':
		case 'constant': {
			return expr;
		}
	}
}

// We use the following key on expressions to memoize reduce
const reduced = Symbol('reduced');
type ReducedExpr = Expr & { [reduced]?: Expr };

/**
 * Simplify an expression by walking through the tree looking for patterns like
 * β-reduction and `unint (int x)`.
 */
export function reduce(expr: Expr): Expr {
	if (reduced in expr) return (expr as ReducedExpr)[reduced]!;
	const result = reduce_(expr);
	(expr as ReducedExpr)[reduced] = result;
	(result as ReducedExpr)[reduced] = result;
	return result;
}
