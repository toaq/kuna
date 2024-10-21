import { Impossible } from '../core/error';
import {
	type AnimacyClass,
	Bind,
	type Binding,
	Cont,
	type Expr,
	type ExprType,
	Fn,
	IO,
	Int,
	Pair,
	Pl,
	Ref,
	type Scope,
	type SetHead,
	andMap,
	andThen,
	app,
	assertBind,
	assertCont,
	assertFn,
	assertIO,
	assertInt,
	assertPair,
	assertRef,
	bind,
	bindingsEqual,
	closed,
	cont,
	element,
	every,
	flatMap,
	implies,
	int,
	map,
	pair,
	ref,
	typesEqual,
	unbind,
	uncont,
	unint,
	unpair,
	unref,
	λ,
} from './model';
import { typeToPlainText } from './render';

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
	map: (fn: Expr, arg: Expr, scope: Scope) => Expr;
}

export interface Applicative {
	functor: Functor;
	// There is no 'pure' here because we don't really need it
	/**
	 * Applies a function to an argument, sequencing their actions.
	 * @param fn The function in the applicative functor.
	 * @param arg The argument in the applicative functor.
	 */
	apply: (fn: Expr, arg: Expr, scope: Scope) => Expr;
}

export interface Distributive {
	functor: Functor;
	/**
	 * Pushes a functor inside the distributive functor.
	 * @param e The expression.
	 * @param functor The functor for the outer layer of the expression.
	 */
	distribute: (e: Expr, functor: Functor, scope: Scope) => Expr;
}

export interface Monad {
	applicative: Applicative;
	/**
	 * Collapse two layers of the monad into one.
	 */
	join: (e: Expr, scope: Scope) => Expr;
}

export interface Runner {
	functor: Functor;
	run: Expr;
}

export const idFunctor: Functor = {
	wrap: type => type,
	unwrap: type => type,
	map: (fn, arg) => app(fn, arg),
};

