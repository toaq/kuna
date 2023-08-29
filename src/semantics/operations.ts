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
	v,
	verb,
	λ,
} from './model';

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
			return infix(e.name, e.left.type, e.type, sub(e.left), sub(e.right));
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
function reduceOnce(e: Expr): Expr {
	if (e.head === 'apply' && e.fn.head === 'lambda') {
		// TODO: lift presuppositions
		const body = substitute(0, e.argument, e.fn.body);
		return e.fn.restriction === undefined
			? body
			: presuppose(body, substitute(0, e.argument, e.fn.restriction));
	} else {
		return e;
	}
}

/**
 * β-reduces an expression to normal form.
 */
export function reduce(e: Expr): Expr {
	switch (e.head) {
		case 'variable': {
			return e;
		}
		case 'verb': {
			return verb(
				e.name,
				e.args.map(reduce) as [] | [Expr] | [Expr, Expr],
				reduce(e.event),
				reduce(e.world),
			);
		}
		case 'lambda': {
			return λ(
				e.body.context[0],
				e.context,
				() => reduce(e.body),
				e.restriction === undefined ? undefined : () => reduce(e.restriction!),
			);
		}
		case 'apply': {
			// Reduce each subexpression before attempting a β-reduction, in case this
			// reveals a new β-reduction opportunity
			const subexprsReduced = app(reduce(e.fn), reduce(e.argument)) as Expr & {
				head: 'apply';
			};
			return subexprsReduced.fn.head === 'lambda'
				? reduce(reduceOnce(subexprsReduced))
				: subexprsReduced;
		}
		case 'presuppose': {
			return presuppose(reduce(e.body), reduce(e.presupposition));
		}
		case 'infix': {
			return infix(
				e.name,
				e.left.type,
				e.type,
				reduce(e.left),
				reduce(e.right),
			);
		}
		case 'polarizer': {
			return polarizer(e.name, reduce(e.body));
		}
		case 'quantifier': {
			return quantifier(
				e.name,
				e.body.context[0] as 'e' | 's' | 'v',
				e.context,
				() => reduce(e.body),
				e.restriction === undefined ? undefined : () => reduce(e.restriction!),
			);
		}
		case 'constant': {
			return e;
		}
	}
}

export function mapBindings(
	bs: Bindings,
	mapping: (b: Binding) => Binding,
): Bindings {
	const newBindings = cloneBindings(bs);
	for (const map of Object.values(newBindings)) {
		for (const [slot, b] of Object.entries(map)) {
			map[slot] = mapping(b as Binding);
		}
	}
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
		throw new Error(
			`Can't unify a semantically empty ${left.label} with a ${right.label}`,
		);
	if (right.denotation === null)
		throw new Error(
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

	// TODO: implement the 'Cho máma hó/áq' rule using the subordinate field

	// For each binding referenced in the right subtree
	for (const [kind_, map] of Object.entries(right.bindings)) {
		const kind = kind_ as keyof Bindings;
		for (const [slot, rb_] of Object.entries(map)) {
			const rb = rb_ as Binding;
			if (rb !== undefined) {
				// If there is a matching binding in the left subtree
				const lb = (left.bindings[kind] as { [K in string]?: Binding })[slot];
				if (lb !== undefined) {
					// Then unify the variables
					(bindings[kind] as { [K in string]?: Binding })[slot] = {
						index: lb.index,
						subordinate: lb.subordinate && rb.subordinate,
					};
					rightMapping[rb.index] = lb.index;
				} else {
					// Otherwise, create a new variable
					(bindings[kind] as { [K in string]?: Binding })[slot] = {
						index: context.length,
						subordinate: rightSubordinate || rb.subordinate,
					};
					rightMapping[rb.index] = context.length;
					context.push(right.denotation.context[rb.index]);
				}
			}
		}
	}

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
 * Turns a denotation with an implicit world variable into a function taking a
 * world as the final explicit argument.
 */
export function makeWorldExplicit(tree: DTree): DTree {
	const e = tree.denotation;
	if (e === null)
		throw new Error("Can't make world explicit in a null denotation");

	const worldIndex = e.context.findIndex(t => t === 's');
	if (worldIndex === -1) throw new Error('No world variable to make explicit');

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

	return {
		...tree,
		denotation: reduce(result),
		bindings: mapBindings(tree.bindings, b => ({
			...b,
			index: b.index < worldIndex ? b.index + 1 : b.index,
		})),
	};
}
