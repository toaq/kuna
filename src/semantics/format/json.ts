// TypeScript won't allow { ['a' | 'b']: 'c' } for { a: 'c' } | { b: 'c' }, but it

import { Format, Infix, Name, Polarizer, Quantifier } from './base';

// will happily split a union type case-by-case in a mapped type and as a map index.
type OneKeyAmong<Keys extends string, Value> = {
	[key in Keys]: { [_ in key]: Value };
}[Keys];

type JsonAspect = { infix: string; right: JsonExpr };

export type JsonExpr =
	| { variable: string }
	| { constant: string }
	| { quote: string }
	| { verb: string; event: JsonExpr; world: JsonExpr; args: JsonExpr[] }
	| JsonQuantifierExpr
	| {
			compound: string;
			event: JsonExpr;
			world: JsonExpr;
			aspect: JsonAspect;
			agent?: JsonExpr;
			args: JsonExpr[];
			body?: JsonExpr;
	  }
	| { apply: JsonExpr; to: JsonExpr }
	| { let: JsonExpr; value: JsonExpr; in: JsonExpr }
	| { claim: JsonExpr; presupposing: JsonExpr }
	| { infix: Infix; left: JsonExpr; right: JsonExpr }
	| JsonPolarizerExpr;

type JsonQuantifierExpr = OneKeyAmong<Quantifier, string> & {
	restriction?: JsonExpr;
	body: JsonExpr;
};

// TypeScript will complain about a circular type definition if we use
// OneKeyAmong here (possibly because there's no &-intersection-type
// refinement).
type JsonPolarizerExpr = {
	[polarizer in Polarizer]: { [_ in polarizer]: JsonExpr };
}[Polarizer];

type JsonExprIntermediate = JsonExpr | JsonAspect | string;

export const json: Format<JsonExprIntermediate> = {
	bracket: expr => expr,
	name: ({ id, type }: Name) => ({ variable: `${type}${id}` }),
	verb: (verb, args, event, world) => ({
		verb,
		args: args as JsonExpr[],
		event: event as JsonExpr,
		world: world as JsonExpr,
	}),
	symbolForQuantifier: quantifier => quantifier,
	quantifier: (symbol, name, body) =>
		({
			[symbol as Quantifier]: (name as { variable: string }).variable,
			body: body as JsonExpr,
		}) as JsonQuantifierExpr,
	restrictedQuantifier: (symbol, name, restriction, body) =>
		Object.assign(json.quantifier(symbol, name, body), {
			restriction: restriction as JsonExpr,
		}),
	aspect: (infix, right) => ({
		infix: infix as string,
		right: right as JsonExpr,
	}),
	eventCompound: (
		_symbol,
		verbName,
		event,
		world,
		aspect,
		agent,
		args,
		body,
	) => ({
		compound: verbName,
		event: event as JsonExpr,
		world: world as JsonExpr,
		aspect: aspect as JsonAspect,
		args: args as JsonExpr[],
		...(agent && { agent: agent as JsonExpr }),
		...(body && { body: body as JsonExpr }),
	}),
	apply: (apply, to) => ({ apply: apply as JsonExpr, to: to as JsonExpr }),
	presuppose: (claim, presupposing) => ({
		claim: claim as JsonExpr,
		presupposing: presupposing as JsonExpr,
	}),
	let: (name, value, body) => ({
		let: name as JsonExpr,
		value: value as JsonExpr,
		in: body as JsonExpr,
	}),
	symbolForInfix: infix => infix,
	infix: (infix, left, right) => ({
		infix: infix as Infix,
		left: left as JsonExpr,
		right: right as JsonExpr,
	}),
	polarizer: (polarizer, body) =>
		({ [polarizer as Polarizer]: body as JsonExpr }) as JsonPolarizerExpr,
	symbolForConstant: constant => ({ constant }),
	quote: quote => ({ quote }),
};
