import { Expr, ExprType, assertContextsEqual, assertSubtype } from './model';
import { toPlainText } from './render';

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
		expr.body.head !== 'infix' ||
		expr.body.name !== 'and' ||
		expr.body.left.head !== 'infix'
	) {
		return undefined;
	}
	const aspect = expr.body.left;
	let rest = expr.body.right;
	let agent: Expr | undefined;

	// We might have to turn (x ∧ y) ∧ z into x ∧ (y ∧ z):
	while (
		rest.head === 'infix' &&
		rest.name === 'and' &&
		rest.left.head === 'infix' &&
		rest.left.name === 'and'
	) {
		rest = {
			...rest,
			left: rest.left.left,
			right: {
				head: 'infix',
				type: rest.left.type,
				context: rest.left.context,
				name: 'and',
				left: rest.left.right,
				right: rest.right,
			},
		};
	}

	// There might be an AGENT(e)(w) = x:
	if (
		rest.head === 'infix' &&
		rest.name === 'and' &&
		rest.left.head === 'infix' &&
		rest.left.name === 'equals' &&
		rest.left.left.head === 'apply' &&
		rest.left.left.argument.type === 's' &&
		rest.left.left.fn.head === 'apply' &&
		rest.left.left.fn.argument.type === 'v' &&
		rest.left.left.fn.fn.head === 'constant' &&
		rest.left.left.fn.fn.name === 'agent'
	) {
		agent = rest.left.right;
		rest = rest.right;
	}

	// Now we expect a verb, or a verb with some stuff attached.
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
		rest.head === 'infix' &&
		rest.name === 'and' &&
		rest.left.head === 'verb'
	) {
		return eventCompound(
			expr.context,
			rest.left.name,
			rest.left.world,
			aspect,
			agent,
			rest.left.args,
			rest.right,
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
		case 'infix':
			return {
				...expr,
				left: compact(expr.left) as Expr,
				right: compact(expr.right) as Expr,
			};
		case 'polarizer':
			return { ...expr, body: compact(expr.body) as Expr };
		case 'constant':
			return expr;
		case 'presuppose':
			return { ...expr, body: compact(expr.body) as Expr };
		case 'quantifier':
			const compound = detectCompound(expr);
			if (compound) return compact(compound) as Expr;
			return { ...expr, body: compact(expr.body) as Expr };
		case 'event_compound':
			return {
				...expr,
				args: expr.args.map(x => compact(x)) as [] | [Expr] | [Expr, Expr],
				body: expr.body ? (compact(expr.body) as Expr) : undefined,
			};
	}
}
