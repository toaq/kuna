import { Unimplemented } from '../core/error';
import {
	type Expr,
	type ExprType,
	app,
	assertFn,
	closed,
	subtype,
	λ,
} from './model';
import { typeToPlainText } from './render';
import {
	type Functor,
	chooseFunctor,
	composeFunctors,
	findInner,
	getDistributive,
	getMatchingApplicative,
	getMatchingFunctor,
	getMatchingSemigroup,
	getMonad,
	getRunner,
	idFunctor,
} from './structures';

export type CompositionMode =
	| '>' // Functional application
	| '<' // Reverse functional application
	| '+' // Semigroup combination
	| ['↑L', CompositionMode] // Lift left into functor
	| ['↑R', CompositionMode] // Lift right into functor
	| ['A', CompositionMode] // Sequence effects via applicative functor
	| ['→L', CompositionMode] // Push functor inside distributive functor on the left
	| ['→R', CompositionMode] // Push functor inside distributive functor on the right
	| ['→', CompositionMode] // Push functor inside distributive functor
	| ['↓', CompositionMode] // Run effect
	| ['J', CompositionMode]; // Join monads

function coerceInput_(
	fn: Expr,
	input: ExprType,
	inputSide: 'left' | 'right' | 'out',
	mode: CompositionMode,
	under: Functor | null,
): [Expr, CompositionMode] | null {
	assertFn(fn.type);
	const { unwrap } = under ?? idFunctor;
	const inputInner = unwrap(input);
	const domainInner = unwrap(fn.type.domain);
	const range = fn.type.range;

	// If the types match there is nothing to do
	if (subtype(inputInner, domainInner)) return [fn, mode];

	// If there are matching functors in the input type and the domain, then we
	// don't need to move them around; simply continue coercion under the functor
	const functor = getMatchingFunctor(inputInner, domainInner);
	if (functor !== null)
		return coerceInput_(
			fn,
			input,
			inputSide,
			mode,
			under === null ? functor : composeFunctors(under, functor),
		);

	// The functors don't match; let's try pushing the input's outermost functor
	// inside of a distributive functor and then continuing coercion under the
	// distributive functor
	if (under !== null) {
		const distributive = getDistributive(inputInner);
		if (distributive !== null) {
			const coercedInner = under.wrap(
				distributive.functor.unwrap(inputInner),
				input,
			);
			const result = coerceInput_(fn, coercedInner, inputSide, mode, under);
			if (result !== null) {
				const [cont, mode] = result;
				return [
					app(
						λ(cont.type, closed, (cont, s) =>
							λ(input, s, (input, s) => {
								// If the input came from the left or right then the function is a
								// binary function, and we need to take special care to lift it into the
								// functor in the right way (f a → b → f c rather than f a → f (b → c))
								if (inputSide !== 'out') {
									assertFn(range);
									return λ(range.domain, s, (otherInput, s) =>
										distributive.functor.map(
											λ(coercedInner, s, (inputInner, s) =>
												app(
													app(s.var(cont), s.var(inputInner)),
													s.var(otherInput),
												),
											),
											distributive.distribute(s.var(input), under, s),
											s,
										),
									);
								}
								// This is a unary function; just 'map' it
								return distributive.functor.map(
									s.var(cont),
									distributive.distribute(s.var(input), under, s),
									s,
								);
							}),
						),
						cont,
					),
					inputSide === 'out'
						? ['→', mode]
						: [
								inputSide === 'left' ? '→L' : '→R',
								[inputSide === 'left' ? '↑R' : '↑L', mode],
							],
				];
			}
		}
	}

	return null;
}

/**
 * Given a function and an input type, build a function which accepts the type
 * as its input and "coerces" its type using Functor and Distributive instances
 * to feed it to the original function.
 * @param inputSide The side of the tree which the input comes from. If this is
 *   'left' or 'right' then the function will be treated as a binary function so
 *   that functors map like f a → b → f c rather than f a → f (b → c).
 */
function coerceInput(
	fn: Expr,
	input: ExprType,
	inputSide: 'left' | 'right' | 'out',
	mode: CompositionMode,
): [Expr, CompositionMode] | null {
	return coerceInput_(fn, input, inputSide, mode, null);
}

