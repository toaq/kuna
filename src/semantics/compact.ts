import {
	Expr,
	ExprType,
	and,
	assertContextsEqual,
	assertSubtype,
} from './model';

/**
 * Compact notation for saying events exist.
 *
 * ∃hao[asp,w,e](x;y,z). Body(e)
 * means
 * ∃e. asp(e) ∧ hao_w(y,z)(e) ∧ AGENT(e)=x ∧ Body(e)
 */
export interface EventCompound {
	type: ['v', 't'];
	context: ExprType[];
	verbName: string;
	world: Expr;
	aspect: Expr;
	agent?: Expr;
	args: [] | [Expr] | [Expr, Expr];
	body?: Expr;
}

export function eventCompound(
	context: ExprType[],
	verbName: string,
	world: Expr,
	aspect: Expr,
	agent: Expr | undefined,
	args: [] | [Expr] | [Expr, Expr],
	body: Expr | undefined,
): EventCompound {
	assertSubtype(world.type, 's');
	assertSubtype(aspect.type, 't');
	if (body) assertSubtype(body.type, 't');
	for (const arg of args) assertContextsEqual(arg.context, ['v', ...context]);
	assertContextsEqual(['v', ...context], world.context);

	return {
		type: ['v', 't'],
		context,
		verbName,
		world,
		aspect,
		agent,
		args,
		body,
	};
}

/**
 * If the given "λe." expression can be turned into compound event notation, do
 * so. Otherwise, return `undefined`.
 */
export function detectCompound(
	expr: Expr & { head: 'lambda' },
): EventCompound | undefined {
	// We're only interested in "λe. τ(e) ... t ∧ blah":
	if (
		expr.body.context[0] !== 'v' ||
		expr.body.head !== 'apply' ||
		expr.body.fn.head !== 'apply' ||
		expr.body.fn.fn.head !== 'constant' ||
		expr.body.fn.fn.name !== 'and'
	) {
		return undefined;
	}
	const aspect = expr.body.fn.argument;
	let rest = expr.body.argument;
	let agent: Expr | undefined;

	// We might have to turn (x ∧ y) ∧ z into x ∧ (y ∧ z):
	while (
		rest.head === 'apply' &&
		rest.fn.head === 'apply' &&
		rest.fn.fn.head === 'constant' &&
		rest.fn.fn.name === 'and' &&
		rest.fn.argument.head === 'apply' &&
		rest.fn.argument.fn.head === 'apply' &&
		rest.fn.argument.fn.fn.head === 'constant' &&
		rest.fn.argument.fn.fn.name === 'and'
	) {
		rest = and(
			rest.fn.argument.fn.argument,
			and(rest.fn.argument.argument, rest.argument),
		);
	}

	// There might be an AGENT(e)(w) = x. Extract x then skip ahead.
	if (
		rest.head === 'apply' &&
		rest.fn.head === 'apply' &&
		rest.fn.fn.head === 'constant' &&
		rest.fn.fn.name === 'and' &&
		rest.fn.argument.head === 'apply' &&
		rest.fn.argument.fn.head === 'apply' &&
		rest.fn.argument.fn.fn.head === 'constant' &&
		rest.fn.argument.fn.fn.name === 'equals' &&
		rest.fn.argument.fn.argument.head === 'apply' &&
		rest.fn.argument.fn.argument.argument.type === 's' &&
		rest.fn.argument.fn.argument.fn.head === 'apply' &&
		rest.fn.argument.fn.argument.fn.argument.type === 'v' &&
		rest.fn.argument.fn.argument.fn.fn.head === 'constant' &&
		rest.fn.argument.fn.argument.fn.fn.name === 'agent'
	) {
		agent = rest.fn.argument.argument;
		rest = rest.argument;
	}

	// Now we expect a verb, or a verb AND some other statement.
	if (rest.head === 'verb') {
		return eventCompound(
			expr.context,
			rest.name,
			rest.world,
			aspect,
			agent,
			rest.args,
			undefined,
		);
	}

	if (
		rest.head === 'apply' &&
		rest.fn.head === 'apply' &&
		rest.fn.fn.head === 'constant' &&
		rest.fn.fn.name === 'and' &&
		rest.fn.argument.head === 'verb'
	) {
		return eventCompound(
			expr.context,
			rest.fn.argument.name,
			rest.fn.argument.world,
			aspect,
			agent,
			rest.fn.argument.args,
			rest.argument,
		);
	}

	return undefined;
}
