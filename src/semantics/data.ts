import { Impossible } from '../core/error';
import type { CovertValue } from '../tree/types';
import {
	Act,
	Dx,
	Fn,
	Gen,
	Int,
	Nf,
	Pl,
	Qn,
	Ref,
	accessibility,
	agent,
	among,
	and,
	andMap,
	animate,
	app,
	bg,
	bind,
	closed,
	cont,
	equals,
	every,
	gen,
	implies,
	int,
	lex,
	nf,
	not,
	or,
	qn,
	ref,
	salient,
	some,
	ungen,
	unint,
	unnf,
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

export const covertResumptive = nf(λ(Int(Pl('e')), closed, (x, s) => s.var(x)));

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
	[
		'há',
		andMap(
			salient(Int(Fn(Pl('e'), 't')), closed),
			λ(Int(Fn(Pl('e'), 't')), closed, (r, s) =>
				int(
					λ('s', s, (w, s) =>
						gen(
							λ(Int(Pl('e')), s, (xx, s) =>
								app(
									app(
										and(s),
										app(
											app(unint(s.var(r)), s.var(w)),
											app(unint(s.var(xx)), s.var(w)),
										),
									),
									every(
										λ('e', s, (x, s) =>
											app(
												app(
													implies(s),
													among(s.var(x), app(unint(s.var(xx)), s.var(w))),
												),
												app(app(unint(animate(s)), s.var(w)), s.var(x)),
											),
										),
									),
								),
							),
							λ(Int(Pl('e')), s, (xx, s) =>
								bind(
									{ type: 'animacy', class: 'animate' },
									s.var(xx),
									s.var(xx),
								),
							),
						),
					),
				),
			),
		),
	],
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
	[
		'já',
		ref(
			{ type: 'gap' },
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
	[
		'sía',
		domain =>
			λ(Fn(domain, 't'), closed, (predicate, s) =>
				cont(
					λ(Fn(domain, 't'), s, (c, s) =>
						app(
							not(s),
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
			),
	],
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

export const covertCrel = λ(Nf(Int(Pl('e')), 't'), closed, (predicate, s) =>
	λ(Int(Pl('e')), s, (arg, s) => app(unnf(s.var(predicate)), s.var(arg))),
);

export const complementizers = new Map<string, Expr>([
	['ꝡa', λ(Int('t'), closed, (t, s) => s.var(t))],
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
	['ꝡä', lex('ꝡä', Int(Fn(Int('t'), Fn(Int(Pl('e')), 't'))), closed)],
	['mä', lex('mä', Int(Fn(Int('t'), Fn(Int(Pl('e')), 't'))), closed)],
	[
		'lä',
		int(
			λ('s', closed, (w, s) =>
				λ(Ref({ type: 'gap' }, Int('t')), s, (p, s) =>
					app(
						app(
							unint(
								lex(
									'lä',
									Int(Fn(Fn(Int(Pl('e')), Int('t')), Fn(Int(Pl('e')), 't'))),
									s,
								),
							),
							s.var(w),
						),
						unref(s.var(p)),
					),
				),
			),
		),
	],
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

export const covertCp = salient(Int('t'), closed);

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

export const conditionals = new Map<CovertValue, Expr>([
	[
		'IF',
		λ(Int('t'), closed, (antecedent, s) =>
			λ(Int('t'), s, (consequent, s) =>
				andMap(
					accessibility(s),
					λ(Fn('s', Fn('s', 't')), s, (accessible, s) =>
						int(
							λ('s', s, (w, s) =>
								gen(
									λ('s', s, (w_, s) =>
										app(
											app(
												and(s),
												app(app(s.var(accessible), s.var(w)), s.var(w_)),
											),
											app(unint(s.var(antecedent)), s.var(w_)),
										),
									),
									λ('s', s, (w_, s) =>
										app(unint(s.var(consequent)), s.var(w_)),
									),
								),
							),
						),
					),
				),
			),
		),
	],
	[
		'IF.CNTF',
		λ(Int('t'), closed, (antecedent, s) =>
			λ(Int('t'), s, (consequent, s) =>
				andMap(
					accessibility(s),
					λ(Fn('s', Fn('s', 't')), s, (accessible, s) =>
						andMap(
							app(
								bg(s),
								app(
									lex('da', Fn(Int('t'), Act('()')), s),
									int(
										λ('s', s, (w, s) =>
											app(not(s), app(unint(s.var(antecedent)), s.var(w))),
										),
									),
								),
							),
							λ('()', s, (_, s) =>
								int(
									λ('s', s, (w, s) =>
										gen(
											λ('s', s, (w_, s) =>
												app(
													app(
														and(s),
														app(app(s.var(accessible), s.var(w)), s.var(w_)),
													),
													app(unint(s.var(antecedent)), s.var(w_)),
												),
											),
											λ('s', s, (w_, s) =>
												app(unint(s.var(consequent)), s.var(w_)),
											),
										),
									),
								),
							),
						),
					),
				),
			),
		),
	],
	[
		'WHEN',
		λ('t', closed, (antecedent, s) =>
			λ('t', s, (consequent, s) =>
				gen(
					λ('()', s, (_, s) => s.var(antecedent)),
					λ('()', s, (_, s) => s.var(consequent)),
				),
			),
		),
	],
]);

const always = (domain: ExprType) =>
	λ(Gen(domain, 't'), closed, (p, s) =>
		ungen(
			s.var(p),
			λ(Fn(domain, 't'), s, (r, s) =>
				λ(Fn(domain, 't'), s, (b, s) =>
					every(
						λ(domain, s, (x, s) =>
							app(
								app(implies(s), app(s.var(r), s.var(x))),
								app(s.var(b), s.var(x)),
							),
						),
					),
				),
			),
		),
	);

const sometimes = (domain: ExprType) =>
	λ(Gen(domain, 't'), closed, (p, s) =>
		ungen(
			s.var(p),
			λ(Fn(domain, 't'), s, (r, s) =>
				λ(Fn(domain, 't'), s, (b, s) =>
					some(
						λ(domain, s, (x, s) =>
							app(
								app(and(s), app(s.var(r), s.var(x))),
								app(s.var(b), s.var(x)),
							),
						),
					),
				),
			),
		),
	);

const never = (domain: ExprType) =>
	λ(Gen(domain, 't'), closed, (p, s) =>
		ungen(
			s.var(p),
			λ(Fn(domain, 't'), s, (r, s) =>
				λ(Fn(domain, 't'), s, (b, s) =>
					app(
						not(s),
						some(
							λ(domain, s, (x, s) =>
								app(
									app(and(s), app(s.var(r), s.var(x))),
									app(s.var(b), s.var(x)),
								),
							),
						),
					),
				),
			),
		),
	);

export const quantifiers = new Map<string, (domain: ExprType) => Expr>([
	['she', always],
	['daı', sometimes],
	['ao', always],
	['ea', sometimes],
	['guotu', always],
	['guosa', sometimes],
	['guosıa', never],
	['koamchıo', never],
]);
