import { Impossible } from '../../core/error';
import { type Format, fnFromMap, formatName } from './base';

function mathematicalItalic(name: string) {
	const letter = name[0];
	const primes = name.slice(1);
	if (letter === 'h') {
		return 'ℎ';
	} else if ('a' <= letter && letter <= 'z') {
		return String.fromCodePoint(0x1d44e - 97 + letter.codePointAt(0)!) + primes;
	} else if ('A' <= letter && letter <= 'Z') {
		return String.fromCodePoint(0x1d434 - 65 + letter.codePointAt(0)!) + primes;
	} else {
		throw new Impossible('invalid letter');
	}
}

export const mathml: Format<string> = {
	formatName: 'mathml',
	bracket: e => `<mo>(</mo>${e}<mo>)</mo>`,
	name: name => {
		const base = formatName(name).replaceAll("'", '′');
		return name.constant
			? `<mi class="kuna-const" mathvariant="normal">${base}</mi>`
			: `<mi class="kuna-var">${mathematicalItalic(base)}</mi>`;
	},
	verb: (name, args, event, world) =>
		args.length === 0
			? `<mrow><msub><mi class="kuna-verb">${name}</mi>${world}</msub><mo stretchy=false>(</mo>${event}<mo>)</mo></mrow>`
			: `<msub><mi class="kuna-verb">${name}</mi>${world}</msub><mo stretchy=false>(</mo>${args.join(
					'<mo>,</mo>',
				)}<mo stretchy=false>)</mo><mo stretchy=false>(</mo>${event}<mo stretchy=false>)</mo>`,
	symbolForQuantifier: fnFromMap({
		some: '<mo>∃</mo>',
		every: '<mo>∀</mo>',
		every_sing: '<msub><mo>∀</mo><mi>SING</mi></msub>',
		every_cuml: '<msub><mo>∀</mo><mi>CUML</mi></msub>',
		gen: '<mo>GEN</mo>',
		lambda: '<mo rspace=0>λ</mo>',
	}),
	quantifier: (symbol, name, body) =>
		`${symbol}${name}<mo lspace=0>.</mo>${body}`,
	restrictedQuantifier: (symbol, name, restriction, body) =>
		`${symbol} ${name} <mo lspace="1pt">:</mo> ${restriction}<mo lspace=0>.</mo> ${body}`,
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
				? `<mo stretchy=false>(</mo>${agent ? agent + '<mo>;</mo>' : ''}${args.join(
						'<mo>,</mo>',
					)}<mo stretchy=false>)</mo>`
				: '';
		const bod = body ? '<mo lspace=0>.</mo>' + body : '';
		return `${symbol} <munder><msubsup><mi class="kuna-verb">${verbName}</mi>${world}${event}</msubsup><mrow>${aspect}</mrow></munder>${argList}${bod}`;
	},
	apply: (fn, argument) =>
		`${fn}<mo stretchy=false>(</mo>${argument}<mo stretchy=false>)</mo>`,
	presuppose: (body, presuppositions) =>
		`<mrow>${body}</mrow><mo stretchy=true>|</mo><mrow><mtable columnalign=left>` +
		presuppositions.map(x => '<mtr><mtd>' + x + '</mtd></mtr>').join('') +
		`</mtable></mrow>`,
	let: (name, value, body) =>
		`<mrow><mi>let</mi><mspace width="1pt" /><mrow>${name}<mo>=</mo>` +
		value +
		`</mrow><mspace width="1pt" /><mi>in</mi><mspace width="1pt" /><mrow>${body}</mrow></mrow>`,
	symbolForInfix: fnFromMap({
		and: '<mo>∧</mo>',
		or: '<mo>∨</mo>',
		implies: '<mo>→</mo>',
		equals: '<mo>=</mo>',
		subinterval: '<mo>⊆</mo>',
		before: '<mo>&lt;</mo>',
		after: '<mo>&gt;</mo>',
		before_near: '<msub><mo>&lt;</mo><mi>near</mi></sub>',
		after_near: '<msub><mo>&gt;</mo><mi>near</mi></sub>',
		coevent: '<mo>o</mo>',
		roi: '<mo>&</mo>',
	}),
	infix: (symbol, left, right) => `${left} ${symbol} ${right}`,
	polarizer: (symbol, body) => `${symbol} ${body}`,
	symbolForConstant: fnFromMap({
		not: '<mo>¬</mo>',
		indeed: '<mo>†</mo>',
		ji: '<mi class="kuna-builtin">jí</mi>',
		suq: '<mi class="kuna-builtin">súq</mi>',
		nhao: '<mi class="kuna-builtin">nháo</mi>',
		suna: '<mi class="kuna-builtin">súna</mi>',
		nhana: '<mi class="kuna-builtin">nhána</mi>',
		umo: '<mi class="kuna-builtin">úmo</mi>',
		ime: '<mi class="kuna-builtin">íme</mi>',
		suo: '<mi class="kuna-builtin">súo</mi>',
		ama: '<mi class="kuna-builtin">áma</mi>',
		agent: '<mi class="kuna-builtin">AGENT</mi>',
		subject: '<mi class="kuna-builtin">SUBJ</mi>',
		she: '<mi class="kuna-builtin">SHE</mi>',
		le: '<mi class="kuna-builtin">LE</mi>',
		animate: '<mi class="kuna-builtin">animate</mi>',
		inanimate: '<mi class="kuna-builtin">inanimate</mi>',
		abstract: '<mi class="kuna-builtin">abstract</mi>',
		real_world: '<mi class="kuna-builtin">w</mi>',
		inertia_worlds: '<mi class="kuna-builtin">IW</mi>',
		alternative: '<mi class="kuna-builtin">A</mi>',
		temporal_trace: '<mi class="kuna-builtin">τ</mi>',
		expected_start: '<mi class="kuna-builtin">ExpStart</mi>',
		expected_end: '<mi class="kuna-builtin">ExpEnd</mi>',
		speech_time: '<mi class="kuna-builtin">t0</mi>',
		content: '<mi class="kuna-builtin">Cont</mi>',
		topic: '<mi class="kuna-builtin">Topic</mi>',
		assert: '<mi class="kuna-builtin">ASSERT</mi>',
		perform: '<mi class="kuna-builtin">PERFORM</mi>',
		wish: '<mi class="kuna-builtin">WISH</mi>',
		promise: '<mi class="kuna-builtin">PROMISE</mi>',
		permit: '<mi class="kuna-builtin">PERMIT</mi>',
		warn: '<mi class="kuna-builtin">WARN</mi>',
	}),
	quote: text => `<mtext class="kuna-quote">“${text}”</mtext>`,
};
