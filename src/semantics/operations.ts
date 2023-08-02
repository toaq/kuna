import {
	app,
	constant,
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
function rewriteContext(
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

/**
 * Rewrites the given expressions so that they all share the same context.
 */
export function unifyContexts(...es: Expr[]): Expr[] {
	const newContext = es.flatMap(e => e.context);
	let offset = 0;
	return es.map(e => {
		const newExpr = rewriteContext(e, newContext, i => i + offset);
		offset += e.context.length;
		return newExpr;
	});
}
