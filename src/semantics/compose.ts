import { Unimplemented } from '../core/error';
import {
	Bind,
	Cont,
	Fn,
	Int,
	Pl,
	Ref,
	app,
	assertFn,
	bind,
	bindingsEqual,
	cont,
	subtype,
	typesEqual,
	unbind,
	unref,
	v,
	λ,
} from './model';
import { typeToPlainText } from './render';
import {
	type Functor,
	chooseEffect,
	composeFunctors,
	contFunctor,
	contMonad,
	findEffect,
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
	invertibleBinding,
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
			inType.head === 'indef' ||
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
			cont(traversable.functor.wrap(inner, inType)),
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
): CompositionResult | null {
	assertFn(fn.type);
	const { wrap, unwrap, map } = under ?? idFunctor;
	const inputInner = unwrap(input);
	const domain = fn.type.domain;
	const domainInner = unwrap(domain);
	const range = fn.type.range;

	// If the types match there is nothing to do
	if (subtype(inputInner, domainInner))
		return { denotation: fn, mode, steps: [] };

	// If there are matching functors in the input type and the domain, then we
	// don't need to move them around; simply continue coercion under the functor
	const functor = getMatchingFunctor(inputInner, domainInner);
	if (functor !== null) {
		const newUnder = composeFunctors(under ?? idFunctor, functor);
		const result = coerceInput_(fn, input, inputSide, mode, newUnder, force);
		if (result !== null) return result;

		// Straightforward coercion to the original type failed, but maybe we can
		// coerce to Cont <original type> and join this with an expected Cont instead?
		if (
			typeof inputInner === 'object' &&
			inputInner.head === 'cont' &&
			inputSide !== 'out'
		) {
			const coercedInner = Cont(domainInner);
			const coerced = wrap(coercedInner, input);
			const result = coerceInput_(
				λ(coerced, inputVal =>
					app(
						fn,
						map(
							() =>
								λ(coercedInner, x => contMonad.join(() => v(x), coercedInner)),
							() => v(inputVal),
							coerced,
							domain,
						),
					),
				),
				input,
				inputSide,
				mode,
				newUnder,
				force,
			);
			return (
				result && {
					...result,
					mode: [inputSide === 'left' ? 'JL' : 'JR', result.mode],
				}
			);
		}

		return null;
	}

	// If we're expecting a Cont and the actual effect is something different that
	// has a Runner instance, convert it to Cont
	if (
		typeof domainInner === 'object' &&
		domainInner.head === 'cont' &&
		inputSide !== 'out'
	) {
		const runner = getRunner(inputInner);
		if (runner !== null && (runner.runner.eager || force)) {
			const { functor, run, gather } = runner.runner;
			const intermediateInput = wrap(Cont(functor.unwrap(inputInner)), input);
			const result = coerceInput_(
				fn,
				intermediateInput,
				inputSide,
				mode,
				composeFunctors(under ?? idFunctor, contFunctor),
				true,
			);
			if (result !== null) {
				// Unwrap and rewrap the input type to account for Runners that might need
				// to be "gathered" (e.g. Bind áqna Int Ref áqna e -> Bind áqna Ref áqna Int e)
				const unwrappedInner = functor.unwrap(inputInner);
				const rewrappedInner = functor.wrap(unwrappedInner, inputInner);
				return {
					...result,
					denotation: λ(input, inputVal =>
						app(
							result.denotation,
							map(
								() =>
									λ(inputInner, x =>
										cont(
											λ(Fn(unwrappedInner, 't'), pred =>
												run(() =>
													functor.map(
														() => v(pred),
														() =>
															gather === undefined
																? v(x)
																: gather(() => v(x), inputInner),
														rewrappedInner,
														functor.wrap('t', inputInner),
													),
												),
											),
										),
									),
								() => v(inputVal),
								input,
								intermediateInput,
							),
						),
					),
					mode: [inputSide === 'left' ? 'CL' : 'CR', result.mode],
				};
			}
		}
	}

	// The functors don't match
	if (under !== null) {
		// Let's try pulling a distributive functor out of the input's outermost
		// functor and then continuing conversion under the distributive functor
		const distributive = getDistributive(inputInner);
		if (distributive !== null) {
			const coercedInner = wrap(distributive.functor.unwrap(inputInner), input);
			const result = coerceInput_(
				fn,
				coercedInner,
				inputSide,
				mode,
				under,
				force,
			);
			if (result !== null) {
				const { denotation: cont, mode } = result;
				let joined = false;
				const denotation = λ(input, inputVal => {
					// We're going to have to do something with the effect that floats to
					// the top after distributing. The most "efficient" thing to do is join
					// it with the effect just under it.
					const distributed = () =>
						distributive.distribute(() => v(inputVal), under, input);
					const distributedType = distributive.functor.wrap(
						coercedInner,
						inputInner,
					);
					const monad = getMatchingMonad(
						distributedType,
						distributive.functor.unwrap(distributedType),
					);
					if (monad !== null) {
						joined = true;
						return app(cont, monad.join(distributed, distributedType));
					}

					// Unable to join the effect; map over it instead.

					// If the input came from the left or right then the function is a
					// binary function, and we need to take special care to lift it into the
					// functor in the right way (f a → b → f c rather than f a → f (b → c))
					if (inputSide !== 'out') {
						assertFn(range);
						assertFn(cont.type);
						assertFn(cont.type.range);
						const out = distributive.functor.wrap(
							cont.type.range.range,
							inputInner,
						);
						return λ(range.domain, otherInput =>
							distributive.functor.map(
								() =>
									λ(coercedInner, inputInner =>
										app(app(cont, v(inputInner)), v(otherInput)),
									),
								distributed,
								distributedType,
								out,
							),
						);
					}
					// This is a unary function; just 'map' it
					assertFn(cont.type);
					return distributive.functor.map(
						() => cont,
						distributed,
						distributedType,
						distributive.functor.wrap(cont.type.range, inputInner),
					);
				});

				return {
					denotation,
					mode:
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
					steps: [],
				};
			}
		}

		// Try pushing a traversable functor into another functor
		const traversable = getBigTraversable(inputInner);
		if (traversable !== null) {
			const traversableInner = traversable.functor.unwrap(inputInner);
			const applicative = getApplicative(traversableInner);
			if (applicative !== null) {
				const applicativeInner = applicative.functor.unwrap(traversableInner);
				const coercedInner = wrap(
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
					const { denotation: cont, mode } = result;
					return {
						denotation: λ(input, inputVal =>
							app(
								cont,
								map(
									() =>
										λ(inputInner, inputInnerVal =>
											traversable.sequence(
												() => v(inputInnerVal),
												applicative,
												inputInner,
											),
										),
									() => v(inputVal),
									input,
									coercedInner,
								),
							),
						),
						mode: [
							inputSide === 'out' ? '→' : inputSide === 'left' ? '→L' : '→R',
							mode,
						],
						steps: [],
					};
				}
			}
		}

		// Try running the effect
		const runner = getRunner(inputInner);
		if (
			runner !== null &&
			(runner.runner.eager || force) &&
			subtype(wrap('t', input), domain)
		) {
			const coercedInner = wrap(runner.input, input);
			const result = coerceInput_(
				λ(coercedInner, inputVal =>
					app(
						fn,
						map(
							() => λ(runner.input, inner => runner.runner.run(() => v(inner))),
							() => v(inputVal),
							coercedInner,
							wrap('t', input),
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
				const { denotation: cont, mode } = result;
				return {
					denotation: cont,
					mode: [
						inputSide === 'out' ? '↓' : inputSide === 'left' ? '↓L' : '↓R',
						mode,
					],
					steps: [],
				};
			}
		}

		// Try simply extracting a value from the functor via a comonad
		const comonad = getComonad(inputInner);
		if (comonad !== null && force) {
			const coercedInner = wrap(comonad.functor.unwrap(inputInner), input);
			const result = coerceInput_(
				fn,
				coercedInner,
				inputSide,
				mode,
				under,
				force,
			);
			if (result !== null) {
				const { denotation: cont, mode } = result;
				return {
					denotation: λ(input, inputVal =>
						app(
							cont,
							map(
								() =>
									λ(inputInner, inputInnerVal =>
										comonad.extract(() => v(inputInnerVal)),
									),
								() => v(inputVal),
								input,
								coercedInner,
							),
						),
					),
					mode: [
						inputSide === 'out' ? '↓' : inputSide === 'left' ? '↓L' : '↓R',
						mode,
					],
					steps: [],
				};
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
): CompositionResult | null {
	return coerceInput_(fn, input, inputSide, mode, null, force);
}

class UnimplementedComposition extends Error {}

function composeInner(left: ExprType, right: ExprType): CompositionResult {
	const leftInner = unwrapEffects(left);
	const rightInner = unwrapEffects(right);

	if (
		typeof leftInner !== 'string' &&
		leftInner.head === 'fn' &&
		subtype(rightInner, unwrapEffects(leftInner.domain))
	)
		return { denotation: λ(leftInner, l => v(l)), mode: '>', steps: [] };

	if (
		typeof rightInner !== 'string' &&
		rightInner.head === 'fn' &&
		subtype(leftInner, unwrapEffects(rightInner.domain))
	)
		return {
			denotation: λ(rightInner.domain, l =>
				λ(rightInner, r => app(v(r), v(l))),
			),
			mode: '<',
			steps: [],
		};

	const semigroup = getMatchingSemigroup(leftInner, rightInner);
	if (semigroup !== null)
		return { denotation: semigroup.plus, mode: '+', steps: [] };

	if (leftInner === 'e') {
		const rightExpectingSubject = findEffect(
			right,
			Ref({ type: 'subject' }, '()'),
		);
		if (rightExpectingSubject !== null)
			return {
				denotation: λ(Int(Pl('e')), l =>
					λ(rightExpectingSubject, r => app(unref(v(r)), v(l))),
				),
				mode: 'S',
				steps: [],
			};
	}

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
			if (associatesWithEffects) {
				// The effects expected by the function weren't found; maybe we can lift the
				// input into them via an applicative functor?
				const applicative = getApplicative(fn.type.domain);
				if (applicative !== null) {
					const { domain } = fn.type;
					const domainInner = applicative.functor.unwrap(domain);
					const result = unwrapAndCoerce(
						input,
						λ(domainInner, x =>
							app(
								fn,
								applicative.pure(() => v(x), domainInner, domain),
							),
						),
						inputSide,
						mode,
					);
					return {
						...result,
						mode: [inputSide === 'left' ? '↑L' : '↑R', result.mode],
					};
				}
				throw new UnimplementedComposition();
			}
			return { input: unwrapped, fn, effects, precedences, mode };
		}

		if (
			getMatchingFunctor(unwrapped, fn.type.domain) !== null ||
			(typeof fn.type.domain === 'object' &&
				fn.type.domain.head === 'cont' &&
				getRunner(unwrapped) !== null)
		) {
			const result = coerceInput(
				fn,
				unwrapped,
				inputSide,
				mode,
				(getDistributive(unwrapped) === null &&
					getMatchingFunctor(unwrapped, fn.type.domain) !== null) ||
					(typeof fn.type.domain === 'object' &&
						fn.type.domain.head === 'cont' &&
						getRunner(unwrapped)?.runner.eager),
			);
			if (result !== null) {
				const { denotation: coerced, mode } = result;
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
): CompositionResult | null {
	assertFn(fn.type);
	assertFn(fn.type.range);
	const {
		domain: left,
		range: { domain: right, range: out },
	} = fn.type;

	// Try joining repeated monadic effects
	const monad = getMonad(out);
	if (monad !== null) {
		const {
			applicative: {
				functor: { wrap, unwrap },
			},
			join,
		} = monad;
		let coerced: CompositionResult | null;
		if (getDistributive(out) === null) {
			const inner = coerceType(unwrap(out), out);
			if (inner === null) coerced = null;
			else {
				const type = wrap(inner, out);
				coerced = coerceInput(
					λ(wrap(inner, out), e => join(() => v(e), type)),
					out,
					'out',
					mode,
				);
			}
		} else if (getMatchingMonad(out, unwrap(out))) {
			coerced = {
				denotation: λ(out, e => join(() => v(e), out)),
				mode,
				steps: [],
			};
		} else {
			coerced = null;
		}
		if (coerced !== null) {
			const { denotation: join, mode: coercedMode } = coerced;
			return {
				denotation: λ(left, l =>
					λ(right, r => app(join, app(app(fn, v(l)), v(r)))),
				),
				mode: ['J', coercedMode],
				steps: [],
			};
		}
	}

	return null;
}

export interface CompositionStep {
	leftType: ExprType;
	rightType: ExprType;
	outType: ExprType;
	mode: CompositionMode;
}

export interface CompositionResult {
	denotation: Expr;
	mode: CompositionMode;
	steps: CompositionStep[];
}

function compose_(left: Expr, right: Expr): CompositionResult {
	// Determine what basic mode (>, <, +) the types should ultimately compose by
	const { denotation: innerFn, mode: innerMode } = composeInner(
		left.type,
		right.type,
	);
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
	const innerFnPartiallyCoercedFlipped = λ(rightInner, r =>
		λ(leftInnerCoerced, l => app(app(innerFnPartiallyCoerced, v(l)), v(r))),
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
	const innerFnCoerced = λ(leftInnerCoerced, l =>
		λ(rightInnerCoerced, r => app(app(innerFnCoercedFlipped, v(r)), v(l))),
	);

	let leftType = leftInnerCoerced;
	let rightType = rightInnerCoerced;
	let fn = innerFnCoerced;
	let mode = innerModeCoerced;
	const steps: CompositionStep[] = [];

	function addStep() {
		assertFn(fn.type);
		assertFn(fn.type.range);
		steps.push({
			leftType,
			rightType,
			outType: fn.type.range.range,
			mode,
		});
	}
	addStep();

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
			assertFn(fn.type);
			const partiallyApplied = wrap(fn.type.range, leftEffect);
			fn = λ(leftType, l =>
				λ(rightType, r =>
					apply(
						() =>
							map(
								() => fn,
								() => v(l),
								leftType,
								partiallyApplied,
							),
						() => v(r),
						partiallyApplied,
					),
				),
			);
			mode = ['A', mode];
			addStep();
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
			fn = λ(leftType, l =>
				λ(rightType, r =>
					app(
						app(
							fn,
							extract(() => v(l)),
						),
						v(r),
					),
				),
			);
			mode = ['↓L', mode];
			addStep();
		} else if (
			typeof leftEffect !== 'string' &&
			leftEffect.head === 'bind' &&
			typeof rightEffect !== 'string' &&
			rightEffect.head === 'ref' &&
			bindingsEqual(leftEffect.binding, rightEffect.binding)
		) {
			// Resolve a left-to-right binding relationship
			const leftUnwrapped = leftType;
			leftType = Bind(leftEffect.binding, leftType);
			rightType = Ref(rightEffect.binding, rightType);
			leftEffects.pop();
			rightEffects.pop();
			leftPrecedences.pop();
			rightPrecedences.pop();
			fn = λ(leftType, l =>
				λ(rightType, r =>
					unbind(
						v(l),
						λ(Int(Pl('e')), boundVal =>
							λ(leftUnwrapped, lVal => {
								const out = app(
									app(fn, v(lVal)),
									app(unref(v(r)), v(boundVal)),
								);
								// Most binding relationships are linear, meaning that a Bind and Ref
								// will annihilate each other - The Bind does not live on unless there
								// is another Bind effect under the Ref to refresh the binding. However,
								// bindings that can take part in inverted (right-to-left) binding
								// relationships are different; in this case we refresh the binding
								// automatically so that the types of áq (... Ref áq ...) and chéq
								// (... Ref áq Bind áq ...) are distinguishable (chéq actually "writes"
								// to the áq binding while áq merely needs it to be refreshed). This is
								// what makes sure that a chéq will always set the value of an áq (not
								// the other way around), no matter which order the words come in.
								return invertibleBinding(leftEffect.binding)
									? bind(leftEffect.binding, v(boundVal), out)
									: out;
							}),
						),
					),
				),
			);
			mode = ['Z', mode];
			addStep();
		} else if (
			typeof leftEffect !== 'string' &&
			leftEffect.head === 'ref' &&
			typeof rightEffect !== 'string' &&
			rightEffect.head === 'bind' &&
			bindingsEqual(leftEffect.binding, rightEffect.binding) &&
			invertibleBinding(leftEffect.binding)
		) {
			// Resolve an inverted (right-to-left) binding relationship
			const rightUnwrapped = rightType;
			leftType = Ref(leftEffect.binding, leftType);
			rightType = Bind(rightEffect.binding, rightType);
			leftEffects.pop();
			rightEffects.pop();
			leftPrecedences.pop();
			rightPrecedences.pop();
			fn = λ(leftType, l =>
				λ(rightType, r =>
					unbind(
						v(r),
						λ(Int(Pl('e')), boundVal =>
							λ(rightUnwrapped, rVal => {
								const out = app(
									app(fn, app(unref(v(l)), v(boundVal))),
									v(rVal),
								);
								return invertibleBinding(leftEffect.binding)
									? bind(leftEffect.binding, v(boundVal), out)
									: out;
							}),
						),
					),
				),
			);
			mode = ["Z'", mode];
			addStep();
		} else {
			let choice: 'left' | 'right';
			// If there's a Bind on the left and a Ref higher in the effects stack on
			// the right, fast-forward to the Ref to resolve the binding relationship.
			if (
				leftEffect.head === 'bind' &&
				rightEffects.some(
					effect =>
						effect.head === 'ref' &&
						bindingsEqual(leftEffect.binding, effect.binding),
				)
			)
				choice = 'right';
			// Similar case when there's a Bind higher in the stack on the left.
			else if (
				rightEffect.head === 'ref' &&
				leftEffects.some(
					effect =>
						effect.head === 'bind' &&
						bindingsEqual(rightEffect.binding, effect.binding),
				)
			)
				choice = 'left';
			// Now let's look for binding relationships that could be resolved in the
			// inverse direction (right binds left); if there's a Ref on the left and a
			// Bind higher in the effects stack on the right, fast-forward to the Bind.
			else if (
				leftEffect.head === 'ref' &&
				invertibleBinding(leftEffect.binding) &&
				rightEffects.some(
					effect =>
						effect.head === 'bind' &&
						bindingsEqual(leftEffect.binding, effect.binding),
				)
			)
				choice = 'right';
			// Ref higher in the stack on the left.
			else if (
				rightEffect.head === 'bind' &&
				invertibleBinding(rightEffect.binding) &&
				leftEffects.some(
					effect =>
						effect.head === 'ref' &&
						bindingsEqual(rightEffect.binding, effect.binding),
				)
			)
				choice = 'left';
			// Default case: choose the functor with the highest precedence.
			else
				choice =
					chooseEffect(leftPrecedence, rightPrecedence).choice ===
					leftPrecedence
						? 'left'
						: 'right';

			const functor = getFunctor(choice === 'left' ? leftEffect : rightEffect);
			if (functor === null) throw new UnimplementedComposition();
			const { wrap, map } = functor;
			assertFn(fn.type);
			assertFn(fn.type.range);
			const out = fn.type.range.range;

			if (choice === 'left') {
				const leftUnwrapped = leftType;
				leftType = wrap(leftType, leftEffect);
				leftEffects.pop();
				leftPrecedences.pop();
				fn = λ(leftType, l =>
					λ(rightType, r =>
						map(
							() => λ(leftUnwrapped, l_ => app(app(fn, v(l_)), v(r))),
							() => v(l),
							leftType,
							wrap(out, leftType),
						),
					),
				);
				mode = ['R', mode];
				addStep();
			} else {
				rightType = wrap(rightType, rightEffect);
				rightEffects.pop();
				rightPrecedences.pop();
				fn = λ(leftType, l =>
					λ(rightType, r =>
						map(
							() => app(fn, v(l)),
							() => v(r),
							rightType,
							wrap(out, rightType),
						),
					),
				);
				mode = ['L', mode];
				addStep();
			}
		}

		// Check for possible ways to simplify the output type
		while (true) {
			const simplified = simplifyOutput(fn, mode);
			if (simplified === null) break;
			fn = simplified.denotation;
			mode = simplified.mode;
			addStep();
		}
	}

	// The types are now compatible; compose them
	return { denotation: app(app(fn, left), right), mode, steps };
}

/**
 * Composes the denotations of two trees together.
 * @returns The denotation and the steps that were taken to compose it.
 */
export function compose(left: Expr, right: Expr): CompositionResult {
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
