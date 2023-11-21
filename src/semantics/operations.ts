import { Impossible } from '../error';
import { reverse, zip } from '../misc';
import {
	app,
	Binding,
	Bindings,
	cloneBindings,
	constant,
	DTree,
	Expr,
	ExprType,
	infix,
	polarizer,
	presuppose,
	quantifier,
	quote,
	typesEqual,
	v,
	verb,
	λ,
} from './model';
import { toPlainText, typeToPlainText } from './render';

function mapVariables(
	e: Expr,
	newContext: ExprType[],
	mapVariable: (e: Expr & { head: 'variable' }) => Expr,
	mapQuantifierBody: (body: Expr, newContext: ExprType[]) => Expr,
): Expr {
	const sub = (subexpr: Expr) =>
		mapVariables(subexpr, newContext, mapVariable, mapQuantifierBody);

	switch (e.head) {
		case 'variable': {
			return mapVariable(e);
		}
		case 'verb': {
			return verb(
				e.name,
				e.args.map(sub) as [] | [Expr] | [Expr, Expr],
				sub(e.event),
				sub(e.world),
			);
		}
		case 'lambda': {
			return λ(
				e.body.context[0],
				newContext,
				c => mapQuantifierBody(e.body, c),
				e.restriction === undefined
					? undefined
					: c => mapQuantifierBody(e.restriction!, c),
			);
		}
		case 'apply': {
			return app(sub(e.fn), sub(e.argument));
		}
		case 'presuppose': {
			return presuppose(sub(e.body), sub(e.presupposition));
		}
		case 'infix': {
			return infix(e.name, e.type, sub(e.left), sub(e.right));
		}
		case 'polarizer': {
			return polarizer(e.name, sub(e.body));
		}
		case 'quantifier': {
			return quantifier(
				e.name,
				e.body.context[0] as 'e' | 'v' | 's',
				newContext,
				c => mapQuantifierBody(e.body, c),
				e.restriction === undefined
					? undefined
					: c => mapQuantifierBody(e.restriction!, c),
			);
		}
		case 'constant': {
			return constant(e.name, e.type, newContext);
		}
		case 'quote': {
			return quote(e.text, newContext);
		}
	}
}

/**
 * Rewrites an expression to use a different context, given a function mapping
 * indices in the original context to indices in the new context.
 */
export function rewriteContext(
	e: Expr,
	newContext: ExprType[],
	mapping: (index: number) => number,
): Expr {
	return mapVariables(
		e,
		newContext,
		e => v(mapping(e.index), newContext),
		(body, c) =>
			rewriteContext(body, c, (index: number) =>
				index === 0 ? 0 : mapping(index - 1) + 1,
			),
	);
}

/**
 * Substitutes all references to the variable at the given index with a target
 * expression that has the context e.context.slice(index + 1).
 */
function substitute(index: number, target: Expr, e: Expr): Expr {
	const newContext = [...e.context];
	newContext.splice(index, 1);

	return mapVariables(
		e,
		newContext,
		e =>
			e.index === index
				? rewriteContext(target, newContext, i => i + index)
				: v(e.index + (e.index < index ? 0 : -1), newContext),
		body => substitute(index + 1, target, body),
	);
}

/**
 * Performs a single β-reduction on an expression.
 */
function betaReduce(e: Expr): Expr {
	if (e.head === 'apply' && e.fn.head === 'lambda') {
		const body = substitute(0, e.argument, e.fn.body);
		return e.fn.restriction === undefined
			? body
			: presuppose(body, substitute(0, e.argument, e.fn.restriction));
	} else {
		return e;
	}
}

/**
 * Reduces a subexpression to normal form.
 * @param premises The plain-text representations of all premises in scope.
 */
