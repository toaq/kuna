import { Unimplemented } from '../core/error';
import {
	Bind,
	Int,
	Pl,
	Ref,
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
	chooseEffect,
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
	unwrapEffects,
} from './structures';
import type { Binding, CompositionMode, Expr, ExprType } from './types';

function coerceType_(
	inType: ExprType,
	like: ExprType,
	cont: (inner: ExprType) => ExprType,
): ExprType | null {
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
		return { ...inType, inner: cont(inType.inner) };

	const traversable = getBigTraversable(inType);
	if (traversable !== null) {
		return coerceType_(traversable.functor.unwrap(inType), like, inner =>
			traversable.functor.wrap(cont(inner), inType),
		);
	}
	const functor = getFunctor(inType);
	return functor && coerceType_(functor.unwrap(inType), like, cont);
}

/**
 * Given a type and a type constructor to search for, find the inner type given
 * by unwrapping all unrelated effects and pushing all traversables into the
 * first occurrence of that type constructor. The idea is that this represents
 * the type after coercion.
 */
function coerceType(inType: ExprType, like: ExprType): ExprType | null {
	return coerceType_(inType, like, inner => inner);
}

function coerceInput_(
	fn: Expr,
	input: ExprType,
	inputSide: 'left' | 'right' | 'out',
	mode: CompositionMode,
	under: Functor | null,
	force: boolean,
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
			force,
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
			const result = coerceInput_(
				fn,
				coercedInner,
				inputSide,
				mode,
				under,
				force,
			);
			if (result !== null) {
				const [cont, mode] = result;
				let joined = false;
				return [
					λ(input, closed, (input, s) => {
						// We're going to have to do something with the effect that floats to
						// the top after distributing. The most "efficient" thing to do is join
						// it with the effect just under it.
						const distributed = distributive.distribute(s.var(input), under, s);
						const monad = getMatchingMonad(
							distributed.type,
							distributive.functor.unwrap(distributed.type),
						);
						if (monad !== null) {
							joined = true;
							return app(cont, monad.join(distributed, s));
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
										app(app(cont, s.var(inputInner)), s.var(otherInput)),
									),
									distributive.distribute(s.var(input), under, s),
									s,
								),
							);
						}
						// This is a unary function; just 'map' it
						return distributive.functor.map(
							cont,
							distributive.distribute(s.var(input), under, s),
							s,
						);
					}),
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

		// Try pushing a traversable functor into another functor
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
				const result = coerceInput_(
					fn,
					coercedInner,
					inputSide,
					mode,
					under,
					force,
				);
				if (result !== null) {
					const [cont, mode] = result;
					return [
						λ(input, closed, (input, s) =>
							app(
								cont,
								under.map(
									λ(inputInner, s, (inputInner, s) =>
										traversable.sequence(s.var(inputInner), applicative, s),
									),
									s.var(input),
									s,
								),
							),
						),
						[
							inputSide === 'out' ? '→' : inputSide === 'left' ? '→L' : '→R',
							mode,
						],
					];
				}
			}
		}

		// Try running the effect
		const runner = getRunner(inputInner);
		if (
			runner !== null &&
			(runner.eager || force) &&
			subtype(under.wrap('t', input), fn.type.domain)
		) {
			const coercedInner = under.wrap(
				runner.functor.wrap('t', inputInner),
				input,
			);
			const result = coerceInput_(
				λ(coercedInner, closed, (input, s) =>
					app(
						fn,
						under.map(
							λ(runner.functor.wrap('t', inputInner), s, (inner, s) =>
								runner.run(s.var(inner), s),
							),
							s.var(input),
							s,
						),
					),
				),
				input,
				inputSide,
				mode,
				under,
				true,
			);
			if (result !== null) {
				const [cont, mode] = result;
				return [
					cont,
					[
						inputSide === 'out' ? '↓' : inputSide === 'left' ? '↓L' : '↓R',
						mode,
					],
				];
			}
		}

		// Try simply extracting a value from the functor via a comonad
		const comonad = getComonad(inputInner);
		if (comonad !== null) {
			const coercedInner = under.wrap(
				comonad.functor.unwrap(inputInner),
				input,
			);
			const result = coerceInput_(
				fn,
				coercedInner,
				inputSide,
				mode,
				under,
				force,
			);
			if (result !== null) {
				const [cont, mode] = result;
				return [
					λ(input, closed, (input, s) =>
						app(
							cont,
							under.map(
								λ(inputInner, s, (inputInner, s) =>
									comonad.extract(s.var(inputInner), s),
								),
								s.var(input),
								s,
							),
						),
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
 * Runner, and Comonad instances to feed it to the original function.
 * @param inputSide The side of the tree which the input comes from. If this is
 *   'left' or 'right' then the function will be treated as a binary function so
 *   that functors map like f a → b → f c rather than f a → f (b → c).
 * @param force Forces even non-eager Runner instances to be run.
 */
function coerceInput(
	fn: Expr,
	input: ExprType,
	inputSide: 'left' | 'right' | 'out',
	mode: CompositionMode,
	force = false,
): [Expr, CompositionMode] | null {
	return coerceInput_(fn, input, inputSide, mode, null, force);
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
		const { choice, strong } = chooseEffect(highestPrecedenceSoFar, effect)!;
		if (strong) {
			const newHighestPrecedence = getFunctor(choice)!;
			precedences.push(
				newHighestPrecedence.wrap('()', choice) as ExprType & object,
			);
		} else {
			precedences.push(effect);
		}
		unwrapped = functor.unwrap(unwrapped);
	}
}

function shadowedByLowPrecedence(
	binding: Binding,
	leftPrecedence: ExprType & object,
	rightEffects: (ExprType & object)[],
	rightPrecedences: (ExprType & object)[],
): boolean {
	for (let i = rightEffects.length - 1; i >= 0; i--) {
		const rightEffect = rightEffects[i];
		const rightPrecedence = rightPrecedences[i];
		if (
			chooseEffect(leftPrecedence, rightPrecedence).choice === rightPrecedence
		)
			return false;
		if (
			rightEffect.head === 'bind' &&
			bindingsEqual(binding, rightEffect.binding)
		)
			return !rightEffects.some(
				effect =>
					effect.head === 'ref' && bindingsEqual(effect.binding, binding),
			);
	}
	return false;
}

function simplifyOutput(
	fn: Expr,
	mode: CompositionMode,
): [Expr, CompositionMode] | null {
	assertFn(fn.type);
	assertFn(fn.type.range);
	const {
		domain: left,
		range: { domain: right, range: out },
	} = fn.type;

	// Try running the output effect
	const runner = getRunner(out);
	if (runner?.eager) {
		const coerced = coerceInput(
			λ(runner.functor.wrap('t', out), closed, (x, s) =>
				runner.run(s.var(x), s),
			),
			out,
			'out',
			mode,
			true,
		);
		if (coerced !== null) {
			const [run, coercedMode] = coerced;
			return [
				λ(left, closed, (l, s) =>
					λ(right, s, (r, s) => app(run, app(app(fn, s.var(l)), s.var(r)))),
				),
				['↓', coercedMode],
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
		let coerced: [Expr, CompositionMode] | null;
		if (getDistributive(out) === null) {
			const inner = coerceType(unwrap(out), out);
			coerced =
				inner &&
				coerceInput(
					λ(wrap(inner, out), closed, (e, s) => join(s.var(e), s)),
					out,
					'out',
					mode,
				);
		} else if (getMatchingMonad(out, unwrap(out))) {
			coerced = [λ(out, closed, (e, s) => join(s.var(e), s)), mode];
		} else {
			coerced = null;
		}
		if (coerced !== null) {
			const [join, coercedMode] = coerced;
			return [
				λ(left, closed, (l, s) =>
					λ(right, s, (r, s) => app(join, app(app(fn, s.var(l)), s.var(r)))),
				),
				['J', coercedMode],
			];
		}
	}

	return null;
}

function compose_(left: Expr, right: Expr): [Expr, CompositionMode] {
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
	const innerFnPartiallyCoercedFlipped = λ(rightInner, closed, (r, s) =>
		λ(leftInnerCoerced, s, (l, s) =>
			app(app(innerFnPartiallyCoerced, s.var(l)), s.var(r)),
		),
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
	const innerFnCoerced = λ(leftInnerCoerced, closed, (l, s) =>
		λ(rightInnerCoerced, s, (r, s) =>
			app(app(innerFnCoercedFlipped, s.var(r)), s.var(l)),
		),
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
			fn = λ(leftType, closed, (l, s) =>
				λ(rightType, s, (r, s) => apply(map(fn, s.var(l), s), s.var(r), s)),
			);
			mode = ['A', mode];
		} else if (
			typeof leftEffect !== 'string' &&
			leftEffect.head === 'bind' &&
			shadowedByLowPrecedence(
				leftEffect.binding,
				leftPrecedence,
				rightEffects,
				rightPrecedences,
			)
		) {
			// Drop any bindings on the left that are shadowed by a higher-precedence
			// binding on the right
			const {
				functor: { wrap },
				extract,
			} = getComonad(leftEffect)!;
			leftType = wrap(leftType, leftEffect);
			leftEffects.pop();
			leftPrecedences.pop();
			fn = λ(leftType, closed, (l, s) =>
				λ(rightType, s, (r, s) => app(app(fn, extract(s.var(l), s)), s.var(r))),
			);
			mode = ['↓L', mode];
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
			fn = λ(leftType, closed, (l, s) =>
				λ(rightType, s, (r, s) =>
					unbind(
						s.var(l),
						λ(Int(Pl('e')), s, (boundVal, s) =>
							λ(leftUnwrapped, s, (lVal, s) =>
								app(
									app(fn, s.var(lVal)),
									app(unref(s.var(r)), s.var(boundVal)),
								),
							),
						),
					),
				),
			);
			mode = ['Z', mode];
		} else {
			let choice: 'left' | 'right';
			if (
				leftEffect.head === 'bind' &&
				rightEffects.some(
					effect =>
						effect.head === 'ref' &&
						bindingsEqual(leftEffect.binding, effect.binding),
				)
			)
				choice = 'right';
			else if (
				rightEffect.head === 'ref' &&
				leftEffects.some(
					effect =>
						effect.head === 'bind' &&
						bindingsEqual(rightEffect.binding, effect.binding),
				)
			)
				choice = 'left';
			else
				choice =
					chooseEffect(leftPrecedence, rightPrecedence).choice ===
					leftPrecedence
						? 'left'
						: 'right';

			const functor = getFunctor(choice === 'left' ? leftEffect : rightEffect);
			if (functor === null) throw new UnimplementedComposition();
			const { wrap, map } = functor;

			if (choice === 'left') {
				const leftUnwrapped = leftType;
				leftType = wrap(leftType, leftEffect);
				leftEffects.pop();
				leftPrecedences.pop();
				fn = λ(leftType, closed, (l, s) =>
					λ(rightType, s, (r, s) =>
						map(
							λ(leftUnwrapped, s, (l_, s) => app(app(fn, s.var(l_)), s.var(r))),
							s.var(l),
							s,
						),
					),
				);
				mode = ['R', mode];
			} else {
				rightType = wrap(rightType, rightEffect);
				rightEffects.pop();
				rightPrecedences.pop();
				fn = λ(leftType, closed, (l, s) =>
					λ(rightType, s, (r, s) => map(app(fn, s.var(l)), s.var(r), s)),
				);
				mode = ['L', mode];
			}
		}

		// Check for possible ways to simplify the output type
		while (true) {
			const simplified = simplifyOutput(fn, mode);
			if (simplified === null) break;
			[fn, mode] = simplified;
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
