import { Impossible } from '../core/error';
import {
	Act,
	Cont,
	Dx,
	type Expr,
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
	cont,
	equals,
	every,
	gen,
	implies,
	int,
	lex,
	qn,
	ref,
	some,
	unref,
	λ,
} from './model';
import { typeToPlainText } from './render';
import { getFunctor } from './structures';

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

export const determiners = new Map<string, Expr>([
	[
		'sá',
		λ(Fn(Int(Pl('e')), 't'), closed, (predicate, s) =>
			cont(
				λ(Fn(Int(Pl('e')), 't'), s, (c, s) =>
					some(
						λ(Int(Pl('e')), s, (x, s) =>
							app(
								app(and(s), app(s.var(predicate), s.var(x))),
								app(s.var(c), s.var(x)),
							),
						),
					),
				),
			),
		),
	],
	[
		'tú',
		λ(Fn(Int(Pl('e')), 't'), closed, (predicate, s) =>
			cont(
				λ(Fn(Int(Pl('e')), 't'), s, (c, s) =>
					every(
						λ(Int(Pl('e')), s, (x, s) =>
							app(
								app(implies(s), app(s.var(predicate), s.var(x))),
								app(s.var(c), s.var(x)),
							),
						),
					),
				),
			),
		),
	],
	['sía', lex('sía', Fn(Fn(Int(Pl('e')), 't'), Cont(Int(Pl('e')))), closed)],
	[
		'báq',
		λ(Fn(Int(Pl('e')), 't'), closed, (predicate, s) =>
			gen(
				s.var(predicate),
				λ(Int(Pl('e')), s, (x, s) => s.var(x)),
			),
		),
	],
	[
		'hí',
		λ(Fn(Int(Pl('e')), 't'), closed, (predicate, s) =>
			qn(
				s.var(predicate),
				λ(Int(Pl('e')), s, (x, s) => s.var(x)),
			),
		),
	],
	['ké', lex('ké', Fn(Fn(Int(Pl('e')), 't'), Dx(Int(Pl('e')))), closed)],
	['hú', lex('hú', Fn(Fn(Int(Pl('e')), 't'), Dx(Int(Pl('e')))), closed)],
	['ní', lex('ní', Fn(Fn(Int(Pl('e')), 't'), Dx(Int(Pl('e')))), closed)],
	['nánı', lex('nánı', Fn(Fn(Int(Pl('e')), 't'), Dx(Int(Pl('e')))), closed)],
]);

export const littleN = λ(Fn(Int(Pl('e')), 't'), closed, (predicate, s) =>
	gen(
		s.var(predicate),
		λ(Int(Pl('e')), s, (x, s) => s.var(x)),
	),
);

export const covertCrel = λ(
	Ref({ type: 'covert resumptive' }, 't'),
	closed,
	(predicate, s) =>
		λ(Int(Pl('e')), s, (arg, s) => app(unref(s.var(predicate)), s.var(arg))),
);

export const complementizers = new Map<string, ExprType>([
	['ꝡa', Fn(Int('t'), Int('t'))],
	['ma', Fn(Int('t'), Qn(Fn('t', 't'), Int('t')))],
	['ꝡä', Fn(Int('t'), Int(Fn(Int(Pl('e')), 't')))],
	['mä', Fn(Int('t'), Int(Fn(Int(Pl('e')), 't')))],
]);

export const declarativeComplementizer = λ(Int('t'), closed, (t, s) =>
	s.var(t),
);

function qnDomain(type: ExprType): ExprType {
	if (typeof type !== 'string' && type.head === 'qn') return type.domain;
	const functor = getFunctor(type);
	if (functor === null)
		throw new Impossible(`${typeToPlainText(type)} is not a question type`);
	return qnDomain(functor.unwrap(type));
}

export const speechActParticles = new Map<
	string,
	(complement: ExprType) => ExprType
>([
	['da', () => Fn(Int('t'), Act('()'))],
	['dâ', () => Fn(Int('t'), Act('()'))],
	['ka', () => Fn(Int('t'), Act('()'))],
	[
		'móq',
		(complement: ExprType) => Fn(Int(Qn(qnDomain(complement), 't')), Act('()')),
	],
	[
		'môq',
		(complement: ExprType) => Fn(Int(Qn(qnDomain(complement), 't')), Act('()')),
	],
	['ba', () => Fn(Int('t'), Act('()'))],
	['nha', () => Fn(Int('t'), Act('()'))],
	['doa', () => Fn(Int('t'), Act('()'))],
	['ꝡo', () => Fn(Int('t'), Act('()'))],
]);
