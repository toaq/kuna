import { Format, fnFromMap, formatName } from './base';

export const mathml: Format<string> = {
	bracket: e => `<mo>(</mo>${e}<mo>)</mo>`,
	name: name => {
		const base = formatName(name);
		return name.constant
			? `<mi mathvariant="normal">${base}</mi>`
			: `<mi>${base}</mi>`;
	},
	verb: (name, args, event, world) =>
		args.length === 0
			? `<mrow><msub><mi>${name}</mi>${world}</msub><mo stretchy=false>(</mo>${event}<mo>)</mo></mrow>`
			: `<msub><mi>${name}</mi>${world}</msub><mo stretchy=false>(</mo>${args.join(
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
		return `${symbol} <munder><msubsup><mi>${verbName}</mi>${world}${event}</msubsup><mrow>${aspect}</mrow></munder>${argList}${bod}`;
	},
	apply: (fn, argument) =>
		`${fn}<mo stretchy=false>(</mo>${argument}<mo stretchy=false>)</mo>`,
	presuppose: (body, presupposition) =>
		`<mfrac><mrow>${body}</mrow><mrow>${presupposition}</mrow></mfrac>`,
	symbolForInfix: fnFromMap({
		and: '<mo>∧</mo>',
		or: '<mo>∨</mo>',
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
	symbolForPolarizer: fnFromMap({
		not: '<mo>¬</mo>',
		indeed: '<mo>†</mo>',
	}),
	polarizer: (symbol, body) => `${symbol} ${body}`,
	symbolForConstant: fnFromMap({
		ji: '<mi>jí</mi>',
		suq: '<mi>súq</mi>',
		nhao: '<mi>nháo</mi>',
		suna: '<mi>súna</mi>',
		nhana: '<mi>nhána</mi>',
		umo: '<mi>úmo</mi>',
		ime: '<mi>íme</mi>',
		suo: '<mi>súo</mi>',
		ama: '<mi>áma</mi>',
		agent: '<mi>AGENT</mi>',
		subject: '<mi>SUBJ</mi>',
		she: '<mi>SHE</mi>',
		animate: '<mi>animate</mi>',
		inanimate: '<mi>inanimate</mi>',
		abstract: '<mi>abstract</mi>',
		real_world: '<mi>w</mi>',
		inertia_worlds: '<mi>IW</mi>',
		alternative: '<mi>A</mi>',
		temporal_trace: '<mi>τ</mi>',
		expected_start: '<mi>ExpStart</mi>',
		expected_end: '<mi>ExpEnd</mi>',
		speech_time: '<mi>t0</mi>',
		content: '<mi>Cont</mi>',
		assert: '<mi>ASSERT</mi>',
		perform: '<mi>PERFORM</mi>',
		wish: '<mi>WISH</mi>',
		promise: '<mi>PROMISE</mi>',
		permit: '<mi>PERMIT</mi>',
		warn: '<mi>WARN</mi>',
	}),
	quote: text => `<mtext>“${text}”</mtext>`,
};
