import { Impossible } from '../core/error';
import {
	Act,
	Bind,
	Cont,
	Dx,
	Fn,
	Int,
	Nf,
	Pair,
	Pl,
	Ref,
	among,
	and,
	andMap,
	andThen,
	app,
	assertAct,
	assertBind,
	assertCont,
	assertDx,
	assertFn,
	assertGen,
	assertInt,
	assertNf,
	assertPair,
	assertPl,
	assertRef,
	bind,
	bindingsEqual,
	closed,
	cont,
	every,
	flatMap,
	gen,
	implies,
	int,
	map,
	nf,
	pair,
	qn,
	ref,
	some,
	subtype,
	typesCompatible,
	typesEqual,
	unbind,
	uncont,
	ungen,
	unint,
	unnf,
	unpair,
	unqn,
	unref,
	λ,
} from './model';
import { typeToPlainText } from './render';
import type { AnimacyClass, Binding, Expr, ExprType } from './types';

export interface Semigroup {
	/**
	 * Combines two elements of the semigroup associatively.
	 */
	plus: Expr;
}

export interface Functor {
	/**
	 * Wraps a type in the functor to form a new "outer" type.
	 */
	wrap: (type: ExprType, like: ExprType) => ExprType;
	/**
	 * Unwraps a type in the functor to get its "inner" type.
	 */
	unwrap: (type: ExprType) => ExprType;
	/**
	 * Lifts a function into the functor.
	 * @param fn The function to be lifted.
	 * @param arg The argument in the functor.
	 */
	map: (fn: Expr, arg: Expr) => Expr;
}

export interface Applicative {
	functor: Functor;
	// There is no 'pure' here because we don't really need it
	/**
	 * Applies a function to an argument, sequencing their actions.
	 * @param fn The function in the applicative functor.
	 * @param arg The argument in the applicative functor.
	 */
	apply: (fn: Expr, arg: Expr) => Expr;
}

export interface Distributive {
	functor: Functor;
	/**
	 * Pulls the distributive functor out of another functor.
	 * @param e The expression.
	 * @param functor The functor for the outer layer of the expression.
	 */
	distribute: (e: Expr, functor: Functor) => Expr;
}

export interface Traversable {
	functor: Functor;
	/**
	 * Pushes the traversable functor into an applicative functor.
	 * @param e The expression.
	 * @param applicative The applicative functor for the inner layer of the
	 *   expression.
	 */
	sequence: (e: Expr, applicative: Applicative) => Expr;
}

export interface Monad {
	applicative: Applicative;
	/**
	 * Collapse two layers of the monad into one.
	 */
	join: (e: Expr) => Expr;
}

export interface Comonad {
	functor: Functor;
	// There is no 'extend' here because we don't really need it
	/**
	 * Extracts an inner value from the comonad.
	 */
	extract: (e: Expr) => Expr;
}

export interface Runner {
	functor: Functor;
	/**
	 * Whether this effect "likes" to be run. A non-eager effect will instead
	 * prefer to scope out of scope islands.
	 */
	eager: boolean;
	/**
	 * Performs some sort of closure over the effect.
	 */
	run: (e: Expr) => Expr;
}

const tSemigroup: Semigroup = {
	plus: and,
};

const unitSemigroup: Semigroup = {
	plus: λ('()', closed, (_first, s) =>
		λ('()', s, (second, s) => s.var(second)),
	),
};

export const idFunctor: Functor = {
	wrap: type => type,
	unwrap: type => type,
	map: app,
};

const intFunctor: Functor = {
	wrap: type => Int(type),
	unwrap: type => {
		assertInt(type);
		return type.inner;
	},
	map: (fn, arg) => {
		assertFn(fn.type);
		return app(
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						int(
							λ('s', s, (w, s) =>
								app(s.var(fn), app(unint(s.var(arg)), s.var(w))),
							),
						),
					),
				),
				fn,
			),
			arg,
		);
	},
};