export function reduce_(e: Expr, premises: Set<string>): Expr {
	let body: Expr;
	// Presuppositions will be lifted out of subexpressions and appended to the
	// body at the very end
	const presuppositions: Expr[] = [];

	// Reduces a subexpression and isolates it from any presuppositions
	const reduceAndIsolate = (e: Expr) => {
		let reduced = reduce_(e, premises);
		while (reduced.head === 'presuppose') {
			presuppositions.push(reduced.presupposition);
			reduced = reduced.body;
		}
		return reduced;
	};

	// Reduces a subexpression inside a quantifier and isolates it from
	// presuppositions where possible
	const quantifierReduceAndIsolate = (e: Expr) => {
		let reduced = reduce_(e, premises);
		const innerPresuppositions: Expr[] = [];
		while (reduced.head === 'presuppose') {
			try {
				presuppositions.push(
					rewriteContext(
						reduced.presupposition,
						reduced.presupposition.context.slice(1),
						i => {
							if (i === 0) throw new Impossible('Quantified variable used');
							return i - 1;
						},
					),
				);
			} catch (e) {
				// This presupposition evidently uses the quantified variable and cannot be
				// lifted
				innerPresuppositions.push(reduced.presupposition);
			}
			reduced = reduced.body;
		}
		return innerPresuppositions.reduceRight(
			(acc, p) => presuppose(acc, p),
			reduced,
		);
	};

	const withPremise = <T>(p: Expr | undefined, f: () => T): T => {
		if (p !== undefined) {
			const key = toPlainText(p);
			if (!premises.has(key)) {
				premises.add(key);
				const result = f();
				premises.delete(key);
				return result;
			}
		}
		return f();
	};

	const isPremise = (p: Expr) => premises.has(toPlainText(p));

	switch (e.head) {
		case 'variable':
		case 'constant':
		case 'quote': {
			body = e;
			break;
		}
		case 'verb': {
			body = verb(
				e.name,
				e.args.map(reduceAndIsolate) as [] | [Expr] | [Expr, Expr],
				reduceAndIsolate(e.event),
				reduceAndIsolate(e.world),
			);
			break;
		}
		case 'lambda': {
			const restriction =
				e.restriction === undefined
					? undefined
					: quantifierReduceAndIsolate(e.restriction);
			body = λ(
				e.body.context[0],
				e.context,
				() =>
					withPremise(restriction, () => quantifierReduceAndIsolate(e.body)),
				restriction === undefined ? undefined : () => restriction,
			);
			break;
		}
		case 'apply': {
			// Reduce each subexpression before attempting a β-reduction, in case this
			// reveals a new β-reduction opportunity
			const subexprsReduced = app(
				reduceAndIsolate(e.fn),
				reduceAndIsolate(e.argument),
			) as Expr & {
				head: 'apply';
			};
			body =
				subexprsReduced.fn.head === 'lambda'
					? reduceAndIsolate(betaReduce(subexprsReduced))
					: subexprsReduced;
			break;
		}
		case 'presuppose': {
			const presupposition = reduceAndIsolate(e.presupposition);
			if (!isPremise(presupposition)) presuppositions.push(presupposition);
			body = withPremise(presupposition, () => reduceAndIsolate(e.body));
			break;
		}
		case 'infix': {
			body = infix(
				e.name,
				e.type,
				reduceAndIsolate(e.left),
				reduceAndIsolate(e.right),
			);
			break;
		}
		case 'polarizer': {
			body = polarizer(e.name, reduceAndIsolate(e.body));
			break;
		}
		case 'quantifier': {
			const restriction =
				e.restriction === undefined
					? undefined
					: quantifierReduceAndIsolate(e.restriction);
			body = quantifier(
				e.name,
				e.body.context[0] as 'e' | 's' | 'v',
				e.context,
				() =>
					withPremise(restriction, () => quantifierReduceAndIsolate(e.body)),
				restriction === undefined ? undefined : () => restriction,
			);
			break;
		}
	}

	return presuppositions.reduceRight((acc, p) => presuppose(acc, p), body);
}

/**
 * Reduces an expression to normal form by performing β-reduction, lifting
 * presuppositions out of subexpressions, and deleting redundant premises.
 */
export function reduce(e: Expr): Expr {
	return reduce_(e, new Set());
}

