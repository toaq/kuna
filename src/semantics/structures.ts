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
	v,
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
	plus: λ('()', () => λ('()', second => v(second))),
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
				λ(fn.type, fn =>
					λ(arg.type, arg =>
						int(λ('s', w => app(v(fn), app(unint(v(arg)), v(w))))),
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
				λ(fn.type, fn =>
					λ(arg.type, arg =>
						int(
							λ('s', w =>
								app(app(unint(v(fn)), v(w)), app(unint(v(arg)), v(w))),
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
				λ(fn.type, fn =>
					λ(arg.type, arg =>
						cont(
							λ(Fn(range, 't'), pred =>
								app(
									uncont(v(arg)),
									λ(domain, arg_ => app(v(pred), app(v(fn), v(arg_)))),
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
				λ(fn.type, fn =>
					λ(arg.type, arg =>
						cont(
							λ(Fn(range, 't'), pred =>
								app(
									uncont(v(fn)),
									λ(Fn(domain, range), project =>
										app(
											uncont(v(arg)),
											λ(domain, arg_ => app(v(pred), app(v(project), v(arg_)))),
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
			λ('t', t => v(t)),
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
				λ(fn.type, fn => λ(arg.type, arg => map(v(arg), v(fn)))),
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
				λ(fn.type, fn =>
					λ(arg.type, arg =>
						flatMap(
							v(fn),
							λ(fnType, project => map(v(arg), v(project))),
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
				λ(e.type, e => λ('t', t => app(app(implies, among(v(t), v(e))), v(t)))),
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
						λ(fn.type, fn =>
							λ(restriction, r =>
								λ(body, b =>
									construct(
										v(r),
										λ(domain, val => app(v(fn), app(v(b), v(val)))),
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
					λ(arg.type, arg =>
						λ(restriction1, r1 =>
							λ(body1, b1 =>
								deconstruct(
									v(arg),
									λ(restriction2, r2 =>
										λ(body2, b2 =>
											construct(
												λ(domain, d =>
													unpair(
														v(d),
														λ(domain1, d1 =>
															λ(domain2, d2 =>
																app(
																	app(and, app(v(r1), v(d1))),
																	app(v(r2), v(d2)),
																),
															),
														),
													),
												),
												λ(domain, d =>
													unpair(
														v(d),
														λ(domain1, d1 =>
															λ(domain2, d2 =>
																app(app(v(b1), v(d1)), app(v(b2), v(d2))),
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
			λ(restriction1, r1 =>
				λ(body1, b1 =>
					construct(
						λ(domain, d =>
							unpair(
								v(d),
								λ(domain1, d1 =>
									λ(domain2, d2 =>
										app(
											app(and, app(v(r1), v(d1))),
											deconstruct(
												app(v(b1), v(d1)),
												λ(restriction2, r2 =>
													λ(body2, () => app(v(r2), v(d2))),
												),
											),
										),
									),
								),
							),
						),
						λ(domain, d =>
							unpair(
								v(d),
								λ(domain1, d1 =>
									λ(domain2, d2 =>
										deconstruct(
											app(v(b1), v(d1)),
											λ(restriction2, () => λ(body2, b2 => app(v(b2), v(d2)))),
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
			λ(Fn(domain, 't'), r =>
				λ(Fn(domain, 't'), b =>
					some(λ(domain, d => app(app(and, app(v(r), v(d))), app(v(b), v(d))))),
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
				λ(fn.type, fn =>
					λ(inner, val =>
						λ(supplement, sup => pair(app(v(fn), v(val)), v(sup))),
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
				λ(fn.type, fn =>
					λ(Int(Pl('e')), boundVal =>
						λ(inner, val => bind(binding, v(boundVal), app(v(fn), v(val)))),
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
			λ(Int(Pl('e')), boundVal =>
				λ(inner, val =>
					applicative.functor.map(
						λ(innerInner, innerVal => bind(binding, v(boundVal), v(innerVal))),
						v(val),
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
			λ(Int(Pl('e')), () => λ(inner, val => v(val))),
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
				λ(fn.type, fn =>
					λ(arg.type, arg =>
						ref(
							binding,
							λ(Int(Pl('e')), val => app(v(fn), app(unref(v(arg)), v(val)))),
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
				λ(fn.type, fn =>
					λ(arg.type, arg =>
						ref(
							binding,
							λ(Int(Pl('e')), val =>
								app(app(unref(v(fn)), v(val)), app(unref(v(arg)), v(val))),
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
			λ(e.type, e =>
				ref(
					type.binding,
					λ(Int(Pl('e')), val =>
						functor.map(
							λ(Ref(type.binding, inner), x => app(unref(v(x)), v(val))),
							v(e),
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
				λ(fn.type, fn =>
					λ(arg.type, arg =>
						nf(λ(domain, val => app(v(fn), app(unnf(v(arg)), v(val))))),
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
				λ(fn.type, fn =>
					λ(arg.type, arg =>
						nf(
							λ(domain, val =>
								app(app(unnf(v(fn)), v(val)), app(unnf(v(arg)), v(val))),
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
			λ(e.type, e =>
				nf(
					λ(type.domain, val =>
						functor.map(
							λ(Nf(type.domain, inner), x => app(unnf(v(x)), v(val))),
							v(e),
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
						λ(fn.type, fn => λ(arg.type, arg => andMap(v(arg), v(fn)))),
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
					λ(fn.type, fn =>
						λ(arg.type, arg =>
							andThen(
								v(fn),
								λ(fnType, project => andMap(v(arg), v(project))),
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
			λ(e.type.inner, inner => v(inner)),
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
			λ(e.type, e =>
				int(
					λ('s', w =>
						functor.map(
							λ(Int(inner), x => app(unint(v(x)), v(w))),
							v(e),
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
			λ(e.type, e =>
				int(λ('s', w => app(unint(app(unint(v(e)), v(w))), v(w)))),
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
					λ(plus.type, plus =>
						λ(left, l =>
							λ(right, r =>
								λ(domain, x =>
									app(app(v(plus), app(v(l), v(x))), app(v(r), v(x))),
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
					λ(fn.type, fn =>
						λ(outer.unwrap(arg.type), x => inner.map(v(fn), v(x))),
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
					λ(outer.functor.unwrap(e.type), x =>
						inner.sequence(v(x), applicative),
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
