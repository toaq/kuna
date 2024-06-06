import { Impossible } from '../core/error';
import { CompactExpr } from './compact';
import { Expr, ExprType } from './model';
import {
	Format,
	NameType,
	Names,
	constantAlphabets,
	variableAlphabets,
} from './format/base';
import { plainText, latex, json, JsonExpr } from './format';

const infixPrecedence: Record<(Expr & { head: 'infix' })['name'], number> = {
	and: 4,
	or: 3,
	equals: 5,
	subinterval: 10,
	before: 9,
	after: 8,
	before_near: 7,
	after_near: 6,
	subevent: 11,
	coevent: 12,
	roi: 13,
};

const infixAssociativity: Record<(Expr & { head: 'infix' })['name'], boolean> =
	{
		and: true,
		or: true,
		equals: false,
		subinterval: false,
		before: false,
		after: false,
		before_near: false,
		after_near: false,
		subevent: false,
		coevent: false,
		roi: true,
	};

const noNames: Names = {
	context: [],
	nextVariableIds: {
		e: 0,
		v: 0,
		i: 0,
		s: 0,
		fn: 0,
	},
	nextConstantIds: {
		e: 0,
		v: 0,
		i: 0,
		s: 0,
		fn: 0,
	},
};

function getNameType(type: ExprType): NameType {
	return typeof type === 'string' && type !== 't' && type !== 'a' ? type : 'fn';
}

/**
 * Adds a new name of type 'type' to the given naming context.
 */
function addName(type: ExprType, names: Names, constant = false): Names {
	const nameType = getNameType(type);
	const alphabets = constant ? constantAlphabets : variableAlphabets;
	const alphabetSize = alphabets[nameType].length;
	const ids = constant ? names.nextConstantIds : names.nextVariableIds;

	let id = ids[nameType];
	// If this name is already taken, try the same name one alphabetSize later
	while (
		names.context.some(
			n => n.constant === constant && n.type === type && n.id === id,
		)
	)
		id += alphabetSize;

	const name = { id, type: nameType, constant };
	const nextIds = { ...ids, [nameType]: ids[nameType] + 1 };
	return {
		context: [name, ...names.context],
		nextVariableIds: constant ? names.nextVariableIds : nextIds,
		nextConstantIds: constant ? nextIds : names.nextConstantIds,
	};
}

function getName<T>(index: number, names: Names, fmt: Format<T>): T {
	return fmt.name(names.context[index]);
}

/**
 * @param e The (sub)expression to be rendered.
 * @param names The naming context for the variables and constants currently in
 *   scope.
 * @param fmt The rendering format specification.
 * @param leftPrecedence The precedence of the closest operator to the right of
 *   this subexpression that could affect its bracketing.
 * @param rightPrecedence The precedence of the closest operator to the left of
 *   this subexpression that could affect its bracketing.
 */
