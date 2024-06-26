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
interface EventCompound {
	head: 'event_compound';
	type: 't';
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
		head: 'event_compound',
		type: 't',
		context,
		verbName,
		world,
		aspect,
		agent,
		args,
		body,
	};
}

export type CompactExpr = Expr | EventCompound;

/**
 * If the given "∃e." expression can be turned into compound event notation, do
 * so. Otherwise, return `undefined`.
 */
function detectCompound(
	expr: Expr & { head: 'quantifier' },
): EventCompound | undefined {
	// We're only interested in "∃e. τ(e) ... t ∧ blah":
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

/**
 * Walk the expression, compacting event notation everywhere it detects an
 * opportunity to do so.
 */
export function compact(expr: CompactExpr): CompactExpr {
	switch (expr.head) {
		case 'variable':
		case 'constant':
		case 'quote':
			return expr;
		case 'verb':
			return {
				...expr,
				args: expr.args.map(x => compact(x)) as [] | [Expr] | [Expr, Expr],
			};
		case 'lambda':
			return { ...expr, body: compact(expr.body) as Expr };
		case 'apply':
			return {
				...expr,
				fn: compact(expr.fn) as Expr,
				argument: compact(expr.argument) as Expr,
			};
		case 'presuppose':
			return {
				...expr,
				presupposition: compact(expr.presupposition) as Expr,
				body: compact(expr.body) as Expr,
			};
		case 'quantifier':
			const compound = detectCompound(expr);
			if (compound) return compact(compound) as Expr;
			return {
				...expr,
				restriction: expr.restriction
					? (compact(expr.restriction) as Expr)
					: undefined,
				body: compact(expr.body) as Expr,
			};
		case 'event_compound':
			return {
				...expr,
				args: expr.args.map(x => compact(x)) as [] | [Expr] | [Expr, Expr],
				body: expr.body ? (compact(expr.body) as Expr) : undefined,
			};
	}
}