const intApplicative: Applicative = {
	functor: intFunctor,
	apply: (fn, arg) => {
		assertInt(fn.type);
		assertFn(fn.type.inner);
		return app(
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						int(
							λ('s', s, (w, s) =>
								app(
									app(unint(s.var(fn)), s.var(w)),
									app(unint(s.var(arg)), s.var(w)),
								),
							),
						),
					),
				),
				fn,
			),
			arg,
		);
	},
};

const contFunctor: Functor = {
	wrap: type => Cont(type),
	unwrap: type => {
		assertCont(type);
		return type.inner;
	},
	map: (fn, arg) => {
		assertFn(fn.type);
		const { domain, range } = fn.type;
		return app(
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						cont(
							λ(Fn(range, 't'), s, (pred, s) =>
								app(
									uncont(s.var(arg)),
									λ(domain, s, (arg_, s) =>
										app(s.var(pred), app(s.var(fn), s.var(arg_))),
									),
								),
							),
						),
					),
				),
				fn,
			),
			arg,
		);
	},
};

const contApplicative: Applicative = {
	functor: contFunctor,
	apply: (fn, arg) => {
		assertCont(fn.type);
		assertFn(fn.type.inner);
		const { domain, range } = fn.type.inner;
		return app(
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						cont(
							λ(Fn(range, 't'), s, (pred, s) =>
								app(
									uncont(s.var(fn)),
									λ(Fn(domain, range), s, (project, s) =>
										app(
											uncont(s.var(arg)),
											λ(domain, s, (arg_, s) =>
												app(s.var(pred), app(s.var(project), s.var(arg_))),
											),
										),
									),
								),
							),
						),
					),
				),
				fn,
			),
			arg,
		);
	},
};

const contRunner: Runner = {
	functor: contFunctor,
	eager: true,
	run: e =>
		app(
			uncont(e),
			λ('t', closed, (t, s) => s.var(t)),
		),
};

const plFunctor: Functor = {
	wrap: type => Pl(type),
	unwrap: type => {
		assertPl(type);
		return type.inner;
	},
	map: (fn, arg) => {
		assertPl(arg.type);
		return app(
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(arg.type, s, (arg, s) => map(s.var(arg), s.var(fn))),
				),
				fn,
			),
			arg,
		);
	},
};

const plApplicative: Applicative = {
	functor: plFunctor,
	apply: (fn, arg) => {
		assertPl(fn.type);
		const fnType = fn.type.inner;
		return app(
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						flatMap(
							s.var(fn),
							λ(fnType, s, (project, s) => map(s.var(arg), s.var(project))),
						),
					),
				),
				fn,
			),
			arg,
		);
	},
};

const plRunner: Runner = {
	functor: plFunctor,
	eager: true,
	run: e =>
		every(
			app(
				λ(e.type, closed, (e, s) =>
					λ('t', s, (t, s) =>
						app(app(implies, among(s.var(t), s.var(e))), s.var(t)),
					),
				),
				e,
			),
		),
};

