import { Impossible } from '../error';
import { CompactExpr } from './compact';
import { Expr, ExprType } from './model';

type NameType = 'e' | 'v' | 'i' | 's' | 'fn';

/**
 * Represents the 'id'th name available for variables/constants of type 'type'.
 */
interface Name {
	readonly id: number;
	readonly type: NameType;
	readonly constant: boolean;
}

/**
 * A naming context to use when rendering an expression.
 */
interface Names {
	readonly context: Name[];
	readonly nextVariableIds: Record<NameType, number>;
	readonly nextConstantIds: Record<NameType, number>;
}

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

function mathematicalSansSerifItalic(name: string) {
	const letter = name[0];
	const primes = name.slice(1);
	if ('a' <= letter && letter <= 'z') {
		return String.fromCodePoint(120257 + letter.codePointAt(0)!) + primes;
	} else if ('A' <= letter && letter <= 'Z') {
		return String.fromCodePoint(120263 + letter.codePointAt(0)!) + primes;
	} else {
		throw new Impossible('invalid letter');
	}
}

type Alphabets = Record<NameType, string[]>;

const constantAlphabets: Alphabets = {
	e: ['a', 'b', 'c', 'd'],
	v: ['e'],
	i: ['t'],
	s: ['w'],
	fn: ['F', 'G', 'H'],
};

