import { Impossible } from '../core/error';
import {
	type Expr,
	type ExprType,
	Fn,
	type Scope,
	type SetHead,
	app,
	assertCont,
	assertFn,
	assertInt,
	assertPair,
	cont,
	flatMap,
	int,
	map,
	pair,
	uncont,
	unint,
	unpair,
	λ,
} from './model';
import { typeToPlainText } from './render';

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

const setApplicative = (head: SetHead): Applicative => ({
	functor: {
		inner: type => {
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
const genApplicative = setApplicative('gen');
const genFunctor = genApplicative.functor;
const qnApplicative = setApplicative('qn');
const qnFunctor = qnApplicative.functor;

const pairFunctor: Functor = {
	inner: type => {
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

export function getFunctor(t: ExprType): Functor | null {
	if (typeof t === 'string') return null;
	if (t.head === 'int') return intFunctor;
	if (t.head === 'cont') return contFunctor;
	if (t.head === 'pl') return plFunctor;
	if (t.head === 'gen') return genFunctor;
	if (t.head === 'qn') return qnFunctor;
	if (t.head === 'pair') return pairFunctor;
	return null;
}

export function getApplicative(t1: ExprType, t2: ExprType): Applicative | null {
	if (typeof t1 === 'string' || typeof t2 === 'string') return null;
	if (t1.head !== t2.head) return null;
	if (t1.head === 'int') return intApplicative;
	if (t1.head === 'cont') return contApplicative;
	if (t1.head === 'pl') return plApplicative;
	if (t1.head === 'gen') return genApplicative;
	if (t1.head === 'qn') return qnApplicative;
	return null;
}