const genOrQnMonad = (
	head: 'gen' | 'qn',
	construct: (restriction: Expr, body: Expr) => Expr,
	deconstruct: (e: Expr, project: Expr) => Expr,
): Monad => ({
	applicative: {
		functor: {
			wrap: (type, like) => {
				if (typeof like === 'string' || like.head !== head)
					throw new Impossible(
						`${typeToPlainText(like)} is not a ${head} type`,
					);
				return { ...like, inner: type };
			},
			unwrap: type => {
				if (typeof type === 'string' || type.head !== head)
					throw new Impossible(
						`${typeToPlainText(type)} is not a ${head} type`,
					);
				return type.inner;
			},
			map: (fn, arg) => {
				if (typeof arg.type === 'string' || arg.type.head !== head)
					throw new Impossible(
						`${typeToPlainText(arg.type)} is not a ${head} type`,
					);
				const { inner, domain } = arg.type;
				const restriction = Fn(domain, 't');
				const body = Fn(domain, inner);
				return deconstruct(
					arg,
					app(
						λ(fn.type, closed, (fn, s) =>
							λ(restriction, s, (r, s) =>
								λ(body, s, (b, s) =>
									construct(
										s.var(r),
										λ(domain, s, (val, s) =>
											app(s.var(fn), app(s.var(b), s.var(val))),
										),
									),
								),
							),
						),
						fn,
					),
				);
			},
		},
		apply: (fn, arg) => {
			if (typeof fn.type === 'string' || fn.type.head !== head)
				throw new Impossible(
					`${typeToPlainText(fn.type)} is not a ${head} type`,
				);
			if (typeof arg.type === 'string' || arg.type.head !== head)
				throw new Impossible(
					`${typeToPlainText(arg.type)} is not a ${head} type`,
				);
			const { inner: inner1, domain: domain1 } = fn.type;
			const { inner: inner2, domain: domain2 } = arg.type;
			const domain = Pair(domain1, domain2);
			const restriction1 = Fn(domain1, 't');
			const body1 = Fn(domain1, inner1);
			const restriction2 = Fn(domain2, 't');
			const body2 = Fn(domain2, inner2);

			return deconstruct(
				fn,
				app(
					λ(arg.type, closed, (arg, s) =>
						λ(restriction1, s, (r1, s) =>
							λ(body1, s, (b1, s) =>
								deconstruct(
									s.var(arg),
									λ(restriction2, s, (r2, s) =>
										λ(body2, s, (b2, s) =>
											construct(
												λ(domain, s, (d, s) =>
													unpair(
														s.var(d),
														λ(domain1, s, (d1, s) =>
															λ(domain2, s, (d2, s) =>
																app(
																	app(and, app(s.var(r1), s.var(d1))),
																	app(s.var(r2), s.var(d2)),
																),
															),
														),
													),
												),
												λ(domain, s, (d, s) =>
													unpair(
														s.var(d),
														λ(domain1, s, (d1, s) =>
															λ(domain2, s, (d2, s) =>
																app(
																	app(s.var(b1), s.var(d1)),
																	app(s.var(b2), s.var(d2)),
																),
															),
														),
													),
												),
											),
										),
									),
								),
							),
						),
					),
					arg,
				),
			);
		},
	},
	join: e => {
		if (typeof e.type === 'string' || e.type.head !== head)
			throw new Impossible(`${typeToPlainText(e.type)} is not a ${head} type`);
		if (typeof e.type.inner === 'string' || e.type.inner.head !== head)
			throw new Impossible(
				`${typeToPlainText(e.type.inner)} is not a ${head} type`,
			);
		const {
			domain: domain1,
			inner: { domain: domain2, inner },
		} = e.type;
		const domain = Pair(domain1, domain2);
		const restriction1 = Fn(domain1, 't');
		const body1 = Fn(domain1, e.type.inner);
		const restriction2 = Fn(domain2, 't');
		const body2 = Fn(domain2, inner);
		return deconstruct(
			e,
			λ(restriction1, closed, (r1, s) =>
				λ(body1, s, (b1, s) =>
					construct(
						λ(domain, s, (d, s) =>
							unpair(
								s.var(d),
								λ(domain1, s, (d1, s) =>
									λ(domain2, s, (d2, s) =>
										app(
											app(and, app(s.var(r1), s.var(d1))),
											deconstruct(
												app(s.var(b1), s.var(d1)),
												λ(restriction2, s, (r2, s) =>
													λ(body2, s, (_, s) => app(s.var(r2), s.var(d2))),
												),
											),
										),
									),
								),
							),
						),
						λ(domain, s, (d, s) =>
							unpair(
								s.var(d),
								λ(domain1, s, (d1, s) =>
									λ(domain2, s, (d2, s) =>
										deconstruct(
											app(s.var(b1), s.var(d1)),
											λ(restriction2, s, (_, s) =>
												λ(body2, s, (b2, s) => app(s.var(b2), s.var(d2))),
											),
										),
									),
								),
							),
						),
					),
				),
			),
		);
	},
});