const intFunctor: Functor = {
	wrap: type => Int(type),
	unwrap: type => {
		assertInt(type);
		return type.inner;
	},
	map: (fn, arg, s) => {
		assertFn(fn.type);
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
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
	apply: (fn, arg, s) => {
		assertInt(fn.type);
		assertFn(fn.type.inner);
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
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
	map: (fn, arg, s) => {
		assertFn(fn.type);
		const { domain, range } = fn.type;
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
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
	apply: (fn, arg, s) => {
		assertCont(fn.type);
		assertFn(fn.type.inner);
		const { domain, range } = fn.type.inner;
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
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
	run: λ(Cont('t'), closed, (cont, s) =>
		app(
			uncont(s.var(cont)),
			λ('t', s, (t, s) => s.var(t)),
		),
	),
};

const setApplicative = (head: SetHead): Applicative => ({
	functor: {
		wrap: type => ({ head, inner: type }),
		unwrap: type => {
			if (typeof type === 'string' || type.head !== head)
				throw new Impossible(`${typeToPlainText(type)} is not a ${head} type`);
			return type.inner;
		},
		map: (fn, arg, s) => {
			if (typeof arg.type === 'string' || arg.type.head !== head)
				throw new Impossible(
					`${typeToPlainText(arg.type)} is not a ${head} type`,
				);
			return app(
				app(
					λ(fn.type, s, (fn, s) =>
						λ(arg.type, s, (arg, s) => map(s.var(arg), s.var(fn))),
					),
					fn,
				),
				arg,
			);
		},
	},
	apply: (fn, arg, s) => {
		if (typeof fn.type === 'string' || fn.type.head !== head)
			throw new Impossible(`${typeToPlainText(fn.type)} is not a ${head} type`);
		const fnType = fn.type.inner;
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
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
});

const plApplicative = setApplicative('pl');
const plFunctor = plApplicative.functor;

const plRunner: Runner = {
	functor: plFunctor,
	run: λ(Pl('t'), closed, (pl, s) =>
		every(
			λ('t', s, (t, s) =>
				app(app(implies(s), element(s.var(t), s.var(pl))), s.var(t)),
			),
		),
	),
};

const genApplicative = setApplicative('gen');
const genFunctor = genApplicative.functor;

const qnApplicative = setApplicative('qn');
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
	map: (fn, arg, s) => {
		assertPair(arg.type);
		const { inner, supplement } = arg.type;
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						pair(
							app(
								s.var(fn),
								unpair(
									s.var(arg),
									λ(inner, s, (val, s) =>
										λ(supplement, s, (_, s) => s.var(val)),
									),
								),
							),
							unpair(
								s.var(arg),
								λ(inner, s, (_, s) => λ(supplement, s, (val, s) => s.var(val))),
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

const bindFunctor: Functor = {
	wrap: (type, like) => {
		assertBind(like);
		return Bind(like.binding, type);
	},
	unwrap: type => {
		assertBind(type);
		return type.inner;
	},
	map: (fn, arg, s) => {
		assertBind(arg.type);
		const { binding, inner } = arg.type;
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						bind(
							binding,
							unbind(
								s.var(arg),
								λ(Int(Pl('e')), s, (val, s) =>
									λ(inner, s, (_, s) => s.var(val)),
								),
							),
							app(
								s.var(fn),
								unbind(
									s.var(arg),
									λ(Int(Pl('e')), s, (_, s) =>
										λ(inner, s, (val, s) => s.var(val)),
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

const refFunctor: Functor = {
	wrap: (type, like) => {
		assertRef(like);
		return Ref(like.binding, type);
	},
	unwrap: type => {
		assertRef(type);
		return type.inner;
	},
	map: (fn, arg, s) => {
		assertRef(arg.type);
		const binding = arg.type.binding;
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
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
	apply: (fn, arg, s) => {
		assertRef(arg.type);
		const binding = arg.type.binding;
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
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

const ioFunctor: Functor = {
	wrap: type => IO(type),
	unwrap: type => {
		assertIO(type);
		return type.inner;
	},
	map: (fn, arg, s) => {
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
					λ(arg.type, s, (arg, s) => andMap(s.var(arg), s.var(fn))),
				),
				fn,
			),
			arg,
		);
	},
};

const ioApplicative: Applicative = {
	functor: ioFunctor,
	apply: (fn, arg, s) => {
		assertIO(fn.type);
		const fnType = fn.type.inner;
		return app(
			app(
				λ(fn.type, s, (fn, s) =>
					λ(arg.type, s, (arg, s) =>
						andThen(
							s.var(fn),
							λ(fnType, s, (project, s) => andMap(s.var(arg), s.var(project))),
						),
					),
				),
				fn,
			),
			arg,
		);
	},
};

const intDistributive: Distributive = {
	functor: intFunctor,
	distribute: (e, functor, s) => {
		const type = functor.unwrap(e.type);
		assertInt(type);
		const inner = type.inner;
		return app(
			λ(e.type, s, (e, s) =>
				int(
					λ('s', s, (w, s) =>
						functor.map(
							λ(Int(inner), s, (x, s) => app(unint(s.var(x)), s.var(w))),
							s.var(e),
							s,
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
	join: (e, s) => {
		assertInt(e.type);
		assertInt(e.type.inner);
		return app(
			λ(e.type, s, (e, s) =>
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

const functorPrecedence = new Map(
	(
		[
			// Starting with lowest precedence
			'io',
			'cont',
			'pair',
			'qn',
			'gen',
			'ref',
			'bind',
			'int',
			'pl',
		] as (ExprType & object)['head'][]
	).map((head, i) => [head, i]),
);

const bindingTypePrecedence = new Map(
	(['resumptive', 'verb', 'animacy', 'head'] as Binding['type'][]).map(
		(type, i) => [type, i],
	),
);

const animacyPrecedence = new Map(
	(['animate', 'inanimate', 'abstract', 'descriptive'] as AnimacyClass[]).map(
		(animacy, i) => [animacy, i],
	),
);

function chooseFunctor_(left: ExprType, right: ExprType): ExprType {
	if (typeof left === 'string' || left.head === 'fn') return right;
	if (typeof right === 'string' || right.head === 'fn') return left;
	if (left.head === right.head) {
		if (left.head === 'bind' || left.head === 'ref') {
			const rightCasted = right as ExprType & object & { head: 'bind' | 'ref' };
			if (left.binding.type === rightCasted.binding.type) {
				switch (left.binding.type) {
					case 'resumptive':
						return left;
					case 'verb':
						return left.binding.verb <=
							(rightCasted.binding as Binding & { type: 'verb' }).verb
							? left
							: right;
					case 'animacy':
						return animacyPrecedence.get(left.binding.class)! <=
							animacyPrecedence.get(
								(rightCasted.binding as Binding & { type: 'animacy' }).class,
							)!
							? left
							: right;
					case 'head':
						return left.binding.head <=
							(rightCasted.binding as Binding & { type: 'head' }).head
							? left
							: right;
				}
			}
			return bindingTypePrecedence.get(left.binding.type)! <
				bindingTypePrecedence.get(rightCasted.binding.type)!
				? left
				: right;
		}
		return left;
	}
	return functorPrecedence.get(left.head)! < functorPrecedence.get(right.head)!
		? left
		: right;
}

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
	if (t.head === 'io') return ioFunctor;
	return null;
}

/**
 * Given two types which may or may not be functors, determine which functor
 * should scope over the other. Biased toward the left.
 */
export function chooseFunctor(
	left: ExprType,
	right: ExprType,
): ['left' | 'right', Functor] | null {
	const choice = chooseFunctor_(left, right);
	const f = getFunctor(choice);
	return f && [choice === left ? 'left' : 'right', f];
}

export function getMatchingFunctor(
	left: ExprType,
	right: ExprType,
): Functor | null {
	if (typeof left === 'string' || typeof right === 'string') return null;
	if (left.head !== right.head) return null;
	if (left.head === 'int') return intFunctor;
	if (left.head === 'cont') return contFunctor;
	if (left.head === 'pl') return plFunctor;
	if (left.head === 'gen') return genFunctor;
	if (left.head === 'qn') return qnFunctor;
	if (
		left.head === 'pair' &&
		typesEqual(
			left.supplement,
			(right as ExprType & object & { head: 'pair' }).supplement,
		)
	)
		return pairFunctor;
	if (
		left.head === 'bind' &&
		bindingsEqual(
			left.binding,
			(right as ExprType & object & { head: 'bind' }).binding,
		)
	)
		return refFunctor;
	if (
		left.head === 'ref' &&
		bindingsEqual(
			left.binding,
			(right as ExprType & object & { head: 'ref' }).binding,
		)
	)
		return refFunctor;
	if (left.head === 'io') return ioFunctor;
	return null;
}

export function composeFunctors(outer: Functor, inner: Functor): Functor {
	return {
		wrap: (type, like) =>
			outer.wrap(inner.wrap(type, outer.unwrap(like)), like),
		unwrap: type => inner.unwrap(outer.unwrap(type)),
		map: (fn, arg, s) =>
			outer.map(
				λ(outer.unwrap(arg.type), s, (x, s) => inner.map(fn, s.var(x), s)),
				arg,
				s,
			),
	};
}

export function getApplicative(
	left: ExprType,
	right: ExprType,
): Applicative | null {
	if (typeof left === 'string' || typeof right === 'string') return null;
	if (left.head !== right.head) return null;
	if (left.head === 'int') return intApplicative;
	if (left.head === 'cont') return contApplicative;
	if (left.head === 'pl') return plApplicative;
	if (left.head === 'gen') return genApplicative;
	if (left.head === 'qn') return qnApplicative;
	if (
		left.head === 'ref' &&
		bindingsEqual(
			left.binding,
			(right as ExprType & object & { head: 'ref' }).binding,
		)
	)
		return refApplicative;
	if (left.head === 'io') return ioApplicative;
	return null;
}

export function getDistributive(t: ExprType): Distributive | null {
	if (typeof t === 'string') return null;
	if (t.head === 'int') return intDistributive;
	return null;
}

export function getMonad(t: ExprType): Monad | null {
	if (typeof t === 'string') return null;
	if (t.head === 'int') return intMonad;
	return null;
}

export function getRunner(t: ExprType): Runner | null {
	if (typeof t === 'string') return null;
	if (t.head === 'pl') return plRunner;
	if (t.head === 'cont') return contRunner;
	return null;
}

/**
 * Given a type and a type constructor to search for, find the inner type given
 * by unwrapping the first occurrence of that type constructor within the type
 * constructor stack.
 */
export function findInner(inType: ExprType, like: ExprType): ExprType | null {
	if (typeof inType === 'string' || typeof like === 'string') return null;
	if (inType.head !== like.head) {
		const functor = getFunctor(inType);
		return functor && findInner(functor.unwrap(inType), like);
	}
	if (inType.head === 'int') return inType.inner;
	if (inType.head === 'cont') return inType.inner;
	if (inType.head === 'pl') return inType.inner;
	if (inType.head === 'gen') return inType.inner;
	if (inType.head === 'qn') return inType.inner;
	if (
		inType.head === 'pair' &&
		typesEqual(
			inType.supplement,
			(like as ExprType & object & { head: 'pair' }).supplement,
		)
	)
		return inType.inner;
	if (
		inType.head === 'bind' &&
		bindingsEqual(
			inType.binding,
			(like as ExprType & object & { head: 'bind' }).binding,
		)
	)
		return inType.inner;
	if (
		inType.head === 'ref' &&
		bindingsEqual(
			inType.binding,
			(like as ExprType & object & { head: 'ref' }).binding,
		)
	)
		return inType.inner;
	if (inType.head === 'io') return inType.inner;
	return null;
}
