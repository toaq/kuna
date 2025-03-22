import { Unimplemented } from '../core/error';
import {
	type Expr,
	type ExprType,
	Int,
	Pl,
	app,
	assertFn,
	bindingsEqual,
	closed,
	subtype,
	typesEqual,
	unbind,
	unref,
	λ,
} from './model';
import { typeToPlainText } from './render';
import {
	type Functor,
	chooseFunctor,
	composeFunctors,
	getApplicative,
	getBigTraversable,
	getComonad,
	getDistributive,
	getFunctor,
	getMatchingApplicative,
	getMatchingFunctor,
	getMatchingMonad,
	getMatchingSemigroup,
	getMonad,
	getRunner,
	idFunctor,
} from './structures';

export type CompositionMode =
	| '>' // Functional application
	| '<' // Reverse functional application
	| '+' // Semigroup combination
	| ['L', CompositionMode] // Lift left into functor
	| ['R', CompositionMode] // Lift right into functor
	| ['A', CompositionMode] // Sequence effects via applicative functor
	| ['←L', CompositionMode] // Pull distributive functor out of functor on the left
	| ['←R', CompositionMode] // Pull distributive functor out of functor on the right
	| ['←', CompositionMode] // Pull distributive functor out of functor
	| ['→L', CompositionMode] // Push traversable functor into applicative on the left
	| ['→R', CompositionMode] // Push traversable functor into applicative on the right
	| ['→', CompositionMode] // Push traversable functor into applicative
	| ['↓L', CompositionMode] // Extract from effect on the left
	| ['↓R', CompositionMode] // Extract from effect on the right
	| ['↓', CompositionMode] // Extract from effect
	| ['JL', CompositionMode] // Join monads on the left
	| ['JR', CompositionMode] // Join monads on the right
	| ['J', CompositionMode] // Join monads
	| ['Z', CompositionMode]; // Resolve binding relationship

/**
 * Given a type and a type constructor to search for, find the inner type given
 * by pushing all traversables into the first occurrence of that type
 * constructor and unwrapping the type constructor. The idea is that this
 * represents the inner type after coercion.
 */
function findCoercedInner(inType: ExprType, like: ExprType): ExprType | null {
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
			inType.head === 'dx' ||
			inType.head === 'act')
	)
		return inType.inner;

	const traversable = getBigTraversable(inType);
	if (traversable !== null) {
		const result = findCoercedInner(traversable.functor.unwrap(inType), like);
		return result && traversable.functor.wrap(result, inType);
	}
	const functor = getFunctor(inType);
	return functor && findCoercedInner(functor.unwrap(inType), like);
}

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

	// The functors don't match
	if (under !== null) {
		// Let's try pulling a distributive functor out of the input's outermost
		// functor and then continuing conversion under the distributive functor
		const distributive = getDistributive(inputInner);
		if (distributive !== null) {
			const coercedInner = under.wrap(
				distributive.functor.unwrap(inputInner),
				input,
			);
			const result = coerceInput_(fn, coercedInner, inputSide, mode, under);
			if (result !== null) {
				const [cont, mode] = result;
				let joined = false;
				return [
					app(
						λ(cont.type, closed, (cont, s) =>
							λ(input, s, (input, s) => {
								// We're going to have to do something with the effect that floats to
								// the top after distributing. The most "efficient" thing to do is join
								// it with the effect just under it.
								const distributed = distributive.distribute(
									s.var(input),
									under,
									s,
								);
								const monad = getMatchingMonad(
									distributed.type,
									distributive.functor.unwrap(distributed.type),
								);
								if (monad !== null) {
									joined = true;
									return app(s.var(cont), monad.join(distributed, s));
								}

								// Unable to join the effect; map over it instead.

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
						? ['←', joined ? ['J', mode] : mode]
						: [
								inputSide === 'left' ? '←L' : '←R',
								[
									joined
										? inputSide === 'left'
											? 'JL'
											: 'JR'
										: inputSide === 'left'
											? 'R'
											: 'L',
									mode,
								],
							],
				];
			}
		}

		const traversable = getBigTraversable(inputInner);
		if (traversable !== null) {
			const traversableInner = traversable.functor.unwrap(inputInner);
			const applicative = getApplicative(traversableInner);
			if (applicative !== null) {
				const applicativeInner = applicative.functor.unwrap(traversableInner);
				const coercedInner = under.wrap(
					applicative.functor.wrap(
						traversable.functor.wrap(applicativeInner, inputInner),
						traversableInner,
					),
					input,
				);
				const result = coerceInput_(fn, coercedInner, inputSide, mode, under);
				if (result !== null) {
					const [cont, mode] = result;
					return [
						app(
							λ(cont.type, closed, (cont, s) =>
								λ(input, s, (input, s) =>
									app(
										s.var(cont),
										under.map(
											λ(inputInner, s, (inputInner, s) =>
												traversable.sequence(s.var(inputInner), applicative, s),
											),
											s.var(input),
											s,
										),
									),
								),
							),
							cont,
						),
						[
							inputSide === 'out' ? '→' : inputSide === 'left' ? '→L' : '→R',
							mode,
						],
					];
				}
			}
		}

		// Try simply extracting a value from the functor via a comonad
		const comonad = getComonad(inputInner);
		if (comonad !== null) {
			const coercedInner = under.wrap(
				comonad.functor.unwrap(inputInner),
				input,
			);
			const result = coerceInput_(fn, coercedInner, inputSide, mode, under);
			if (result !== null) {
				const [cont, mode] = result;
				return [
					app(
						λ(cont.type, closed, (cont, s) =>
							λ(input, s, (input, s) =>
								app(
									s.var(cont),
									under.map(
										λ(inputInner, s, (inputInner, s) =>
											comonad.extract(s.var(inputInner), s),
										),
										s.var(input),
										s,
									),
								),
							),
						),
						cont,
					),
					[
						inputSide === 'out' ? '↓' : inputSide === 'left' ? '↓L' : '↓R',
						mode,
					],
				];
			}
		}
	}

	return null;
}

/**
 * Given a function and an input type, build a function which accepts the type
 * as its input and "coerces" its type using Functor, Distributive, Traversable,
 * and Comonad instances to feed it to the original function.
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

	if (
		typeof left !== 'string' &&
		left.head === 'bind' &&
		typeof right !== 'string' &&
		right.head === 'ref' &&
		bindingsEqual(left.binding, right.binding)
	) {
		const [cont, mode] = composeAndSimplify(left.inner, right.inner);
		return [
			app(
				λ(cont.type, closed, (cont, s) =>
					λ(left, s, (l, s) =>
						λ(right, s, (r, s) =>
							unbind(
								s.var(l),
								λ(Int(Pl('e')), s, (boundVal, s) =>
									λ(left.inner, s, (lVal, s) =>
										app(
											app(s.var(cont), s.var(lVal)),
											app(unref(s.var(r)), s.var(boundVal)),
										),
									),
								),
							),
						),
					),
				),
				cont,
			),
			['Z', mode],
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
				['R', mode],
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
			['L', mode],
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
		const inner = findCoercedInner(unwrap(out), out);
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