const genMonad = genOrQnMonad('gen', gen, ungen);
const genApplicative = genMonad.applicative;
const genFunctor = genApplicative.functor;

const genRunner: Runner = {
	functor: genFunctor,
	eager: false,
	run: e => {
		assertGen(e.type);
		const { domain } = e.type;
		return ungen(
			e,
			λ(Fn(domain, 't'), closed, (r, s) =>
				λ(Fn(domain, 't'), s, (b, s) =>
					some(
						λ(domain, s, (d, s) =>
							app(app(and, app(s.var(r), s.var(d))), app(s.var(b), s.var(d))),
						),
					),
				),
			),
		);
	},
};

const qnMonad = genOrQnMonad('qn', qn, unqn);
const qnApplicative = qnMonad.applicative;
const qnFunctor = qnApplicative.functor;

const pairFunctor: Functor = {
	wrap: (type, like) => {
		assertPair(like);
		return Pair(type, like.supplement);
	},
	unwrap: type => {
		assertPair(type);
		return type.inner;
	},
	map: (fn, arg) => {
		assertPair(arg.type);
		const { inner, supplement } = arg.type;
		return unpair(
			arg,
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(inner, s, (val, s) =>
						λ(supplement, s, (sup, s) =>
							pair(app(s.var(fn), s.var(val)), s.var(sup)),
						),
					),
				),
				fn,
			),
		);
	},
};

const bindFunctor: Functor = {
	wrap: (type, like) => {
		assertBind(like);
		return Bind(like.binding, type);
	},
	unwrap: type => {
		assertBind(type);
		return type.inner;
	},
	map: (fn, arg) => {
		assertBind(arg.type);
		const { binding, inner } = arg.type;
		return unbind(
			arg,
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(Int(Pl('e')), s, (boundVal, s) =>
						λ(inner, s, (val, s) =>
							bind(binding, s.var(boundVal), app(s.var(fn), s.var(val))),
						),
					),
				),
				fn,
			),
		);
	},
};

const bindTraversable: Traversable = {
	functor: bindFunctor,
	sequence: (e, applicative) => {
		assertBind(e.type);
		const { binding, inner } = e.type;
		const innerInner = applicative.functor.unwrap(inner);
		return unbind(
			e,
			λ(Int(Pl('e')), closed, (boundVal, s) =>
				λ(inner, s, (val, s) =>
					applicative.functor.map(
						λ(innerInner, s, (innerVal, s) =>
							bind(binding, s.var(boundVal), s.var(innerVal)),
						),
						s.var(val),
					),
				),
			),
		);
	},
};

const bindComonad: Comonad = {
	functor: bindFunctor,
	extract: e => {
		assertBind(e.type);
		const { inner } = e.type;
		return unbind(
			e,
			λ(Int(Pl('e')), closed, (_, s) => λ(inner, s, (val, s) => s.var(val))),
		);
	},
};

const refFunctor: Functor = {
	wrap: (type, like) => {
		assertRef(like);
		return Ref(like.binding, type);
	},
	unwrap: type => {
		assertRef(type);
		return type.inner;
	},
	map: (fn, arg) => {
		assertRef(arg.type);
		const binding = arg.type.binding;
		return app(
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						ref(
							binding,
							λ(Int(Pl('e')), s, (val, s) =>
								app(s.var(fn), app(unref(s.var(arg)), s.var(val))),
							),
						),
					),
				),
				fn,
			),
			arg,
		);
	},
};

const refApplicative: Applicative = {
	functor: refFunctor,
	apply: (fn, arg) => {
		assertRef(arg.type);
		const binding = arg.type.binding;
		return app(
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						ref(
							binding,
							λ(Int(Pl('e')), s, (val, s) =>
								app(
									app(unref(s.var(fn)), s.var(val)),
									app(unref(s.var(arg)), s.var(val)),
								),
							),
						),
					),
				),
				fn,
			),
			arg,
		);
	},
};