function forEachBinding(
	bs: Bindings,
	fn: (
		b: Binding,
		getter: (bs: Bindings) => Binding | undefined,
		setter: (bs: Bindings, b: Binding | undefined) => void,
	) => void,
) {
	for (const kind_ of ['variable', 'animacy', 'head']) {
		const kind = kind_ as 'variable' | 'animacy' | 'head';
		const map = bs[kind];
		for (const [slot_, b] of Object.entries(map)) {
			if (b !== undefined) {
				const slot = slot_ as keyof Bindings[typeof kind];
				fn(
					b,
					bs => bs[kind][slot],
					(bs, b) => (bs[kind][slot] = b),
				);
			}
		}
	}

	if (bs.resumptive !== undefined)
		fn(
			bs.resumptive,
			bs => bs.resumptive,
			(bs, b) => (bs.resumptive = b),
		);
	if (bs.covertResumptive !== undefined)
		fn(
			bs.covertResumptive,
			bs => bs.covertResumptive,
			(bs, b) => (bs.covertResumptive = b),
		);
}

export function mapBindings(
	bs: Bindings,
	mapping: (b: Binding) => Binding | undefined,
): Bindings {
	const newBindings = cloneBindings(bs);
	forEachBinding(newBindings, (b, _getter, setter) =>
		setter(newBindings, mapping(b)),
	);
	return newBindings;
}

/**
 * Unifies the denotations of two subtrees so that they share a common context,
 * and can be composed together.
 * @returns The rewritten denotation of the left subtree, followed by the
 * 	rewritten denotation of the right subtree, followed by the unified bindings.
 */
export function unifyDenotations(
	left: DTree,
	right: DTree,
): [Expr, Expr, Bindings] {
	if (left.denotation === null)
		throw new Impossible(
			`Can't unify a semantically empty ${left.label} with a ${right.label}`,
		);
	if (right.denotation === null)
		throw new Impossible(
			`Can't unify a ${left.label} with a semantically empty ${right.label}`,
		);

	// To proceed, we start with the bindings of the left subtree, and iteratively
	// incorporate each binding present in the right subtree
	const bindings = cloneBindings(left.bindings);
	const context = [...left.denotation.context];

	const rightSubordinate = right.label === 'CP' || right.label === 'CPrel';
	// This is the mapping from variable indices in the right context, to variable
	// indices in the unified context - we'll fill it in as we go
	const rightMapping = new Array<number>(right.denotation.context.length);

	const resolve = (rIndex: number, lIndex: number | null) => {
		if (lIndex === null) {
			context.push(right.denotation!.context[rIndex]);
			rightMapping[rIndex] = context.length - 1;
			return context.length - 1;
		} else {
			rightMapping[rIndex] = lIndex;
			return lIndex;
		}
	};

	// TODO: implement the 'Cho máma hó/áq' rule using the subordinate field

	// For each binding referenced in the right subtree
	forEachBinding(right.bindings, (rb, getter, setter) => {
		// If this variable has already been resolved
		const resolvedIndex = rightMapping[rb.index];
		if (resolvedIndex !== undefined) {
			// Then, as long as no bindings from the left subtree override this binding,
			// keep it
			const lb = getter(bindings);
			if (lb === undefined) {
				setter(bindings, {
					index: resolvedIndex,
					subordinate: rb.subordinate,
					timeIntervals: rb.timeIntervals.map(
						v => rightMapping[v] ?? resolve(v, null),
					),
				});
			} else if (lb.index === resolvedIndex) {
				setter(bindings, {
					index: resolvedIndex,
					subordinate: lb.subordinate && rb.subordinate,
					timeIntervals: zip(rb.timeIntervals, lb.timeIntervals).map(
						([rv, lv]) => (rv === undefined ? lv! : resolve(rv, lv ?? null)),
					),
				});
			}
		} else {
			// Otherwise, if there is a matching binding in the left subtree
			const lb = getter(left.bindings);
			if (lb !== undefined) {
				// Then unify the variables
				setter(bindings, {
					index: resolve(rb.index, lb.index),
					subordinate: lb.subordinate && rb.subordinate,
					timeIntervals: zip(rb.timeIntervals, lb.timeIntervals).map(
						([rv, lv]) => (rv === undefined ? lv! : resolve(rv, lv ?? null)),
					),
				});
			} else {
				// Otherwise, create a new variable
				setter(bindings, {
					index: resolve(rb.index, null),
					subordinate: rightSubordinate || rb.subordinate,
					timeIntervals: rb.timeIntervals.map(v => resolve(v, null)),
				});
			}
		}
	});

	// Finally, account for free variables not associated with any bindings, to
	// fill in the rest of rightMapping
	for (let i = 0; i < rightMapping.length; i++) {
		if (rightMapping[i] === undefined) {
			const type = right.denotation.context[i];
			if (type === 's') {
				// Special case for the world variable: unify it with the left's world
				// variable (of which there should be at most one)
				const worldIndex = left.denotation.context.findIndex(t => t === 's');
				if (worldIndex === -1) {
					// Left has no world variable; create a new one
					rightMapping[i] = context.length;
					context.push('s');
				} else {
					// Unify them!
					rightMapping[i] = worldIndex;
				}
			} else {
				// Default to not unifying things
				rightMapping[i] = context.length;
				context.push(type);
			}
		}
	}

	return [
		rewriteContext(left.denotation, context, i => i),
		rewriteContext(right.denotation, context, i => rightMapping[i]),
		bindings,
	];
}

