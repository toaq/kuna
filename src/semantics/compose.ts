import { Unimplemented } from '../core/error';
import {
	type Expr,
	type ExprType,
	type Scope,
	app,
	assertFn,
	assertInt,
	closed,
	int,
	subtype,
	unint,
	λ,
} from './model';
import { typeToPlainText } from './render';

const intFunctor: Functor = {
	inner: type => {
		assertInt(type);
		return type.inner;
	},
	fmap: (fn, arg, s) => {
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
				λ(fn.type, s, (f, s) =>
					λ(arg.type, s, (arg, s) =>
						int(
							λ('s', s, (w, s) =>
								app(
									app(unint(s.var(f)), s.var(w)),
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

export type CompositionMode =
	| '>' // Functional application
	| '<' // Reverse functional application
	| '↑L' // Lift left into functor
	| '↑R' // Left right into functor
	| 'A'; // Sequence effects via applicative functor

interface Functor {
	inner: (type: ExprType) => ExprType;
	fmap: (fn: Expr, arg: Expr, scope: Scope) => Expr;
}

interface Applicative {
	functor: Functor;
	apply: (fn: Expr, arg: Expr, scope: Scope) => Expr;
}

export function compose_(
	left: ExprType,
	right: ExprType,
	mode: CompositionMode[],
): Expr {
	if (
		typeof left !== 'string' &&
		left.head === 'fn' &&
		subtype(right, left.domain)
	) {
		mode.push('>');
		return λ(left, closed, (l, s) => s.var(l));
	}

	if (
		typeof right !== 'string' &&
		right.head === 'fn' &&
		subtype(left, right.domain)
	) {
		mode.push('<');
		return λ(right, closed, (r, s) => s.var(r));
	}

	if (typeof left !== 'string' && typeof right !== 'string') {
		let applicative: Applicative | null = null;
		if (left.head === 'int' && right.head === 'int')
			applicative = intApplicative;

		if (applicative !== null) {
			mode.push('A');
			const {
				functor: { inner, fmap },
				apply,
			} = applicative;
			const cont = compose_(inner(left), inner(right), mode);
			return app(
				λ(cont.type, closed, (cont, s) =>
					λ(left, s, (l, s) =>
						λ(right, s, (r, s) =>
							apply(fmap(s.var(cont), s.var(l), s), s.var(r), s),
						),
					),
				),
				cont,
			);
		}
	}

	if (typeof right !== 'string') {
		let functor: Functor | null = null;
		if (right.head === 'int') functor = intFunctor;

		if (functor !== null) {
			mode.push('↑L');
			const { inner, fmap } = functor;
			const cont = compose_(left, inner(right), mode);
			return app(
				λ(cont.type, closed, (cont, s) =>
					λ(left, s, (l, s) =>
						λ(right, s, (r, s) =>
							fmap(
								λ(inner(right), s, (r_, s) =>
									app(app(s.var(cont), s.var(l)), s.var(r_)),
								),
								s.var(r),
								s,
							),
						),
					),
				),
				cont,
			);
		}
	}

	throw new Unimplemented(
		`Composition of ${typeToPlainText(left)} and ${typeToPlainText(right)}`,
	);
}

export function compose(left: Expr, right: Expr): [Expr, CompositionMode[]] {
	const mode: CompositionMode[] = [];
	return [app(app(compose_(left.type, right.type, mode), left), right), mode];
}