const refDistributive: Distributive = {
	functor: refFunctor,
	distribute: (e, functor) => {
		const type = functor.unwrap(e.type);
		assertRef(type);
		const inner = type.inner;
		return app(
			λ(e.type, closed, (e, s) =>
				ref(
					type.binding,
					λ(Int(Pl('e')), s, (val, s) =>
						functor.map(
							λ(Ref(type.binding, inner), s, (x, s) =>
								app(unref(s.var(x)), s.var(val)),
							),
							s.var(e),
						),
					),
				),
			),
			e,
		);
	},
};

const nfFunctor: Functor = {
	wrap: (type, like) => {
		assertNf(like);
		return Nf(like.domain, type);
	},
	unwrap: type => {
		assertNf(type);
		return type.inner;
	},
	map: (fn, arg) => {
		assertNf(arg.type);
		const domain = arg.type.domain;
		return app(
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						nf(
							λ(domain, s, (val, s) =>
								app(s.var(fn), app(unnf(s.var(arg)), s.var(val))),
							),
						),
					),
				),
				fn,
			),
			arg,
		);
	},
};

const nfApplicative: Applicative = {
	functor: nfFunctor,
	apply: (fn, arg) => {
		assertNf(arg.type);
		const domain = arg.type.domain;
		return app(
			app(
				λ(fn.type, closed, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						nf(
							λ(domain, s, (val, s) =>
								app(
									app(unnf(s.var(fn)), s.var(val)),
									app(unnf(s.var(arg)), s.var(val)),
								),
							),
						),
					),
				),
				fn,
			),
			arg,
		);
	},
};

const nfDistributive: Distributive = {
	functor: nfFunctor,
	distribute: (e, functor) => {
		const type = functor.unwrap(e.type);
		assertNf(type);
		const inner = type.inner;
		return app(
			λ(e.type, closed, (e, s) =>
				nf(
					λ(type.domain, s, (val, s) =>
						functor.map(
							λ(Nf(type.domain, inner), s, (x, s) =>
								app(unnf(s.var(x)), s.var(val)),
							),
							s.var(e),
						),
					),
				),
			),
			e,
		);
	},
};

const opMonad = <T extends ExprType>(
	wrap: (inner: ExprType) => ExprType,
	assertHead: (t: ExprType) => asserts t is T & { inner: ExprType },
): Monad => ({
	applicative: {
		functor: {
			wrap,
			unwrap: type => {
				assertHead(type);
				return type.inner;
			},
			map: (fn, arg) =>
				app(
					app(
						λ(fn.type, closed, (fn, s) =>
							λ(arg.type, s, (arg, s) => andMap(s.var(arg), s.var(fn))),
						),
						fn,
					),
					arg,
				),
		},
		apply: (fn, arg) => {
			assertHead(fn.type);
			const fnType = fn.type.inner;
			return app(
				app(
					λ(fn.type, closed, (fn, s) =>
						λ(arg.type, s, (arg, s) =>
							andThen(
								s.var(fn),
								λ(fnType, s, (project, s) =>
									andMap(s.var(arg), s.var(project)),
								),
							),
						),
					),
					fn,
				),
				arg,
			);
		},
	},
	join: e => {
		assertHead(e.type);
		return andThen(
			e,
			λ(e.type.inner, closed, (inner, s) => s.var(inner)),
		);
	},
});

const dxMonad = opMonad(Dx, assertDx);
const dxApplicative = dxMonad.applicative;
const dxFunctor = dxApplicative.functor;

const actMonad = opMonad(Act, assertAct);
const actApplicative = actMonad.applicative;
const actFunctor = actApplicative.functor;

