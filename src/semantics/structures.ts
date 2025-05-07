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
	 * @param domain The domain of the lifted function.
	 * @param range The range of the lifted function.
	 */
	map: (
		fn: () => Expr,
		arg: () => Expr,
		domain: ExprType,
		range: ExprType,
	) => Expr;
}

export interface Applicative {
	functor: Functor;
	// There is no 'pure' here because we don't really need it
	/**
	 * Applies a function to an argument, sequencing their actions.
	 * @param fn The function in the applicative functor.
	 * @param arg The argument in the applicative functor.
	 * @param range The range of the function.
	 */
	apply: (fn: () => Expr, arg: () => Expr, range: ExprType) => Expr;
}

export interface Distributive {
	functor: Functor;
	/**
	 * Pulls the distributive functor out of another functor.
	 * @param e The expression.
	 * @param functor The functor for the outer layer of the expression.
	 * @param type The type of the expression.
	 */
	distribute: (e: () => Expr, functor: Functor, type: ExprType) => Expr;
}

export interface Traversable {
	functor: Functor;
	/**
	 * Pushes the traversable functor into an applicative functor.
	 * @param e The expression.
	 * @param applicative The applicative functor for the inner layer of the
	 *   expression.
	 * @param type The type of the expression.
	 */
	sequence: (e: () => Expr, applicative: Applicative, type: ExprType) => Expr;
}

export interface Monad {
	applicative: Applicative;
	/**
	 * Collapse two layers of the monad into one.
	 */
	join: (e: () => Expr) => Expr;
}

export interface Comonad {
	functor: Functor;
	// There is no 'extend' here because we don't really need it
	/**
	 * Extracts an inner value from the comonad.
	 */
	extract: (e: () => Expr) => Expr;
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
	run: (e: () => Expr) => Expr;
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
	map: (fn, arg) => app(fn(), arg()),
};

const intFunctor: Functor = {
	wrap: type => Int(type),
	unwrap: type => {
		assertInt(type);
		return type.inner;
	},
	map: (fn, arg) => int(λ('s', w => app(fn(), app(unint(arg()), v(w))))),
};

const intApplicative: Applicative = {
	functor: intFunctor,
	apply: (fn, arg) =>
		int(λ('s', w => app(app(unint(fn()), v(w)), app(unint(arg()), v(w))))),
};

const contFunctor: Functor = {
	wrap: type => Cont(type),
	unwrap: type => {
		assertCont(type);
		return type.inner;
	},
	map: (fn, arg, _domain, range) => {
		assertCont(range);
		return cont(
			λ(Fn(range.inner, 't'), pred => {
				const arg_ = arg();
				assertCont(arg_.type);
				return app(
					uncont(arg_),
					λ(arg_.type.inner, arg_ => app(v(pred), app(fn(), v(arg_)))),
				);
			}),
		);
	},
};

const contApplicative: Applicative = {
	functor: contFunctor,
	apply: (fn, arg, range) =>
		cont(
			λ(Fn(range, 't'), pred => {
				const fn_ = fn();
				assertCont(fn_.type);
				assertFn(fn_.type.inner);
				const { domain } = fn_.type.inner;
				return app(
					uncont(fn_),
					λ(fn_.type, project =>
						app(
							uncont(arg()),
							λ(domain, arg_ => app(v(pred), app(v(project), v(arg_)))),
						),
					),
				);
			}),
		),
};

const contRunner: Runner = {
	functor: contFunctor,
	eager: true,
	run: e =>
		app(
			uncont(e()),
			λ('t', t => v(t)),
		),
};

const plFunctor: Functor = {
	wrap: type => Pl(type),
	unwrap: type => {
		assertPl(type);
		return type.inner;
	},
	map: (fn, arg) => map(arg(), fn()),
};

const plApplicative: Applicative = {
	functor: plFunctor,
	apply: (fn, arg) => {
		const fn_ = fn();
		assertPl(fn_.type);
		const fnType = fn_.type.inner;
		return flatMap(
			fn_,
			λ(fnType, project => map(arg(), v(project))),
		);
	},
};

