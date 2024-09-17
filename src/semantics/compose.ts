import { Unimplemented } from '../core/error';
import { type Expr, type ExprType, app, closed, subtype, λ } from './model';
import { typeToPlainText } from './render';
import { getApplicative, getFunctor } from './structures';

export type CompositionMode =
	| '>' // Functional application
	| '<' // Reverse functional application
	| '↑L' // Lift left into functor
	| '↑R' // Left right into functor
	| 'A'; // Sequence effects via applicative functor

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

	const applicative = getApplicative(left, right);
	if (applicative !== null) {
		mode.push('A');
		const {
			functor: { inner, map },
			apply,
		} = applicative;
		const cont = compose_(inner(left), inner(right), mode);
		return app(
			λ(cont.type, closed, (cont, s) =>
				λ(left, s, (l, s) =>
					λ(right, s, (r, s) =>
						apply(map(s.var(cont), s.var(l), s), s.var(r), s),
					),
				),
			),
			cont,
		);
	}

	const leftFunctor = getFunctor(left);
	if (leftFunctor !== null) {
		mode.push('↑R');
		const { inner, map } = leftFunctor;
		const cont = compose_(inner(left), right, mode);
		return app(
			λ(cont.type, closed, (cont, s) =>
				λ(left, s, (l, s) =>
					λ(right, s, (r, s) =>
						map(
							λ(inner(left), s, (l_, s) =>
								app(app(s.var(cont), s.var(l_)), s.var(r)),
							),
							s.var(l),
							s,
						),
					),
				),
			),
			cont,
		);
	}

	const rightFunctor = getFunctor(right);
	if (rightFunctor !== null) {
		mode.push('↑L');
		const { inner, map } = rightFunctor;
		const cont = compose_(left, inner(right), mode);
		return app(
			λ(cont.type, closed, (cont, s) =>
				λ(left, s, (l, s) =>
					λ(right, s, (r, s) => map(app(s.var(cont), s.var(l)), s.var(r), s)),
				),
			),
			cont,
		);
	}

	throw new Unimplemented(
		`Composition of ${typeToPlainText(left)} and ${typeToPlainText(right)}`,
	);
}

export function compose(left: Expr, right: Expr): [Expr, CompositionMode[]] {
	const mode: CompositionMode[] = [];
	return [app(app(compose_(left.type, right.type, mode), left), right), mode];
}