const intDistributive: Distributive = {
	functor: intFunctor,
	distribute: (e, functor) => {
		const type = functor.unwrap(e.type);
		assertInt(type);
		const inner = type.inner;
		return app(
			λ(e.type, closed, (e, s) =>
				int(
					λ('s', s, (w, s) =>
						functor.map(
							λ(Int(inner), s, (x, s) => app(unint(s.var(x)), s.var(w))),
							s.var(e),
						),
					),
				),
			),
			e,
		);
	},
};

const intMonad: Monad = {
	applicative: intApplicative,
	join: e => {
		assertInt(e.type);
		assertInt(e.type.inner);
		return app(
			λ(e.type, closed, (e, s) =>
				int(
					λ('s', s, (w, s) =>
						app(unint(app(unint(s.var(e)), s.var(w))), s.var(w)),
					),
				),
			),
			e,
		);
	},
};

export function getMatchingSemigroup(
	left: ExprType,
	right: ExprType,
): Semigroup | null {
	if (typeof left === 'string') {
		if (left !== right) return null;
		// Trivial semigroups
		if (left === 't') return tSemigroup;
		if (left === '()') return unitSemigroup;
	} else if (
		left.head === 'fn' &&
		typeof right !== 'string' &&
		right.head === 'fn' &&
		typesCompatible(left.domain, right.domain)
	) {
		const semigroup = getMatchingSemigroup(left.range, right.range);
		if (semigroup !== null) {
			// Predicate modification
			const { plus } = semigroup;
			const domain = subtype(left.domain, right.domain)
				? left.domain
				: right.domain;
			return {
				plus: app(
					λ(plus.type, closed, (plus, s) =>
						λ(left, s, (l, s) =>
							λ(right, s, (r, s) =>
								λ(domain, s, (x, s) =>
									app(
										app(s.var(plus), app(s.var(l), s.var(x))),
										app(s.var(r), s.var(x)),
									),
								),
							),
						),
					),
					plus,
				),
			};
		}
	}
	return null;
}

const functorPrecedence = new Map(
	(
		[
			// Starting with lowest precedence
			'dx',
			'act',
			'pair',
			'bind',
			'qn',
			'gen',
			'cont',
			'pl',
		] as (ExprType & object)['head'][]
	).map((head, i) => [head, i]),
);

const bindingTypePrecedence = new Map(
	(['head', 'animacy', 'name', 'resumptive'] as Binding['type'][]).map(
		(type, i) => [type, i],
	),
);

const animacyPrecedence = new Map(
	(['animate', 'inanimate', 'abstract', 'descriptive'] as AnimacyClass[]).map(
		(animacy, i) => [animacy, i],
	),
);

export function getFunctor(t: ExprType): Functor | null {
	if (typeof t === 'string') return null;
	if (t.head === 'int') return intFunctor;
	if (t.head === 'cont') return contFunctor;
	if (t.head === 'pl') return plFunctor;
	if (t.head === 'gen') return genFunctor;
	if (t.head === 'qn') return qnFunctor;
	if (t.head === 'pair') return pairFunctor;
	if (t.head === 'bind') return bindFunctor;
	if (t.head === 'ref') return refFunctor;
	if (t.head === 'nf') return nfFunctor;
	if (t.head === 'dx') return dxFunctor;
	if (t.head === 'act') return actFunctor;
	return null;
}

function chooseEffect_(left: ExprType, right: ExprType): ExprType {
	if (typeof left === 'string' || left.head === 'fn') return right;
	if (typeof right === 'string' || right.head === 'fn') return left;

	if (left.head === right.head) {
		if (left.head === 'bind' || left.head === 'ref') {
			const rightCasted = right as ExprType & object & { head: 'bind' | 'ref' };
			if (left.binding.type === rightCasted.binding.type) {
				switch (left.binding.type) {
					case 'resumptive':
						return right;
					case 'name':
						return (rightCasted.binding as Binding & { type: 'name' }).verb <=
							left.binding.verb
							? right
							: left;
					case 'animacy':
						return animacyPrecedence.get(
							(rightCasted.binding as Binding & { type: 'animacy' }).class,
						)! <= animacyPrecedence.get(left.binding.class)!
							? right
							: left;
					case 'head':
						return (rightCasted.binding as Binding & { type: 'head' }).head <=
							left.binding.head
							? right
							: left;
				}
			}
			return bindingTypePrecedence.get(rightCasted.binding.type)! >
				bindingTypePrecedence.get(left.binding.type)!
				? right
				: left;
		}
	}

	return functorPrecedence.get(right.head)! >= functorPrecedence.get(left.head)!
		? right
		: left;
}

