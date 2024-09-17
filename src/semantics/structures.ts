import {
	type Expr,
	type ExprType,
	Fn,
	type Scope,
	app,
	assertCont,
	assertFn,
	assertInt,
	cont,
	int,
	uncont,
	unint,
	λ,
} from './model';

export interface Functor {
	/**
	 * Unwraps a type in the functor to get its "inner" type.
	 */
	inner: (type: ExprType) => ExprType;
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

const intFunctor: Functor = {
	inner: type => {
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
	inner: type => {
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

export function getFunctor(t: ExprType): Functor | null {
	if (typeof t === 'string') return null;
	if (t.head === 'int') return intFunctor;
	if (t.head === 'cont') return contFunctor;
	return null;
}

export function getApplicative(t1: ExprType, t2: ExprType): Applicative | null {
	if (typeof t1 === 'string' || typeof t2 === 'string') return null;
	if (t1.head !== t2.head) return null;
	if (t1.head === 'int') return intApplicative;
	if (t2.head === 'cont') return contApplicative;
	return null;
}