const variableAlphabets: Alphabets = {
	e: ['x', 'y', 'z'],
	v: ['e'],
	i: ['t'],
	s: ['w'],
	fn: ['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
};

const infixPrecedence: Record<(Expr & { head: 'infix' })['name'], number> = {
	and: 4,
	or: 3,
	equals: 5,
	subinterval: 10,
	before: 9,
	after: 8,
	before_near: 7,
	after_near: 6,
	roi: 12,
	coevent: 11,
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
		roi: true,
		coevent: false,
	};

/**
 * Specification of a rendering format, such as plain text or LaTeX.
 */
interface Format {
	bracket: (e: string) => string;
	name: (name: Name) => string;
	verb: (name: string, args: string[], event: string, world: string) => string;
	quantifierSymbols: Record<
		(Expr & { head: 'quantifier' })['name'] | 'lambda',
		string
	>;
	quantifier: (symbol: string, name: string, body: string) => string;
	restrictedQuantifier: (
		symbol: string,
		name: string,
		restriction: string,
		body: string,
	) => string;
	eventCompound: (
		symbol: string,
		verbName: string,
		event: string,
		world: string,
		aspect: string,
		agent: string | undefined,
		args: string[],
		body: string | undefined,
	) => string;
	apply: (fn: string, argument: string) => string;
	presuppose: (body: string, presupposition: string) => string;
	infixSymbols: Record<(Expr & { head: 'infix' })['name'], string>;
	infix: (symbol: string, left: string, right: string) => string;
	polarizerSymbols: Record<(Expr & { head: 'polarizer' })['name'], string>;
	polarizer: (symbol: string, body: string) => string;
	constantSymbols: Record<(Expr & { head: 'constant' })['name'], string>;
	quote: (text: string) => string;
}

const formatName = (name: Name) => {
	const alphabets = name.constant ? constantAlphabets : variableAlphabets;
	const alphabet = alphabets[name.type];
	return (
		alphabet[name.id % alphabet.length] + "'".repeat(name.id / alphabet.length)
	);
};

const plainText: Format = {
	bracket: e => `(${e})`,
	name: name => {
		const base = formatName(name);
		return name.constant ? base : mathematicalSansSerifItalic(base);
	},
	verb: (name, args, event, world) =>
		args.length === 0
			? `${name}.${world}(${event})`
			: `${name}.${world}(${args.join(', ')})(${event})`,
	quantifierSymbols: {
		some: '∃',
		every: '∀',
		every_sing: '∀.SING ',
		every_cuml: '∀.CUML ',
		gen: 'GEN ',
		lambda: 'λ',
	},
	quantifier: (symbol, name, body) => `${symbol}${name}. ${body}`,
	restrictedQuantifier: (symbol, name, restriction, body) =>
		`${symbol}${name} : ${restriction}. ${body}`,
	eventCompound: (
		symbol,
		verbName,
		event,
		world,
		aspect,
		agent,
		args,
		body,
	) => {
		const argList =
			args.length > 0 || agent !== undefined
				? `(${agent ? agent + '; ' : ''}${args.join(', ')})`
				: '';
		const bod = body ? '. ' + body : '';
		return `${symbol}${verbName}[${aspect},${event},${world}]${argList}${bod}`;
	},
	apply: (fn, argument) => `${fn}(${argument})`,
	presuppose: (body, presupposition) => `${body} | ${presupposition}`,
	infixSymbols: {
		and: '∧',
		or: '∨',
		equals: '=',
		subinterval: '⊆',
		before: '<',
		after: '>',
		before_near: '<.near',
		after_near: '>.near',
		roi: '&',
		coevent: 'o',
	},
	infix: (symbol, left, right) => `${left} ${symbol} ${right}`,
	polarizerSymbols: {
		not: '¬',
		indeed: '†',
	},
	polarizer: (symbol, body) => `${symbol}${body}`,
	constantSymbols: {
		ji: 'jí',
		suq: 'súq',
		nhao: 'nháo',
		suna: 'súna',
		nhana: 'nhána',
		umo: 'úmo',
		ime: 'íme',
		suo: 'súo',
		ama: 'áma',
		agent: 'AGENT',
		subject: 'SUBJ',
		she: 'SHE',
		animate: 'animate',
		inanimate: 'inanimate',
		abstract: 'abstract',
		real_world: 'w',
		inertia_worlds: 'IW',
		alternative: 'A',
		temporal_trace: 'τ',
		expected_start: 'ExpStart',
		expected_end: 'ExpEnd',
		speech_time: 't0',
		content: 'Cont',
		assert: 'ASSERT',
		perform: 'PERFORM',
		wish: 'WISH',
		promise: 'PROMISE',
		permit: 'PERMIT',
		warn: 'WARN',
	},
	quote: text => `“${text}”`,
};

const latex: Format = {
	bracket: e => `\\left(${e}\\right)`,
	name: name => {
		const base = formatName(name);
		return name.constant ? `\\mathrm{${base}}` : base;
	},
	verb: (name, args, event, world) =>
		args.length === 0
			? `\\mathrm{${name}}_{${world}}(${event})`
			: `\\mathrm{${name}}_{${world}}(${args.join(', ')})(${event})`,
	quantifierSymbols: {
		some: '\\exists',
		every: '\\forall',
		every_sing: '\\forall_{\\mathrm{\\large SING}}',
		every_cuml: '\\forall_{\\mathrm{\\large CUML}}',
		gen: '\\mathrm{\\large GEN}\\ ',
		lambda: '\\lambda',
	},
	quantifier: (symbol, name, body) => `${symbol} ${name}.\\ ${body}`,
	restrictedQuantifier: (symbol, name, restriction, body) =>
		`${symbol} ${name} : ${restriction}.\\ ${body}`,
	eventCompound: (
		symbol,
		verbName,
		event,
		world,
		aspect,
		agent,
		args,
		body,
	) => {
		const argList =
			args.length > 0 || agent !== undefined
				? `\\left(${agent ? agent + '; ' : ''}${args.join(', ')}\\right)`
				: '';
		const bod = body ? '. ' + body : '';
		return `${symbol} \\mathop{\\text{${verbName}}}\\limits_{${aspect}}{}^{${event}}_{${world}}${argList}${bod}`;
	},
	apply: (fn, argument) => `${fn}(${argument})`,
	presuppose: (body, presupposition) => `${body}\\ |\\ ${presupposition}`,
	infixSymbols: {
		and: '\\land{}',
		or: '\\lor{}',
		equals: '=',
		subinterval: '\\subseteq{}',
		before: '<',
		after: '>',
		before_near: '<_{\\text{near}}',
		after_near: '>_{\\text{near}}',
		roi: '&',
		coevent: '\\operatorname{o}',
	},
	infix: (symbol, left, right) => `${left} ${symbol} ${right}`,
	polarizerSymbols: {
		not: '\\neg',
		indeed: '\\dagger',
	},
	polarizer: (symbol, body) => `${symbol} ${body}`,
	constantSymbols: {
		ji: '\\text{jí}',
		suq: '\\text{súq}',
		nhao: '\\text{nháo}',
		suna: '\\text{súna}',
		nhana: '\\text{nhána}',
		umo: '\\text{úmo}',
		ime: '\\text{íme}',
		suo: '\\text{súo}',
		ama: '\\text{áma}',
		agent: '\\mathrm{A\\large GENT}',
		subject: '\\mathrm{S\\large UBJ}',
		she: '\\text{She}',
		animate: '\\text{animate}',
		inanimate: '\\text{inanimate}',
		abstract: '\\text{abstract}',
		real_world: '\\mathrm{w}',
		inertia_worlds: '\\mathrm{I\\large W}',
		alternative: '\\mathrm{A}',
		temporal_trace: '\\tau',
		expected_start: '\\text{ExpStart}',
		expected_end: '\\text{ExpEnd}',
		speech_time: '\\mathrm{t_0}',
		content: '\\text{Cont}',
		assert: '\\mathrm{A\\large SSERT}',
		perform: '\\mathrm{P\\large ERFORM}',
		wish: '\\mathrm{W\\large ISH}',
		promise: '\\mathrm{P\\large ROMISE}',
		permit: '\\mathrm{P\\large ERMIT}',
		warn: '\\mathrm{W\\large ARN}',
	},
	quote: text => `“${text}”`,
};

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

function getName(index: number, names: Names, fmt: Format): string {
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
function render(
	e: CompactExpr,
	names: Names,
	fmt: Format,
	leftPrecedence: number,
	rightPrecedence: number,
): string {
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
			const symbol = fmt.quantifierSymbols.lambda;
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

			let content: string;
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
			const symbol = fmt.infixSymbols[e.name];
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
			const symbol = fmt.polarizerSymbols[e.name];
			const p = 12;
			const bracket = rightPrecedence > p;
			const body = render(e.body, names, fmt, p, bracket ? 0 : rightPrecedence);
			const content = fmt.polarizer(symbol, body);
			return bracket ? fmt.bracket(content) : content;
		}
		case 'quantifier': {
			const symbol = fmt.quantifierSymbols[e.name];
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

			let content: string;
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
			return fmt.constantSymbols[e.name];
		}
		case 'quote': {
			return fmt.quote(e.text);
		}
		case 'event_compound': {
			const symbol = fmt.quantifierSymbols['some'];
			const p = 2;
			const bracket = rightPrecedence > p;
			let body: string | undefined;
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
			const aspect =
				fmt.infixSymbols[e.aspect.name] +
				render(e.aspect.right, innerNames, fmt, 0, 0);
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

const renderCache = new Map<Format, WeakMap<CompactExpr, string>>();

function renderFull(e: CompactExpr, fmt: Format): string {
	let cache = renderCache.get(fmt);
	if (cache === undefined) {
		cache = new WeakMap();
		renderCache.set(fmt, cache);
	}
	const cachedResult = cache.get(e);
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