/**
 * Given two types which may or may not be effectful, determine which effect has
 * higher precedence (should scope under the other). Biased toward the right.
 */
export function chooseEffect(
	left: ExprType,
	right: ExprType,
): { choice: ExprType; strong: boolean } {
	if (typeof left === 'string' || left.head === 'fn')
		return { choice: right, strong: false };
	if (typeof right === 'string' || right.head === 'fn')
		return { choice: left, strong: false };
	if (!functorPrecedence.has(left.head)) return { choice: left, strong: false };
	if (!functorPrecedence.has(right.head))
		return { choice: right, strong: false };
	return { choice: chooseEffect_(left, right), strong: true };
}

export function getMatchingFunctor(t1: ExprType, t2: ExprType): Functor | null {
	if (typeof t1 === 'string' || typeof t2 === 'string') return null;
	if (t1.head !== t2.head) return null;
	if (t1.head === 'int') return intFunctor;
	if (t1.head === 'cont') return contFunctor;
	if (t1.head === 'pl') return plFunctor;
	if (t1.head === 'gen') return genFunctor;
	if (t1.head === 'qn') return qnFunctor;
	if (
		t1.head === 'pair' &&
		typesEqual(
			t1.supplement,
			(t2 as ExprType & object & { head: 'pair' }).supplement,
		)
	)
		return pairFunctor;
	if (
		t1.head === 'bind' &&
		bindingsEqual(
			t1.binding,
			(t2 as ExprType & object & { head: 'bind' }).binding,
		)
	)
		return bindFunctor;
	if (
		t1.head === 'ref' &&
		bindingsEqual(
			t1.binding,
			(t2 as ExprType & object & { head: 'ref' }).binding,
		)
	)
		return refFunctor;
	if (
		t1.head === 'nf' &&
		typesEqual(t1.domain, (t2 as ExprType & object & { head: 'nf' }).domain)
	)
		return nfFunctor;
	if (t1.head === 'dx') return dxFunctor;
	if (t1.head === 'act') return actFunctor;
	return null;
}

export function composeFunctors(outer: Functor, inner: Functor): Functor {
	return {
		wrap: (type, like) =>
			outer.wrap(inner.wrap(type, outer.unwrap(like)), like),
		unwrap: type => inner.unwrap(outer.unwrap(type)),
		map: (fn, arg) =>
			outer.map(
				app(
					λ(fn.type, closed, (fn, s) =>
						λ(outer.unwrap(arg.type), s, (x, s) =>
							inner.map(s.var(fn), s.var(x)),
						),
					),
					fn,
				),
				arg,
			),
	};
}

export function getApplicative(t: ExprType): Applicative | null {
	if (typeof t === 'string') return null;
	if (t.head === 'int') return intApplicative;
	if (t.head === 'cont') return contApplicative;
	if (t.head === 'pl') return plApplicative;
	if (t.head === 'gen') return genApplicative;
	if (t.head === 'qn') return qnApplicative;
	if (t.head === 'ref') return refApplicative;
	if (t.head === 'nf') return nfApplicative;
	if (t.head === 'dx') return dxApplicative;
	if (t.head === 'act') return actApplicative;
	return null;
}

export function getMatchingApplicative(
	t1: ExprType,
	t2: ExprType,
): Applicative | null {
	return getMatchingFunctor(t1, t2) && getApplicative(t1);
}

