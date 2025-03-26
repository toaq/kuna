import { Impossible } from '../core/error';
import {
	Act,
	Cont,
	Dx,
	Fn,
	Int,
	Pl,
	Qn,
	Ref,
	agent,
	and,
	app,
	bind,
	closed,
	cont,
	equals,
	every,
	gen,
	implies,
	int,
	lex,
	not,
	or,
	qn,
	ref,
	some,
	unint,
	unref,
	λ,
} from './model';
import { typeToPlainText } from './render';
import { getFunctor } from './structures';
import type { AnimacyClass, Expr, ExprType } from './types';

export const covertV = lex('raı', Int(Fn('e', Fn('v', 't'))), closed);

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

export const covertResumptive = ref(
	{ type: 'covert resumptive' },
	λ(Int(Pl('e')), closed, (x, s) => s.var(x)),
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

const anaphoricPronouns: [string, AnimacyClass][] = [
	['hó', 'animate'],
	['máq', 'inanimate'],
	['hóq', 'abstract'],
	['tá', 'descriptive'],
];

export const pronouns = new Map<string, Expr>([
	...personalPronouns.map(
		toaq => [toaq, lex(toaq, Dx(Int(Pl('e'))), closed)] as const,
	),
	...anaphoricPronouns.map(
		([toaq, animacy]) =>
			[
				toaq,
				ref(
					{ type: 'animacy', class: animacy },
					λ(Int(Pl('e')), closed, (x, s) =>
						bind({ type: 'animacy', class: animacy }, s.var(x), s.var(x)),
					),
				),
			] as const,
	),
	[
		'hóa',
		ref(
			{ type: 'resumptive' },
			λ(Int(Pl('e')), closed, (x, s) => s.var(x)),
		),
	],
]);

export const pronominalTenses = new Set(['tuom', 'naı', 'jıa', 'pu']);

export const polarities = new Map<string, Expr>([
	['jeo', λ('t', closed, (t, s) => s.var(t))],
	['bu', not(closed)],
]);

export const determiners = new Map<string, (domain: ExprType) => Expr>([
	[
		'sá',
		domain =>
			λ(Fn(domain, 't'), closed, (predicate, s) =>
				cont(
					λ(Fn(domain, 't'), s, (c, s) =>
						some(
							λ(domain, s, (x, s) =>
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
		domain =>
			λ(Fn(domain, 't'), closed, (predicate, s) =>
				cont(
					λ(Fn(domain, 't'), s, (c, s) =>
						every(
							λ(domain, s, (x, s) =>
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
	['sía', domain => lex('sía', Fn(Fn(domain, 't'), Cont(domain)), closed)],
	[
		'báq',
		domain =>
			λ(Fn(domain, 't'), closed, (predicate, s) =>
				gen(
					s.var(predicate),
					λ(domain, s, (x, s) => s.var(x)),
				),
			),
	],
	[
		'hí',
		domain =>
			λ(Fn(domain, 't'), closed, (predicate, s) =>
				qn(
					s.var(predicate),
					λ(domain, s, (x, s) => s.var(x)),
				),
			),
	],
	['ké', domain => lex('ké', Fn(Fn(domain, 't'), Dx(domain)), closed)],
	['hú', domain => lex('hú', Fn(Fn(domain, 't'), Dx(domain)), closed)],
	['ní', domain => lex('ní', Fn(Fn(domain, 't'), Dx(domain)), closed)],
	['nánı', domain => lex('nánı', Fn(Fn(domain, 't'), Dx(domain)), closed)],
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

export const complementizers = new Map<string, Expr>([
	['ꝡa', lex('ꝡa', Fn(Int('t'), Int('t')), closed)],
	[
		'ma',
		λ(Int('t'), closed, (p, s) =>
			int(
				λ('s', s, (w, s) =>
					qn(
						λ(Fn('t', 't'), s, (polarity, s) =>
							app(
								app(
									or(s),
									equals(
										s.var(polarity),
										λ('t', s, (t, s) => s.var(t)),
									),
								),
								equals(s.var(polarity), not(s)),
							),
						),
						λ(Fn('t', 't'), s, (polarity, s) =>
							app(s.var(polarity), app(unint(s.var(p)), s.var(w))),
						),
					),
				),
			),
		),
	],
	['ꝡä', lex('ꝡä', Fn(Int('t'), Int(Fn(Int(Pl('e')), 't'))), closed)],
	['mä', lex('mä', Fn(Int('t'), Int(Fn(Int(Pl('e')), 't'))), closed)],
	[
		'ꝡë',
		λ(Ref({ type: 'resumptive' }, Int('t')), closed, (p, s) =>
			int(
				λ('s', s, (w, s) =>
					λ(Int(Pl('e')), s, (x, s) =>
						app(unint(app(unref(s.var(p)), s.var(x))), s.var(w)),
					),
				),
			),
		),
	],
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
