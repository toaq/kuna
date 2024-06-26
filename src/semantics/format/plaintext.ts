import { Impossible } from '../../core/error';
import { type Format, fnFromMap, formatName } from './base';

function mathematicalSansSerifItalic(name: string) {
	const letter = name[0];
	const primes = name.slice(1);
	if ('a' <= letter && letter <= 'z') {
		return String.fromCodePoint(120257 + letter.codePointAt(0)!) + primes;
	}
	if ('A' <= letter && letter <= 'Z') {
		return String.fromCodePoint(120263 + letter.codePointAt(0)!) + primes;
	}
	throw new Impossible('invalid letter');
}

export const plainText: Format<string> = {
	formatName: 'plaintext',
	bracket: e => `(${e})`,
	name: name => {
		const base = formatName(name);
		return name.constant ? base : mathematicalSansSerifItalic(base);
	},
	verb: (name, args, event, world) =>
		args.length === 0
			? `${name}.${world}(${event})`
			: `${name}.${world}(${args.join(', ')})(${event})`,
	symbolForQuantifier: fnFromMap({
		some: '∃',
		every: '∀',
		every_sing: '∀.SING ',
		every_cuml: '∀.CUML ',
		gen: 'GEN ',
		lambda: 'λ',
	}),
	quantifier: (symbol, name, body) => `${symbol}${name}. ${body}`,
	restrictedQuantifier: (symbol, name, restriction, body) =>
		`${symbol}${name} : ${restriction}. ${body}`,
	aspect: (infix, right) => infix + right,
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
				? `(${agent ? `${agent}; ` : ''}${args.join(', ')})`
				: '';
		const bod = body ? `. ${body}` : '';
		return `${symbol}${verbName}[${aspect},${event},${world}]${argList}${bod}`;
	},
	apply: (fn, argument) => `${fn}(${argument})`,
	presuppose: (body, presuppositions) =>
		`${body} | ${presuppositions.join(' | ')}`,
	let: (name, value, body) => `let ${name} = ${value} in ${body}`,
	symbolForInfix: fnFromMap({
		and: '∧',
		or: '∨',
		implies: '→',
		equals: '=',
		subinterval: '⊆',
		before: '<',
		after: '>',
		before_near: '<.near',
		after_near: '>.near',
		coevent: 'o',
		roi: '&',
	}),
	infix: (symbol, left, right) => `${left} ${symbol} ${right}`,
	polarizer: (symbol, body) => `${symbol}${body}`,
	symbolForConstant: fnFromMap({
		not: '¬',
		indeed: '†',
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
		le: 'LE',
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
		topic: 'Topic',
		assert: 'ASSERT',
		perform: 'PERFORM',
		wish: 'WISH',
		promise: 'PROMISE',
		permit: 'PERMIT',
		warn: 'WARN',
	}),
	quote: text => `“${text}”`,
};