export function getDistributive(t: ExprType): Distributive | null {
	if (typeof t === 'string') return null;
	if (t.head === 'ref') return refDistributive;
	if (t.head === 'nf') return nfDistributive;
	if (t.head === 'int') return intDistributive;
	return null;
}

export function getTraversable(t: ExprType): Traversable | null {
	if (typeof t === 'string') return null;
	if (t.head === 'bind') return bindTraversable;
	return null;
}

function composeTraversables(
	outer: Traversable,
	inner: Traversable,
): Traversable {
	return {
		functor: composeFunctors(outer.functor, inner.functor),
		sequence: (e, applicative) => {
			return outer.sequence(
				outer.functor.map(
					λ(outer.functor.unwrap(e.type), closed, (x, s) =>
						inner.sequence(s.var(x), applicative),
					),
					e,
				),
				applicative,
			);
		},
	};
}

/**
 * Gets the "largest" possible Traversable instance for a given type by
 * composing multiple Traversable instances together.
 */
export function getBigTraversable(t: ExprType): Traversable | null {
	const outer = getTraversable(t);
	if (outer === null) return null;
	const inner = getBigTraversable(outer.functor.unwrap(t));
	return inner === null ? outer : composeTraversables(outer, inner);
}

export function getMonad(t: ExprType): Monad | null {
	if (typeof t === 'string') return null;
	if (t.head === 'int') return intMonad;
	if (t.head === 'dx') return dxMonad;
	if (t.head === 'act') return actMonad;
	if (t.head === 'gen') return genMonad;
	if (t.head === 'qn') return qnMonad;
	return null;
}

export function getMatchingMonad(t1: ExprType, t2: ExprType): Monad | null {
	return getMatchingFunctor(t1, t2) && getMonad(t1);
}

export function getComonad(t: ExprType): Comonad | null {
	if (typeof t === 'string') return null;
	if (t.head === 'bind') return bindComonad;
	return null;
}

export function getMatchingComonad(t1: ExprType, t2: ExprType): Comonad | null {
	return getMatchingFunctor(t1, t2) && getComonad(t1);
}

export function getRunner(t: ExprType): Runner | null {
	if (typeof t === 'string') return null;
	if (t.head === 'cont') return contRunner;
	if (t.head === 'pl') return plRunner;
	if (t.head === 'gen') return genRunner;
	return null;
}

/**
 * Given a type and a type constructor to search for, find the inner type given
 * by unwrapping the first occurrence of that type constructor within the type
 * constructor stack.
 */
export function findInner(inType: ExprType, like: ExprType): ExprType | null {
	if (typeof inType === 'string' || typeof like === 'string') return null;
	if (
		inType.head === like.head &&
		(inType.head === 'int' ||
			inType.head === 'cont' ||
			inType.head === 'pl' ||
			inType.head === 'gen' ||
			inType.head === 'qn' ||
			(inType.head === 'pair' &&
				typesEqual(
					inType.supplement,
					(like as ExprType & object & { head: 'pair' }).supplement,
				)) ||
			(inType.head === 'bind' &&
				bindingsEqual(
					inType.binding,
					(like as ExprType & object & { head: 'bind' }).binding,
				)) ||
			(inType.head === 'ref' &&
				bindingsEqual(
					inType.binding,
					(like as ExprType & object & { head: 'ref' }).binding,
				)) ||
			(inType.head === 'nf' &&
				typesEqual(
					inType.domain,
					(like as ExprType & object & { head: 'nf' }).domain,
				)) ||
			inType.head === 'dx' ||
			inType.head === 'act')
	)
		return inType.inner;
	const functor = getFunctor(inType);
	return functor && findInner(functor.unwrap(inType), like);
}

export function unwrapEffects(type: ExprType): ExprType {
	const functor = getFunctor(type);
	return functor === null ? type : unwrapEffects(functor.unwrap(type));
}
