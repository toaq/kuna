import { Impossible } from '../core/error';
import {
	Expr,
	ExprType,
	KnownConstant,
	KnownInfix,
	KnownPolarizer,
	KnownQuantifier,
} from './model';
import {
	Format,
	NameType,
	Names,
	Quantifier,
	constantAlphabets,
	variableAlphabets,
} from './format/base';
import { JsonExpr } from './format/json';
import { plainText, latex, json, mathml } from './format';
import { EventCompound, detectCompound } from './compact';

const infixPrecedence: Record<KnownInfix['name'], number> = {
	and: 5,
	or: 4,
	implies: 3,
	equals: 6,
	subinterval: 11,
	before: 10,
	after: 9,
	before_near: 8,
	after_near: 7,
	roi: 13,
	coevent: 12,
};

const infixAssociativity: Record<KnownInfix['name'], boolean> = {
	and: true,
	or: true,
	implies: false,
	equals: false,
	subinterval: false,
	before: false,
	after: false,
	before_near: false,
	after_near: false,
	roi: true,
	coevent: false,
};

const polarizerPrecedence: Record<KnownPolarizer['name'], number> = {
	not: 14,
	indeed: 14,
};

const quantifiers: Record<KnownQuantifier['name'], {}> = {
	some: {},
	every: {},
	every_sing: {},
	every_cuml: {},
	gen: {},
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

class Renderer<T> {
	private cache: WeakMap<Expr, unknown> = new WeakMap();
	constructor(
		private fmt: Format<T>,
		private compact: boolean,
	) {}

	private getName(index: number, names: Names): T {
		return this.fmt.name(names.context[index]);
	}

	private renderQuantifier(
		e: Expr & { head: 'lambda' },
		q: Quantifier,
		names: Names,
		rightPrecedence: number,
	): T {
		if (this.compact) {
			const compound = detectCompound(e);
			if (compound) {
				return this.renderEventCompound(compound, q, names, rightPrecedence);
			}
		}
		const symbol = this.fmt.symbolForQuantifier(q);
		const p = 2;
		const bracket = rightPrecedence > p;
		const innerNames = addName(e.type[0], names);
		const name = this.getName(0, innerNames);
		const body = this.render(
			e.body as Expr,
			innerNames,
			p,
			bracket ? 0 : rightPrecedence,
		);

		let content: T;
		if (e.restriction === undefined) {
			content = this.fmt.quantifier(symbol, name, body);
		} else {
			const restriction = this.render(e.restriction as Expr, innerNames, 0, 0);
			content = this.fmt.restrictedQuantifier(symbol, name, restriction, body);
		}

		return bracket ? this.fmt.bracket(content) : content;
	}

	private renderEventCompound(
		e: EventCompound,
		q: Quantifier,
		names: Names,
		rightPrecedence: number,
	): T {
		const symbol = this.fmt.symbolForQuantifier(q);
		const p = 2;
		const bracket = rightPrecedence > p;
		let body: T | undefined;
		const innerNames = addName('v', names);
		const eventName = this.getName(0, innerNames);
		if (e.body) {
			body = this.render(
				e.body as Expr,
				innerNames,
				p,
				bracket ? 0 : rightPrecedence,
			);
		}
		const world = this.render(e.world, innerNames, 0, 0);
		if (
			e.aspect.head !== 'apply' ||
			e.aspect.fn.head !== 'apply' ||
			e.aspect.fn.fn.head !== 'constant'
		)
			throw new Impossible('Non-infix aspect');
		const aspect = this.fmt.aspect(
			this.fmt.symbolForInfix(e.aspect.fn.fn.name as KnownInfix['name']),
			this.render(e.aspect.argument, innerNames, 0, 0),
		);
		const agent = e.agent ? this.render(e.agent, innerNames, 0, 0) : undefined;
		const args = e.args.map(arg => this.render(arg, innerNames, 0, 0));
		const content = this.fmt.eventCompound(
			symbol,
			e.verbName,
			eventName,
			world,
			aspect,
			agent,
			args,
			body,
		);

		return bracket ? this.fmt.bracket(content) : content;
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
	private render(
		e: Expr,
		names: Names,
		leftPrecedence: number,
		rightPrecedence: number,
	): T {
		switch (e.head) {
			case 'variable': {
				return this.getName(e.index, names);
			}
			case 'verb': {
				const args = e.args.map(arg => this.render(arg, names, 0, 0));
				const event = this.render(e.event, names, 0, 0);
				const world = this.render(e.world, names, 0, 0);
				return this.fmt.verb(e.name, args, event, world);
			}
			case 'lambda': {
				return this.renderQuantifier(e, 'lambda', names, rightPrecedence);
			}
			case 'apply': {
				if (e.fn.head === 'lambda' && e.fn.restriction === undefined) {
					// Turn (λx. ϕ)(c) into "let x = c in ϕ".
					const p = 2;
					const bracket = leftPrecedence > p;
					const innerNames = addName(e.argument.type, names);
					const name = this.getName(0, innerNames);
					const value = this.render(e.argument, names, 0, 0);
					const body = this.render(e.fn.body, innerNames, 0, 0);
					const content = this.fmt.let(name, value, body);
					return bracket ? this.fmt.bracket(content) : content;
				} else if (
					e.fn.head === 'apply' &&
					e.fn.fn.head === 'constant' &&
					e.fn.fn.name in infixPrecedence
				) {
					const name = e.fn.fn.name as KnownInfix['name'];
					const symbol = this.fmt.symbolForInfix(name);
					const p = infixPrecedence[name];
					const associative = infixAssociativity[name];
					const bracket =
						(leftPrecedence > p || rightPrecedence > p) &&
						!(associative && (leftPrecedence === p || rightPrecedence === p));

					const lp = bracket ? 0 : leftPrecedence;
					const rp = bracket ? 0 : rightPrecedence;
					const left = this.render(e.fn.argument, names, lp, p);
					const right = this.render(e.argument, names, p, rp);
					const content = this.fmt.infix(symbol, left, right);
					return bracket ? this.fmt.bracket(content) : content;
				} else if (
					e.fn.head === 'constant' &&
					e.fn.name in polarizerPrecedence
				) {
					const name = e.fn.name as KnownPolarizer['name'];
					const symbol = this.fmt.symbolForConstant(name);
					const p = polarizerPrecedence[name];
					const bracket = rightPrecedence > p;
					const rp = bracket ? 0 : rightPrecedence;
					const body = this.render(e.argument, names, p, rp);
					const content = this.fmt.polarizer(symbol, body);
					return bracket ? this.fmt.bracket(content) : content;
				} else if (e.fn.head === 'constant' && e.fn.name in quantifiers) {
					const q = e.fn.name as KnownQuantifier['name'];
					if (e.argument.head === 'lambda') {
						return this.renderQuantifier(e.argument, q, names, rightPrecedence);
					} else {
						throw new Impossible('sdlfkjds');
					}
				} else {
					const p = 14;
					const bracket = leftPrecedence > p;
					const fn = this.render(e.fn, names, bracket ? 0 : leftPrecedence, p);
					const argument = this.render(e.argument, names, 0, 0);
					const content = this.fmt.apply(fn, argument);
					return bracket ? this.fmt.bracket(content) : content;
				}
			}
			case 'presuppose': {
				const p = 1;
				const bracket = leftPrecedence >= p || rightPrecedence > p;
				const body = this.render(
					e.body,
					names,
					bracket ? 0 : leftPrecedence,
					p,
				);
				const presupposition = this.render(
					e.presupposition,
					names,
					p,
					bracket ? 0 : rightPrecedence,
				);
				const content = this.fmt.presuppose(body, presupposition);
				return bracket ? this.fmt.bracket(content) : content;
			}
			case 'constant': {
				return this.fmt.symbolForConstant(e.name as KnownConstant['name']);
			}
			case 'quote': {
				return this.fmt.quote(e.text);
			}
		}
	}

	public renderFull(e: Expr) {
		const cachedResult = this.cache.get(e) as T;
		if (cachedResult !== undefined) return cachedResult;

		let names = noNames;
		// Create ad hoc constants for all free variables
		for (let i = e.context.length - 1; i >= 0; i--) {
			const type = e.context[i];
			// Free variables of type s should be rendered like variables rather than
			// constants to avoid conflict with the 'real world' symbol
			names = addName(e.context[i], names, type !== 's');
		}

		const result = this.render(e, names, 0, 0);
		this.cache.set(e, result);
		return result;
	}
}

const rendererCache = new Map<string, Renderer<any>>();

function renderFull<T>(e: Expr, fmt: Format<T>, compact?: boolean): T {
	const spec = fmt.formatName + (compact ? '-compact' : '');
	let renderer = rendererCache.get(spec) as Renderer<T> | undefined;
	if (renderer === undefined) {
		renderer = new Renderer<T>(fmt, compact ?? false);
		rendererCache.set(spec, renderer);
	}

	return renderer.renderFull(e);
}

export function toPlainText(e: Expr, compact?: boolean): string {
	return renderFull(e, plainText, compact);
}

export function toLatex(e: Expr, compact?: boolean): string {
	return renderFull(e, latex, compact);
}

export function toMathml(e: Expr, compact?: boolean): string {
	return (
		'<math display=block><mrow>' +
		renderFull(e, mathml, compact) +
		'</mrow></math>'
	);
}

export function toJson(e: Expr, compact?: boolean): JsonExpr {
	return renderFull(e, json, compact) as JsonExpr;
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