const plRunner: Runner = {
	functor: plFunctor,
	eager: true,
	run: e => every(λ('t', t => app(app(implies, among(v(t), e())), v(t)))),
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
				const arg_ = arg();
				if (typeof arg_.type === 'string' || arg_.type.head !== head)
					throw new Impossible(
						`${typeToPlainText(arg_.type)} is not a ${head} type`,
					);
				const { inner, domain } = arg_.type;
				const restriction = Fn(domain, 't');
				const body = Fn(domain, inner);
				return deconstruct(
					arg(),
					λ(restriction, r =>
						λ(body, b =>
							construct(
								v(r),
								λ(domain, val => app(fn(), app(v(b), v(val)))),
							),
						),
					),
				);
			},
		},
		apply: (fn, arg) => {
			const fn_ = fn();
			if (typeof fn_.type === 'string' || fn_.type.head !== head)
				throw new Impossible(
					`${typeToPlainText(fn_.type)} is not a ${head} type`,
				);
			const { inner: inner1, domain: domain1 } = fn_.type;
			const restriction1 = Fn(domain1, 't');
			const body1 = Fn(domain1, inner1);

			return deconstruct(
				fn_,
				λ(restriction1, r1 =>
					λ(body1, b1 => {
						const arg_ = arg();
						if (typeof arg_.type === 'string' || arg_.type.head !== head)
							throw new Impossible(
								`${typeToPlainText(arg_.type)} is not a ${head} type`,
							);
						const { inner: inner2, domain: domain2 } = arg_.type;
						const domain = Pair(domain1, domain2);
						const restriction2 = Fn(domain2, 't');
						const body2 = Fn(domain2, inner2);

						return deconstruct(
							arg_,
							λ(restriction2, r2 =>
								λ(body2, b2 =>
									construct(
										λ(domain, d =>
											unpair(
												v(d),
												λ(domain1, d1 =>
													λ(domain2, d2 =>
														app(app(and, app(v(r1), v(d1))), app(v(r2), v(d2))),
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
						);
					}),
				),
			);
		},
	},
	join: e => {
		const e_ = e();
		if (typeof e_.type === 'string' || e_.type.head !== head)
			throw new Impossible(`${typeToPlainText(e_.type)} is not a ${head} type`);
		if (typeof e_.type.inner === 'string' || e_.type.inner.head !== head)
			throw new Impossible(
				`${typeToPlainText(e_.type.inner)} is not a ${head} type`,
			);
		const {
			domain: domain1,
			inner: { domain: domain2, inner },
		} = e_.type;
		const domain = Pair(domain1, domain2);
		const restriction1 = Fn(domain1, 't');
		const body1 = Fn(domain1, e_.type.inner);
		const restriction2 = Fn(domain2, 't');
		const body2 = Fn(domain2, inner);

		return deconstruct(
			e_,
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
		const e_ = e();
		assertGen(e_.type);
		const { domain } = e_.type;
		return ungen(
			e_,
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
		const arg_ = arg();
		assertPair(arg_.type);
		const { inner, supplement } = arg_.type;
		return unpair(
			arg_,
			λ(inner, val => λ(supplement, sup => pair(app(fn(), v(val)), v(sup)))),
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
		const arg_ = arg();
		assertBind(arg_.type);
		const { binding, inner } = arg_.type;
		return unbind(
			arg_,
			λ(Int(Pl('e')), boundVal =>
				λ(inner, val => bind(binding, v(boundVal), app(fn(), v(val)))),
			),
		);
	},
};

const bindTraversable: Traversable = {
	functor: bindFunctor,
	sequence: (e, applicative) => {
		const e_ = e();
		assertBind(e_.type);
		const { binding, inner } = e_.type;
		const innerInner = applicative.functor.unwrap(inner);
		return unbind(
			e_,
			λ(Int(Pl('e')), boundVal =>
				λ(inner, val =>
					applicative.functor.map(
						() =>
							λ(innerInner, innerVal =>
								bind(binding, v(boundVal), v(innerVal)),
							),
						() => v(val),
						inner,
						applicative.functor.wrap(Bind(binding, innerInner), inner),
					),
				),
			),
		);
	},
};

const bindComonad: Comonad = {
	functor: bindFunctor,
	extract: e => {
		const e_ = e();
		assertBind(e_.type);
		const { inner } = e_.type;
		return unbind(
			e_,
			λ(Int(Pl('e')), () => λ(inner, val => v(val))),
		);
	},
};

// This is an eager Runner instance that applies only to Bind áq _, to prevent
// áq bindings from scoping too far out of their 𝘷P
const bindReflexiveRunner: Runner = {
	functor: bindFunctor,
	eager: true,
	run: e => {
		const e_ = e();
		assertBind(e_.type);
		const { inner } = e_.type;
		return unbind(
			e_,
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
	map: (fn, arg, domain) => {
		assertRef(domain);
		return ref(
			domain.binding,
			λ(Int(Pl('e')), val => app(fn(), app(unref(arg()), v(val)))),
		);
	},
};

const refApplicative: Applicative = {
	functor: refFunctor,
	apply: (fn, arg) => {
		const arg_ = arg();
		assertRef(arg_.type);
		const binding = arg_.type.binding;
		return ref(
			binding,
			λ(Int(Pl('e')), val =>
				app(app(unref(fn()), v(val)), app(unref(arg_), v(val))),
			),
		);
	},
};

const refDistributive: Distributive = {
	functor: refFunctor,
	distribute: (e, functor, type) => {
		const type_ = functor.unwrap(type);
		assertRef(type_);
		assertFn(type_.inner);
		return ref(
			type_!.binding,
			λ(Int(Pl('e')), val =>
				functor.map(
					() =>
						λ(Ref(type_.binding, type_.inner), x => app(unref(v(x)), v(val))),
					e,
					type,
					functor.wrap(type_.inner, type),
				),
			),
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
	map: (fn, arg, domain) => {
		assertNf(domain);
		return nf(λ(domain.domain, val => app(fn(), app(unnf(arg()), v(val)))));
	},
};

const nfApplicative: Applicative = {
	functor: nfFunctor,
	apply: (fn, arg) => {
		const arg_ = arg();
		assertNf(arg_.type);
		const domain = arg_.type.domain;
		return nf(
			λ(domain, val => app(app(unnf(fn()), v(val)), app(unnf(arg_), v(val)))),
		);
	},
};

const nfDistributive: Distributive = {
	functor: nfFunctor,
	distribute: (e, functor, type) => {
		const type_ = functor.unwrap(type);
		assertNf(type_);
		assertFn(type_.inner);
		return nf(
			λ(type_.domain, val =>
				functor.map(
					() => λ(Nf(type_.domain, type_.inner), x => app(unnf(v(x)), v(val))),
					e,
					type,
					functor.wrap(type_.inner, type),
				),
			),
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
			map: (fn, arg) => andMap(arg(), fn()),
		},
		apply: (fn, arg) => {
			const fn_ = fn();
			assertHead(fn_.type);
			const fnType = fn_.type.inner;
			return andThen(
				fn_,
				λ(fnType, project => andMap(arg(), v(project))),
			);
		},
	},
	join: e => {
		const e_ = e();
		assertHead(e_.type);
		return andThen(
			e_,
			λ(e_.type.inner, inner => v(inner)),
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
	distribute: (e, functor, type) => {
		const type_ = functor.unwrap(type);
		assertInt(type_);
		return int(
			λ('s', w =>
				functor.map(
					() => λ(Int(type_.inner), x => app(unint(v(x)), v(w))),
					e,
					type,
					functor.wrap(type_.inner, type),
				),
			),
		);
	},
};

const intMonad: Monad = {
	applicative: intApplicative,
	join: e => int(λ('s', w => app(unint(app(unint(e()), v(w))), v(w)))),
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
	(
		[
			'head',
			'animacy',
			'name',
			'reflexive',
			'gap',
			'resumptive',
		] as Binding['type'][]
	).map((type, i) => [type, i]),
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
					case 'gap':
					case 'reflexive':
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
		map: (fn, arg, domain, range) => {
			const domainInner = outer.unwrap(domain);
			return outer.map(
				() =>
					λ(domainInner, x =>
						inner.map(fn, () => v(x), domainInner, outer.unwrap(range)),
					),
				arg,
				domain,
				range,
			);
		},
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
	if (t.head === 'bind' && t.binding.type !== 'reflexive')
		return bindTraversable;
	return null;
}

function composeTraversables(
	outer: Traversable,
	inner: Traversable,
): Traversable {
	const functor = composeFunctors(outer.functor, inner.functor);
	return {
		functor,
		sequence: (e, applicative, type) => {
			const likeInner = outer.functor.unwrap(type);
			const likeApplicative = inner.functor.unwrap(likeInner);
			const typeInner = applicative.functor.unwrap(likeApplicative);
			const partiallySequenced = outer.functor.wrap(
				applicative.functor.wrap(
					inner.functor.wrap(typeInner, likeInner),
					likeApplicative,
				),
				type,
			);
			return outer.sequence(
				() =>
					outer.functor.map(
						() =>
							λ(likeInner, x =>
								inner.sequence(() => v(x), applicative, likeInner),
							),
						e,
						type,
						partiallySequenced,
					),
				applicative,
				partiallySequenced,
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
	if (t.head === 'bind' && t.binding.type === 'reflexive')
		return bindReflexiveRunner;
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