function render<T>(
	e: CompactExpr,
	names: Names,
	fmt: Format<T>,
	leftPrecedence: number,
	rightPrecedence: number,
): T {
	switch (e.head) {
		case 'variable': {
			return getName(e.index, names, fmt);
		}
		case 'verb': {
			const args = e.args.map(arg => render(arg, names, fmt, 0, 0));
			const event = render(e.event, names, fmt, 0, 0);
			const world = render(e.world, names, fmt, 0, 0);
			return fmt.verb(e.name, args, event, world);
		}
		case 'lambda': {
			const symbol = fmt.symbolForQuantifier('lambda');
			const p = 2;
			const bracket = rightPrecedence > p;
			const innerNames = addName(e.type[0], names);
			const name = getName(0, innerNames, fmt);
			const body = render(
				e.body as Expr,
				innerNames,
				fmt,
				p,
				bracket ? 0 : rightPrecedence,
			);

			let content: T;
			if (e.restriction === undefined) {
				content = fmt.quantifier(symbol, name, body);
			} else {
				const restriction = render(
					e.restriction as Expr,
					innerNames,
					fmt,
					0,
					0,
				);
				content = fmt.restrictedQuantifier(symbol, name, restriction, body);
			}

			return bracket ? fmt.bracket(content) : content;
		}
		case 'apply': {
			const p = 13;
			const bracket = leftPrecedence > p;
			const fn = render(e.fn, names, fmt, bracket ? 0 : leftPrecedence, p);
			const argument = render(e.argument, names, fmt, 0, 0);
			const content = fmt.apply(fn, argument);
			return bracket ? fmt.bracket(content) : content;
		}
		case 'presuppose': {
			const p = 1;
			const bracket = leftPrecedence >= p || rightPrecedence > p;
			const body = render(e.body, names, fmt, bracket ? 0 : leftPrecedence, p);
			const presupposition = render(
				e.presupposition,
				names,
				fmt,
				p,
				bracket ? 0 : rightPrecedence,
			);
			const content = fmt.presuppose(body, presupposition);
			return bracket ? fmt.bracket(content) : content;
		}
		case 'infix': {
			const symbol = fmt.symbolForInfix(e.name);
			const p = infixPrecedence[e.name];
			const associative = infixAssociativity[e.name];
			const bracket =
				(leftPrecedence > p || rightPrecedence > p) &&
				!(associative && (leftPrecedence === p || rightPrecedence === p));

			const left = render(e.left, names, fmt, bracket ? 0 : leftPrecedence, p);
			const right = render(
				e.right,
				names,
				fmt,
				p,
				bracket ? 0 : rightPrecedence,
			);
			const content = fmt.infix(symbol, left, right);
			return bracket ? fmt.bracket(content) : content;
		}
		case 'polarizer': {
			const symbol = fmt.symbolForPolarizer(e.name);
			const p = 12;
			const bracket = rightPrecedence > p;
			const body = render(e.body, names, fmt, p, bracket ? 0 : rightPrecedence);
			const content = fmt.polarizer(symbol, body);
			return bracket ? fmt.bracket(content) : content;
		}
		case 'quantifier': {
			const symbol = fmt.symbolForQuantifier(e.name);
			const p = 2;
			const bracket = rightPrecedence > p;
			const innerNames = addName(e.body.context[0], names);
			const name = getName(0, innerNames, fmt);
			const body = render(
				e.body as Expr,
				innerNames,
				fmt,
				p,
				bracket ? 0 : rightPrecedence,
			);

			let content: T;
			if (e.restriction === undefined) {
				content = fmt.quantifier(symbol, name, body);
			} else {
				const restriction = render(
					e.restriction as Expr,
					innerNames,
					fmt,
					0,
					0,
				);
				content = fmt.restrictedQuantifier(symbol, name, restriction, body);
			}

			return bracket ? fmt.bracket(content) : content;
		}
		case 'constant': {
			return fmt.symbolForConstant(e.name);
		}
		case 'quote': {
			return fmt.quote(e.text);
		}
		case 'event_compound': {
			const symbol = fmt.symbolForQuantifier('some');
			const p = 2;
			const bracket = rightPrecedence > p;
			let body: T | undefined;
			const innerNames = addName('v', names);
			const eventName = getName(0, innerNames, fmt);
			if (e.body) {
				body = render(
					e.body as Expr,
					innerNames,
					fmt,
					p,
					bracket ? 0 : rightPrecedence,
				);
			}
			const world = render(e.world, innerNames, fmt, 0, 0);
			if (e.aspect.head !== 'infix') throw new Impossible('Non-infix aspect');
			const aspect = fmt.aspect(
				fmt.symbolForInfix(e.aspect.name),
				render(e.aspect.right, innerNames, fmt, 0, 0),
			);
			const agent = e.agent
				? render(e.agent, innerNames, fmt, 0, 0)
				: undefined;
			const args = e.args.map(arg => render(arg, innerNames, fmt, 0, 0));
			const content = fmt.eventCompound(
				symbol,
				e.verbName,
				eventName,
				world,
				aspect,
				agent,
				args,
				body,
			);

			return bracket ? fmt.bracket(content) : content;
		}
	}
}

const renderCache = new Map<Format<any>, WeakMap<CompactExpr, unknown>>();

function renderFull<T>(e: CompactExpr, fmt: Format<T>): T {
	let cache = renderCache.get(fmt);
	if (cache === undefined) {
		cache = new WeakMap();
		renderCache.set(fmt, cache);
	}
	const cachedResult = cache.get(e) as T;
	if (cachedResult !== undefined) return cachedResult;

	let names = noNames;
	// Create ad hoc constants for all free variables
	for (let i = e.context.length - 1; i >= 0; i--) {
		const type = e.context[i];
		// Free variables of type s should be rendered like variables rather than
		// constants to avoid conflict with the 'real world' symbol
		names = addName(e.context[i], names, type !== 's');
	}

	const result = render(e, names, fmt, 0, 0);
	cache.set(e, result);
	return result;
}

export function toPlainText(e: CompactExpr): string {
	return renderFull(e, plainText);
}

export function toLatex(e: CompactExpr): string {
	return renderFull(e, latex);
}

export function toJson(e: CompactExpr): JsonExpr {
	return renderFull(e, json) as JsonExpr;
}

// A replacement for JSON.stringify that uses less linebreaks, à la Haskell coding style.
export function jsonStringifyCompact(expr: any): string {
	if (!(typeof expr === 'object')) return JSON.stringify(expr);

	const isArray = Array.isArray(expr);
	const [opening, closing] = ['{}', '[]'][+isArray];

	const entries = Object.entries(expr);
	if (!entries.length) return `${opening} ${closing}`;

	return entries
		.map(([key, value], index, { length }) => {
			const maybeKey = isArray ? '' : `${JSON.stringify(key)}: `;
			const valueStringified = jsonStringifyCompact(value)
				.split('\n')
				.join('\n' + ' '.repeat(isArray ? 4 : 2 + maybeKey.length));
			const maybeOpening = index === 0 ? `${opening} ` : '';
			const commaOrClosing = index === length - 1 ? ` ${closing}` : ',';
			return maybeOpening + maybeKey + valueStringified + commaOrClosing;
		})
		.join('\n');
}

export function typeToPlainText(t: ExprType): string {
	return typeof t === 'string'
		? t
		: `⟨${typeToPlainText(t[0])},${typeToPlainText(t[1])}⟩`;
}

export function typeToLatex(t: ExprType): string {
	return typeof t === 'string'
		? `\\text{${t}}`
		: `\langle ${typeToLatex(t[0])}, ${typeToLatex(t[1])} \rangle`;
}

export function typesToPlainText(ts: ExprType[]): string {
	return ts.map(typeToPlainText).join(', ');
}
