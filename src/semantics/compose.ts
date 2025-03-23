import { Unimplemented } from '../core/error';
import {
	Bind,
	type Expr,
	type ExprType,
	Int,
	Pl,
	Ref,
	app,
	assertFn,
	bindingsEqual,
	closed,
	subtype,
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
	getMatchingComonad,
	getMatchingFunctor,
	getMatchingMonad,
	getMatchingSemigroup,
	getRunner,
	idFunctor,
	unwrapEffects,
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

class UnimplementedComposition extends Error {}

function composeInner(
	left: ExprType,
	right: ExprType,
): [Expr, CompositionMode] {
	const leftInner = unwrapEffects(left);
	const rightInner = unwrapEffects(right);

	if (
		typeof leftInner !== 'string' &&
		leftInner.head === 'fn' &&
		subtype(rightInner, unwrapEffects(leftInner.domain))
	)
		return [λ(leftInner, closed, (l, s) => s.var(l)), '>'];

	if (
		typeof rightInner !== 'string' &&
		rightInner.head === 'fn' &&
		subtype(leftInner, unwrapEffects(rightInner.domain))
	)
		return [
			λ(rightInner.domain, closed, (l, s) =>
				λ(rightInner, s, (r, s) => app(s.var(r), s.var(l))),
			),
			'<',
		];

	const semigroup = getMatchingSemigroup(leftInner, rightInner);
	if (semigroup !== null) return [semigroup.plus, '+'];

	throw new Unimplemented(
		`Composition of ${typeToPlainText(leftInner)} and ${typeToPlainText(rightInner)}`,
	);
}

/**
 * Unwrap effects from the input type until it becomes possible to coerce it
 * into a type that the function accepts, then return the unwrapped input type
 * and coerced function and the details of the effects that were unwrapped along
 * the way.
 */
function unwrapAndCoerce(
	input: ExprType,
	fn: Expr,
	inputSide: 'left' | 'right',
	mode: CompositionMode,
): {
	input: ExprType;
	fn: Expr;
	effects: (ExprType & object)[];
	precedences: (ExprType & object)[];
	mode: CompositionMode;
} {
	assertFn(fn.type);
	let unwrapped = input;
	const effects: (ExprType & object)[] = [];
	const precedences: (ExprType & object)[] = [];
	const associatesWithEffects = getFunctor(fn.type.domain) !== null;
	while (true) {
		const functor = getFunctor(unwrapped);
		if (functor === null) {
			if (associatesWithEffects) throw new UnimplementedComposition();
			return { input: unwrapped, fn, effects, precedences, mode };
		}

		if (getMatchingFunctor(unwrapped, fn.type.domain) !== null) {
			const result = coerceInput(fn, unwrapped, inputSide, mode);
			if (result !== null) {
				const [coerced, mode] = result;
				return { input: unwrapped, fn: coerced, effects, precedences, mode };
			}
		}

		const effect = functor.wrap('()', unwrapped) as ExprType & object;
		effects.push(effect);
		const highestPrecedenceSoFar = precedences[precedences.length - 1] ?? '()';
		const [choice, newHighestPrecedence] = chooseFunctor(
			highestPrecedenceSoFar,
			effect,
		)!;
		precedences.push(
			newHighestPrecedence.wrap(
				'()',
				choice === 'left' ? highestPrecedenceSoFar : effect,
			) as ExprType & object,
		);
		unwrapped = functor.unwrap(unwrapped);
	}
}

export function compose_(left: Expr, right: Expr): [Expr, CompositionMode] {
	// Determine what basic mode (>, <, +) the types should ultimately compose by
	const [innerFn, innerMode] = composeInner(left.type, right.type);
	const {
		range: { domain: rightInner },
	} = innerFn.type as ExprType &
		object & { head: 'fn'; range: ExprType & object & { head: 'fn' } };

	// Now figure out how to coerce the types to feed them to that composition mode
	const {
		input: leftInnerCoerced,
		fn: innerFnPartiallyCoerced,
		effects: leftEffects,
		precedences: leftPrecedences,
		mode: innerModePartiallyCoerced,
	} = unwrapAndCoerce(left.type, innerFn, 'left', innerMode);
	const innerFnPartiallyCoercedFlipped = app(
		λ(innerFnPartiallyCoerced.type, closed, (fn, s) =>
			λ(rightInner, s, (r, s) =>
				λ(leftInnerCoerced, s, (l, s) =>
					app(app(s.var(fn), s.var(l)), s.var(r)),
				),
			),
		),
		innerFnPartiallyCoerced,
	);
	const {
		input: rightInnerCoerced,
		fn: innerFnCoercedFlipped,
		effects: rightEffects,
		precedences: rightPrecedences,
		mode: innerModeCoerced,
	} = unwrapAndCoerce(
		right.type,
		innerFnPartiallyCoercedFlipped,
		'right',
		innerModePartiallyCoerced,
	);
	const innerFnCoerced = app(
		λ(innerFnCoercedFlipped.type, closed, (fn, s) =>
			λ(leftInnerCoerced, s, (l, s) =>
				λ(rightInnerCoerced, s, (r, s) =>
					app(app(s.var(fn), s.var(r)), s.var(l)),
				),
			),
		),
		innerFnCoercedFlipped,
	);

	let leftType = leftInnerCoerced;
	let rightType = rightInnerCoerced;
	let fn = innerFnCoerced;
	let mode = innerModeCoerced;

	// Work our way back up the effects stack, adding 1 layer to the left or right
	// at a time, until we finally have a composition mode compatible with the
	// original types
	while (leftEffects.length || rightEffects.length) {
		const leftEffect = leftEffects[leftEffects.length - 1] ?? '()';
		const rightEffect = rightEffects[rightEffects.length - 1] ?? '()';
		const leftPrecedence = leftPrecedences[leftPrecedences.length - 1] ?? '()';
		const rightPrecedence =
			rightPrecedences[rightPrecedences.length - 1] ?? '()';

		const applicative = getMatchingApplicative(leftEffect, rightEffect);
		if (applicative !== null) {
			const {
				functor: { wrap, map },
				apply,
			} = applicative;
			leftType = wrap(leftType, leftEffect);
			rightType = wrap(rightType, rightEffect);
			leftEffects.pop();
			rightEffects.pop();
			leftPrecedences.pop();
			rightPrecedences.pop();
			fn = app(
				λ(fn.type, closed, (fn, s) =>
					λ(leftType, s, (l, s) =>
						λ(rightType, s, (r, s) =>
							apply(map(s.var(fn), s.var(l), s), s.var(r), s),
						),
					),
				),
				fn,
			);
			mode = ['A', mode];
		} else if (
			typeof leftEffect !== 'string' &&
			leftEffect.head === 'bind' &&
			typeof rightEffect !== 'string' &&
			rightEffect.head === 'ref' &&
			bindingsEqual(leftEffect.binding, rightEffect.binding)
		) {
			const leftUnwrapped = leftType;
			leftType = Bind(leftEffect.binding, leftType);
			rightType = Ref(rightEffect.binding, rightType);
			leftEffects.pop();
			rightEffects.pop();
			leftPrecedences.pop();
			rightPrecedences.pop();
			fn = app(
				λ(fn.type, closed, (fn, s) =>
					λ(leftType, s, (l, s) =>
						λ(rightType, s, (r, s) =>
							unbind(
								s.var(l),
								λ(Int(Pl('e')), s, (boundVal, s) =>
									λ(leftUnwrapped, s, (lVal, s) =>
										app(
											app(s.var(fn), s.var(lVal)),
											app(unref(s.var(r)), s.var(boundVal)),
										),
									),
								),
							),
						),
					),
				),
				fn,
			);
			mode = ['Z', mode];
		} else {
			const comonad = getMatchingComonad(leftEffect, rightEffect);
			if (comonad !== null) {
				// Get rid of duplicate comonadic effects
				const {
					functor: { wrap },
					extract,
				} = comonad;
				leftType = wrap(leftType, leftEffect);
				leftEffects.pop();
				leftPrecedences.pop();
				fn = app(
					λ(fn.type, closed, (fn, s) =>
						λ(leftType, s, (l, s) =>
							λ(rightType, s, (r, s) =>
								app(app(s.var(fn), extract(s.var(l), s)), s.var(r)),
							),
						),
					),
					fn,
				);
				mode = ['↓', mode];
			} else {
				const functor = chooseFunctor(leftPrecedence, rightPrecedence);
				if (functor === null) throw new UnimplementedComposition();
				const [choice] = functor;
				if (choice === 'left') {
					const { wrap, map } = getFunctor(leftEffect)!;
					const leftUnwrapped = leftType;
					leftType = wrap(leftType, leftEffect);
					leftEffects.pop();
					leftPrecedences.pop();
					fn = app(
						λ(fn.type, closed, (fn, s) =>
							λ(leftType, s, (l, s) =>
								λ(rightType, s, (r, s) =>
									map(
										λ(leftUnwrapped, s, (l_, s) =>
											app(app(s.var(fn), s.var(l_)), s.var(r)),
										),
										s.var(l),
										s,
									),
								),
							),
						),
						fn,
					);
					mode = ['R', mode];
				} else {
					const { wrap, map } = getFunctor(rightEffect)!;
					rightType = wrap(rightType, rightEffect);
					rightEffects.pop();
					rightPrecedences.pop();
					fn = app(
						λ(fn.type, closed, (fn, s) =>
							λ(leftType, s, (l, s) =>
								λ(rightType, s, (r, s) =>
									map(app(s.var(fn), s.var(l)), s.var(r), s),
								),
							),
						),
						fn,
					);
					mode = ['L', mode];
				}
			}
		}

		// Check for possible ways to simplify the output type
		const out = (
			(fn.type as ExprType & object & { head: 'fn' }).range as ExprType &
				object & { head: 'fn' }
		).range;

		// Try running the output effect
		const runner = getRunner(out);
		if (runner !== null) {
			const coerced = coerceInput(runner.run, out, 'out', mode);
			if (coerced !== null) {
				const [run, coercedMode] = coerced;
				fn = app(
					app(
						λ(run.type, closed, (run, s) =>
							λ(fn.type, s, (fn, s) =>
								λ(leftType, s, (l, s) =>
									λ(rightType, s, (r, s) =>
										app(s.var(run), app(app(s.var(fn), s.var(l)), s.var(r))),
									),
								),
							),
						),
						run,
					),
					fn,
				);
				mode = ['↓', coercedMode];
			}
		}
	}

	// The types are now compatible; compose them
	return [app(app(fn, left), right), mode];
}

/**
 * Composes the denotations of two trees together.
 * @returns The denotation and the steps that were taken to compose it.
 */
export function compose(left: Expr, right: Expr): [Expr, CompositionMode] {
	try {
		return compose_(left, right);
	} catch (e) {
		if (e instanceof UnimplementedComposition)
			throw new Unimplemented(
				`Composition of ${typeToPlainText(left.type)} and ${typeToPlainText(right.type)}`,
			);
		throw e;
	}
}