/**
 * Gets the De Bruijn indices of all time interval variables in the expression
 * not associated with any binding.
 */
function getUnboundTimeIntervals(e: Expr, bs: Bindings): Set<number> {
	const result = new Set<number>();

	// First, collect all time interval variables present in the expression
	for (let i = 0; i < e.context.length; i++) {
		if (e.context[i] === 'i') result.add(i);
	}
	// Then filter out the ones that are already associated with a binding
	forEachBinding(bs, b => {
		for (const v of b.timeIntervals) result.delete(v);
	});

	return result;
}

/**
 * Finds all time interval variables in the expression not yet associated with
 * any binding, and associates them with the bindings for the given De Bruijn
 * index.
 */
export function bindTimeIntervals(
	e: Expr,
	bs: Bindings,
	index: number,
): Bindings {
	const unboundTimeIntervals = getUnboundTimeIntervals(e, bs);
	return mapBindings(bs, b =>
		b.index === index
			? {
					...b,
					timeIntervals: [...b.timeIntervals, ...unboundTimeIntervals],
			  }
			: b,
	);
}

/**
 * Turns a denotation with an implicit world variable into a function taking a
 * world as the final explicit argument.
 */
export function makeWorldExplicit(tree: DTree): DTree {
	const e = tree.denotation;
	if (e === null)
		throw new Impossible("Can't make world explicit in a null denotation");

	const worldIndex = e.context.findIndex(t => t === 's');
	if (worldIndex === -1)
		throw new Impossible('No world variable to make explicit');

	// Given an input expression 𝘗, build the expression
	// λ𝘢. λ𝘣. … λ𝘸'. 𝘗[𝘸/𝘸'](𝘢)(𝘣)…

	// First, calculate the context of that inner expression 𝘗[𝘸/𝘸']
	const innerContext = [...e.context];
	innerContext.splice(worldIndex, 1);
	for (let type = e.type; Array.isArray(type); type = type[1])
		innerContext.unshift(type[0]);
	innerContext.unshift('s');

	// The number of explicit arguments that 𝘗 takes
	const explicitArguments = innerContext.length - e.context.length;
	// Now we can build the expression 𝘗[𝘸/𝘸']
	const innerFunction = rewriteContext(e, innerContext, i =>
		i > worldIndex
			? i + explicitArguments
			: i === worldIndex
			? 0
			: i + 1 + explicitArguments,
	);

	// Add the function applications
	let result = innerFunction;
	for (let i = 0; i < explicitArguments; i++)
		result = app(result, v(explicitArguments - i, innerContext));

	// Add the lambdas
	let outerContext = innerContext.slice(1);
	result = λ('s', outerContext, () => result);
	for (let i = 0; i < explicitArguments; i++) {
		const [type] = outerContext;
		outerContext = outerContext.slice(1);
		result = λ(type, outerContext, () => result);
	}

	const indexMapping = (i: number) => (i > worldIndex ? i - 1 : i);

	return {
		...tree,
		denotation: reduce(result),
		bindings: mapBindings(tree.bindings, b => ({
			...b,
			index: indexMapping(b.index),
			timeIntervals: b.timeIntervals.map(indexMapping),
		})),
	};
}