function composeStep(left: ExprType, right: ExprType): [Expr, CompositionMode] {
	// Functional application
	if (typeof left !== 'string' && left.head === 'fn') {
		const coerced = coerceInput(
			λ(left.domain, closed, (r, s) =>
				λ(left, s, (l, s) => app(s.var(l), s.var(r))),
			),
			right,
			'right',
			'>',
		);
		if (coerced !== null) {
			const [cont, mode] = coerced;
			return [
				app(
					λ(cont.type, closed, (cont, s) =>
						λ(left, s, (l, s) =>
							λ(right, s, (r, s) => app(app(s.var(cont), s.var(r)), s.var(l))),
						),
					),
					cont,
				),
				mode,
			];
		}
	}

	// Reverse functional application
	if (typeof right !== 'string' && right.head === 'fn') {
		const coerced = coerceInput(
			λ(right.domain, closed, (l, s) =>
				λ(right, s, (r, s) => app(s.var(r), s.var(l))),
			),
			left,
			'left',
			'<',
		);
		if (coerced !== null) return coerced;
	}

	const semigroup = getMatchingSemigroup(left, right);
	if (semigroup !== null) {
		return [semigroup.plus, '+'];
	}

	const applicative = getMatchingApplicative(left, right);
	if (applicative !== null) {
		const {
			functor: { unwrap, map },
			apply,
		} = applicative;
		const [cont, mode] = composeAndSimplify(unwrap(left), unwrap(right));
		return [
			app(
				λ(cont.type, closed, (cont, s) =>
					λ(left, s, (l, s) =>
						λ(right, s, (r, s) =>
							apply(map(s.var(cont), s.var(l), s), s.var(r), s),
						),
					),
				),
				cont,
			),
			['A', mode],
		];
	}

	const functor = chooseFunctor(left, right);
	if (functor !== null) {
		const [choice, { unwrap, map }] = functor;

		if (choice === 'left') {
			const [cont, mode] = composeAndSimplify(unwrap(left), right);
			return [
				app(
					λ(cont.type, closed, (cont, s) =>
						λ(left, s, (l, s) =>
							λ(right, s, (r, s) =>
								map(
									λ(unwrap(left), s, (l_, s) =>
										app(app(s.var(cont), s.var(l_)), s.var(r)),
									),
									s.var(l),
									s,
								),
							),
						),
					),
					cont,
				),
				['↑R', mode],
			];
		}

		const [cont, mode] = composeAndSimplify(left, unwrap(right));
		return [
			app(
				λ(cont.type, closed, (cont, s) =>
					λ(left, s, (l, s) =>
						λ(right, s, (r, s) => map(app(s.var(cont), s.var(l)), s.var(r), s)),
					),
				),
				cont,
			),
			['↑L', mode],
		];
	}

	throw new Unimplemented(
		`Composition of ${typeToPlainText(left)} and ${typeToPlainText(right)}`,
	);
}

function composeAndSimplify(
	left: ExprType,
	right: ExprType,
): [Expr, CompositionMode] {
	const result = composeStep(left, right);
	const [cont, mode] = result;
	assertFn(cont.type);
	assertFn(cont.type.range);
	const out = cont.type.range.range;

	// Try running the output effect
	const runner = getRunner(out);
	if (runner !== null) {
		const coerced = coerceInput(runner.run, out, 'out', mode);
		if (coerced !== null) {
			const [run, mode] = coerced;
			return [
				app(
					app(
						λ(run.type, closed, (run, s) =>
							λ(cont.type, s, (cont, s) =>
								λ(left, s, (l, s) =>
									λ(right, s, (r, s) =>
										app(s.var(run), app(app(s.var(cont), s.var(l)), s.var(r))),
									),
								),
							),
						),
						run,
					),
					cont,
				),
				['↓', mode],
			];
		}
	}

	// Try joining repeated monadic effects
	const monad = getMonad(out);
	if (monad !== null) {
		const {
			applicative: {
				functor: { wrap, unwrap },
			},
			join,
		} = monad;
		const inner = findInner(unwrap(out), out);
		if (inner !== null) {
			const coerced = coerceInput(
				λ(wrap(wrap(inner, out), out), closed, (e, s) => join(s.var(e), s)),
				out,
				'out',
				mode,
			);
			if (coerced !== null) {
				const [join, mode] = coerced;
				return [
					app(
						app(
							λ(join.type, closed, (join, s) =>
								λ(cont.type, s, (cont, s) =>
									λ(left, s, (l, s) =>
										λ(right, s, (r, s) =>
											app(
												s.var(join),
												app(app(s.var(cont), s.var(l)), s.var(r)),
											),
										),
									),
								),
							),
							join,
						),
						cont,
					),
					['J', mode],
				];
			}
		}
	}

	return result;
}

/**
 * Composes the denotations of two trees together.
 * @returns The denotation and the steps that were taken to compose it.
 */
export function compose(left: Expr, right: Expr): [Expr, CompositionMode] {
	const [cont, mode] = composeAndSimplify(left.type, right.type);
	return [app(app(cont, left), right), mode];
}
