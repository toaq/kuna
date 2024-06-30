import { Impossible } from '../core/error';
import { enumerate, reverse, some, zip } from '../core/misc';
import {
	Binding,
	Bindings,
	DTree,
	Expr,
	ExprType,
	app,
	cloneBindings,
	constant,
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
	mapVariable: (index: number) => Expr,
	mapDefines: (index: number) => number | undefined,
	mapQuantifierBody: (body: Expr, newContext: ExprType[]) => Expr,
): Expr {
	const sub = (subexpr: Expr) =>
		mapVariables(
			subexpr,
			newContext,
			mapVariable,
			mapDefines,
			mapQuantifierBody,
		);

	switch (e.head) {
		case 'variable': {
			return mapVariable(e.index);
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
			return presuppose(
				sub(e.body),
				sub(e.presupposition),
				e.defines === undefined ? undefined : mapDefines(e.defines),
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
		i => v(mapping(i), newContext),
		mapping,
		(body, c) =>
			rewriteContext(body, c, (index: number) =>
				index === 0 ? 0 : mapping(index - 1) + 1,
			),
	);
}

/**
 * Substitutes all references to the variable at the given index with a target
 * expression that has the context
 * [...e.context.slice(0, index), ...e.context.slice(index + 1)].
 */
function substitute(
	index: number,
	target: Expr,
	e: Expr,
	defines: number | undefined = undefined,
): Expr {
	const newContext = [...e.context];
	newContext.splice(index, 1);

	return mapVariables(
		e,
		newContext,
		i =>
			i === index
				? rewriteContext(
						target,
						newContext,
						i => i + newContext.length - target.context.length,
					)
				: v(i < index ? i : i - 1, newContext),
		i => (i === index ? defines : i < index ? i : i - 1),
		body =>
			substitute(
				index + 1,
				target,
				body,
				defines === undefined ? undefined : defines + 1,
			),
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
 * Determine whether an Expr is small enough to always β-reduce it.
 */
function isSmallExpr(e: Expr): boolean {
	switch (e.head) {
		case 'variable':
		case 'constant':
		case 'quote':
			return true;
		default:
			return false;
	}
}

/**
 * Count occurrences of a variable in an expression.
 */
function varOccurrences(e: Expr, index: number): number {
	let count = 0;
	function walk(e: Expr, ctx: ExprType[], index: number) {
		mapVariables(
			e,
			e.context,
			i => {
				if (i === index) ++count;
				return v(i, ctx);
			},
			i => i,
			(body, c) => walk(body, c, index + 1),
		);
		return e;
	}
	walk(e, e.context, index);
	return count;
}

/**
 * Reduces a subexpression to normal form.
 * @param premises The plain-text representations of all premises in scope.
 */
export function reduce_(e: Expr, premises: Set<string>): Expr {
	let body: Expr;
	// Presuppositions will be lifted out of subexpressions and appended to the
	// body at the very end
	const presuppositions = new Map<string, [Expr, number | undefined]>();
	const addPresupposition = (e: Expr, defines: number | undefined) =>
		void presuppositions.set(toPlainText(e), [e, defines]);

	// Reduces a subexpression and isolates it from any presuppositions
	const reduceAndIsolate = (e: Expr) => {
		let reduced = reduce_(e, premises);
		while (reduced.head === 'presuppose') {
			addPresupposition(reduced.presupposition, reduced.defines);
			reduced = reduced.body;
		}
		return reduced;
	};

	// Reduces a subexpression inside a quantifier and isolates it from
	// presuppositions where possible
	const quantifierReduceAndIsolate = (e: Expr) => {
		let reduced = reduce_(e, premises);
		const innerPresuppositions: [Expr, number | undefined][] = [];
		while (reduced.head === 'presuppose') {
			try {
				const mapping = (i: number) => {
					if (i === 0) throw new Impossible('Quantified variable used');
					return i - 1;
				};
				addPresupposition(
					rewriteContext(
						reduced.presupposition,
						reduced.presupposition.context.slice(1),
						mapping,
					),
					reduced.defines === undefined ? undefined : mapping(reduced.defines),
				);
			} catch (e) {
				// This presupposition evidently uses the quantified variable and cannot be
				// lifted
				innerPresuppositions.push([reduced.presupposition, reduced.defines]);
			}
			reduced = reduced.body;
		}
		return innerPresuppositions.reduceRight<Expr>(
			(acc, [p, defines]) => presuppose(acc, p, defines),
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
			const reduced = app(
				reduceAndIsolate(e.fn),
				reduceAndIsolate(e.argument),
			) as Expr & {
				head: 'apply';
			};
			const rfn = reduced.fn;
			body =
				rfn.head === 'lambda' &&
				(isSmallExpr(reduced.argument) || varOccurrences(rfn.body, 0) < 2)
					? reduceAndIsolate(betaReduce(reduced))
					: reduced;
			break;
		}
		case 'presuppose': {
			const presupposition = reduceAndIsolate(e.presupposition);
			if (!isPremise(presupposition))
				addPresupposition(presupposition, e.defines);
			body = withPremise(presupposition, () => reduceAndIsolate(e.body));
			break;
		}
	}

	return [...presuppositions.values()].reduceRight(
		(acc, [p, defines]) => presuppose(acc, p, defines),
		body,
	);
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
	for (const kind of ['index', 'variable', 'animacy', 'head'] as const) {
		for (const [slot, b] of bs[kind]) {
			fn(
				b,
				bs => bs[kind].get(slot as never),
				(bs, b) =>
					b === undefined
						? bs[kind].delete(slot as never)
						: bs[kind].set(slot as never, b),
			);
		}
	}

	if (bs.resumptive !== undefined)
		fn(
			bs.resumptive,
			bs => bs.resumptive,
			(bs, b) => (b === undefined ? delete bs.resumptive : (bs.resumptive = b)),
		);
	if (bs.covertResumptive !== undefined)
		fn(
			bs.covertResumptive,
			bs => bs.covertResumptive,
			(bs, b) =>
				b === undefined
					? delete bs.covertResumptive
					: (bs.covertResumptive = b),
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
			? presuppose(body, e.presupposition, e.defines)
			: body;
	} else {
		return e;
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

/**
 * Iterates over the subexpressions of a given expression, without traversing
 * into deeper contexts (like quantifier bodies).
 */
function* subexprsShallow(e: Expr): Generator<Expr, void, unknown> {
	yield e;

	switch (e.head) {
		case 'variable':
		case 'lambda':
		case 'constant':
		case 'quote':
			break;
		case 'verb':
			for (const a of e.args) yield* subexprsShallow(a);
			yield* subexprsShallow(e.event);
			yield* subexprsShallow(e.world);
			break;
		case 'apply':
			yield* subexprsShallow(e.fn);
			yield* subexprsShallow(e.argument);
			break;
		case 'presuppose':
			yield* subexprsShallow(e.body);
			yield* subexprsShallow(e.presupposition);
			break;
		default:
			e satisfies never; // This switch statement should be exhaustive
	}
}

/**
 * Iterates over the usages of free variables within an expression.
 */
export function* freeVariableUsages(e: Expr): Generator<number, void, unknown> {
	for (const sub of subexprsShallow(e)) {
		switch (sub.head) {
			case 'variable':
				yield sub.index;
				break;
			case 'lambda':
				for (const i of freeVariableUsages(sub.body)) if (i !== 0) yield i - 1;
				if (sub.restriction !== undefined)
					for (const i of freeVariableUsages(sub.restriction))
						if (i !== 0) yield i - 1;
				break;
		}
	}
}

/**
 * Iterates over definitions of other variables that are relative to the given
 * variable.
 */
function* relativeDefinitions(
	e: Expr,
	index: number,
): Generator<number, void, unknown> {
	for (const sub of subexprsShallow(e)) {
		switch (sub.head) {
			case 'presuppose':
				if (
					sub.defines !== undefined &&
					sub.defines !== index &&
					some(freeVariableUsages(sub.presupposition), i => i === index)
				)
					yield sub.defines;
				break;
			case 'lambda':
				for (const i of relativeDefinitions(sub.body, index + 1))
					if (i !== 0) yield i - 1;
				if (sub.restriction !== undefined)
					for (const i of relativeDefinitions(sub.restriction, index + 1))
						if (i !== 0) yield i - 1;
		}
	}
}

/**
 * Skolemizes all entities that are defined in terms of the given variable (i.e.
 * are presupposed to stand in a certain relation to it), so that they become a
 * function of that variable.
 *
 * The input expression must be in normal form.
 *
 * @returns The new expression and a mapping from the old context to the new
 *   context.
 */
export function skolemize(e: Expr, index: number): [Expr, (number | null)[]] {
	// Gather the indices of all entities defined in terms of the given variable
	const dependents = [...new Set(relativeDefinitions(e, index))].sort();

	// Add the functions for each skolemized entity to the end of the context
	const c = [
		...e.context,
		...dependents.map(
			i => [e.context[index], e.context[i]] as [ExprType, ExprType],
		),
	];
	const newToOld = e.context.map((_t, i) => i);
	e = rewriteContext(e, [...c], i => i);

	// Substitute each entity in turn with its skolemized form
	for (const [d, i] of enumerate(dependents)) {
		const d_ = d - i;
		c.splice(d_, 1);
		newToOld.splice(d_, 1);
		if (index > d_) index--;
		const fn = c.length - dependents.length + i;
		e = substitute(d_, app(v(fn, c), v(index, c)), e, fn);
	}

	// Invert the new → old mapping
	const oldToNew = e.context.map<number | null>(() => null);
	for (const [old, new_] of enumerate(newToOld)) oldToNew[old] = new_;

	return [e, oldToNew];
}