/**
 * Filters an expression's presuppositions by a given predicate.
 */
export function filterPresuppositions(
	e: Expr,
	predicate: (presupposition: Expr) => boolean,
): Expr {
	if (e.head === 'presuppose') {
		const body = filterPresuppositions(e.body, predicate);
		return predicate(e.presupposition)
			? presuppose(body, e.presupposition)
			: body;
	} else {
		return e;
	}
}

/**
 * Determines whether some subexpression satsifies the given predicate.
 */
export function someSubexpression(
	e: Expr,
	predicate: (e: Expr) => boolean,
): boolean {
	if (predicate(e)) return true;

	const sub = (...es: Expr[]) => es.some(e => someSubexpression(e, predicate));

	switch (e.head) {
		case 'variable':
		case 'constant':
		case 'quote':
			return sub();
		case 'verb':
			return sub(...e.args, e.event, e.world);
		case 'lambda':
			return sub(
				e.body,
				...(e.restriction === undefined ? [] : [e.restriction]),
			);
		case 'apply':
			return sub(e.fn, e.argument);
		case 'presuppose':
			return sub(e.body, e.presupposition);
		case 'infix':
			return sub(e.left, e.right);
		case 'polarizer':
			return sub(e.body);
		case 'quantifier':
			return sub(
				e.body,
				...(e.restriction === undefined ? [] : [e.restriction]),
			);
	}
}

class LiftError extends Error {
	constructor(input: ExprType, output: ExprType) {
		super(
			`Can't lift type ${typeToPlainText(input)} to type ${typeToPlainText(
				output,
			)}`,
		);
	}
}

/**
 * Lifts a first-order function to a higher-order function, for example turning
 * a <t,<t,t>> into an <<e,t>,<<e,t>,<e,t>>.
 * @param e The function.
 * @param t The desired type.
 */
export function lift(e: Expr, t: ExprType): Expr {
	if (typeof e.type === 'string' || typeof t === 'string')
		throw new LiftError(e.type, t);

	// The parameters present in the original function
	const existingParams: ExprType[] = [];
	for (let t_: ExprType = e.type; typeof t_ !== 'string'; t_ = t_[1])
		existingParams.push(t_[0]);

	// The new parameters over which everything will be lifted
	const newParams: ExprType[] = [];
	for (let t_ = t[0]; !typesEqual(t_, e.type[0]); t_ = t_[1]) {
		if (typeof t_ === 'string') throw new LiftError(e.type, t);
		newParams.push(t_[0]);
	}

	// The parameters present in the original function, but now lifted
	const liftedParams = existingParams.map(p =>
		newParams.reduceRight((acc, p_) => [p_, acc], p),
	);

	// The context of the innermost expression
	const innerContext = [...e.context];
	for (const p of liftedParams) innerContext.unshift(p);
	for (const p of newParams) innerContext.unshift(p);

	let result = rewriteContext(
		e,
		innerContext,
		i => i + innerContext.length - e.context.length,
	);

	// Apply the expression to each lifted argument, in order
	for (
		let lp = newParams.length + liftedParams.length - 1;
		lp >= newParams.length;
		lp--
	) {
		let argument = v(lp, innerContext);
		for (let np = newParams.length - 1; np >= 0; np--)
			argument = app(argument, v(np, innerContext));
		result = app(result, argument);
	}

	// Now wrap it in lambdas for the new and existing parameters
	for (const np of reverse(newParams))
		result = λ(np, result.context.slice(1), () => result);
	for (const lp of reverse(liftedParams))
		result = λ(lp, result.context.slice(1), () => result);

	return result;
}
