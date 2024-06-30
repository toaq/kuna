import { type Format, fnFromMap, formatName } from './base';

export const latex: Format<string> = {
	formatName: 'latex',
	bracket: e => `\\left(${e}\\right)`,
	name: name => {
		const base = formatName(name);
		return name.constant ? `\\mathrm{${base}}` : base;
	},
	verb: (name, args, event, world) =>
		args.length === 0
			? `\\mathrm{${name}}_{${world}}(${event})`
			: `\\mathrm{${name}}_{${world}}(${args.join(', ')})(${event})`,
	symbolForQuantifier: fnFromMap({
		some: '\\exists',
		every: '\\forall',
		every_sing: '\\forall_{\\mathrm{\\large SING}}',
		every_cuml: '\\forall_{\\mathrm{\\large CUML}}',
		gen: '\\mathrm{\\large GEN}\\ ',
		lambda: '\\lambda',
	}),
	quantifier: (symbol, name, body) => `${symbol} ${name}.\\ ${body}`,
	restrictedQuantifier: (symbol, name, restriction, body) =>
		`${symbol} ${name} : ${restriction}.\\ ${body}`,
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
				? `\\left(${agent ? agent + '; ' : ''}${args.join(', ')}\\right)`
				: '';
		const bod = body ? '. ' + body : '';
		return `${symbol} \\mathop{\\text{${verbName}}}\\limits_{${aspect}}{}^{${event}}_{${world}}${argList}${bod}`;
	},
	apply: (fn, argument) => `${fn}(${argument})`,
	presuppose: (body, presuppositions) =>
		`${body}\\ |\\ ${presuppositions.join('\\ |\\ ')}`,
	let: (name, value, body) => `\\text{let }${name}=${value}\\text{ in }${body}`,
	symbolForInfix: fnFromMap({
		and: '\\land{}',
		or: '\\lor{}',
		implies: '\\rightarrow{}',
		equals: '=',
		subinterval: '\\subseteq{}',
		before: '<',
		after: '>',
		before_near: '<_{\\text{near}}',
		after_near: '>_{\\text{near}}',
		coevent: '\\operatorname{o}',
		roi: '&',
	}),
	infix: (symbol, left, right) => `${left} ${symbol} ${right}`,
	polarizer: (symbol, body) => `${symbol} ${body}`,
	symbolForConstant: fnFromMap({
		not: '\\neg',
		indeed: '\\dagger',
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
		le: '\\text{Le}',
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
		topic: '\\text{Topic}',
		assert: '\\mathrm{A\\large SSERT}',
		perform: '\\mathrm{P\\large ERFORM}',
		wish: '\\mathrm{W\\large ISH}',
		promise: '\\mathrm{P\\large ROMISE}',
		permit: '\\mathrm{P\\large ERMIT}',
		warn: '\\mathrm{W\\large ARN}',
	}),
	quote: text => `“${text}”`,
};
