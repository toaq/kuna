import {
	Act,
	Cont,
	Dx,
	type ExprType,
	Fn,
	Int,
	Pl,
	Qn,
	Ref,
	agent,
	and,
	app,
	closed,
	equals,
	int,
	lex,
	ref,
	unref,
	λ,
} from './model';

export const covertV = lex('raı', Fn('e', Fn('v', Fn('s', 't'))), closed);

export const causeLittleV = int(
	λ('s', closed, (w, s) =>
		λ(Fn('v', 't'), s, (pred, s) =>
			λ('e', s, (arg, s) =>
				λ('v', s, (e, s) =>
					app(
						app(
							and(s),
							equals(app(app(agent(s), s.var(e)), s.var(w)), s.var(arg)),
						),
						app(s.var(pred), s.var(e)),
					),
				),
			),
		),
	),
);

const personalPronouns = [
	'jí',
	'súq',
	'nháo',
	'súna',
	'nhána',
	'súho',
	'úmo',
	'íme',
	'áma',
];

export const covertResumptive = ref(
	{ type: 'covert resumptive' },
	λ(Int(Pl('e')), closed, (x, s) => s.var(x)),
);

export const pronouns = new Map<string, ExprType>([
	...personalPronouns.map(toaq => [toaq, Dx(Int(Pl('e')))] as const),
]);

export const pronominalTenses = new Set(['tuom', 'naı', 'jıa', 'pu']);

export const covertSigma = λ('t', closed, (t, s) => s.var(t));

export const determiners = new Map<
	string,
	(wrap: (inner: ExprType) => ExprType) => ExprType
>([
	['sá', wrap => Fn(Fn(Int(Pl('e')), 't'), Cont(wrap(Int(Pl('e')))))],
	['tú', wrap => Fn(Fn(Int(Pl('e')), 't'), Cont(wrap(Int(Pl('e')))))],
	['sía', wrap => Fn(Fn(Int(Pl('e')), 't'), Cont(wrap(Int(Pl('e')))))],
	['hí', wrap => Fn(Fn(Int(Pl('e')), 't'), Qn(wrap(Int(Pl('e')))))],
	['ké', wrap => Fn(Fn(Int(Pl('e')), 't'), Dx(wrap(Int(Pl('e')))))],
	['hú', wrap => Fn(Fn(Int(Pl('e')), 't'), Dx(wrap(Int(Pl('e')))))],
	['ní', wrap => Fn(Fn(Int(Pl('e')), 't'), Dx(wrap(Int(Pl('e')))))],
	['nánı', wrap => Fn(Fn(Int(Pl('e')), 't'), Dx(wrap(Int(Pl('e')))))],
]);

export const covertCrel = λ(
	Ref({ type: 'covert resumptive' }, 't'),
	closed,
	(predicate, s) =>
		λ(Int(Pl('e')), s, (arg, s) => app(unref(s.var(predicate)), s.var(arg))),
);

export const complementizers = new Map<string, ExprType>([
	['ꝡa', Fn(Int('t'), Int('t'))],
	['ma', Fn(Int('t'), Qn(Int('t')))],
	['ꝡä', Fn(Int('t'), Int(Fn(Int(Pl('e')), 't')))],
	['mä', Fn(Int('t'), Int(Fn(Int(Pl('e')), 't')))],
]);

export const speechActParticles = new Map<string, ExprType>([
	['da', Fn(Int('t'), Act('1'))],
	['dâ', Fn(Int('t'), Act('1'))],
	['ka', Fn(Int('t'), Act('1'))],
	['móq', Fn(Qn(Int('t')), Act('1'))],
	['môq', Fn(Qn(Int('t')), Act('1'))],
	['ba', Fn(Int('t'), Act('1'))],
	['nha', Fn(Int('t'), Act('1'))],
	['doa', Fn(Int('t'), Act('1'))],
	['ꝡo', Fn(Int('t'), Act('1'))],
]);
