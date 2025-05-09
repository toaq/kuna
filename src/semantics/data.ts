import { Impossible, Ungrammatical } from '../core/error';
import type { SubjectType } from '../morphology/dictionary';
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
	among,
	and,
	andMap,
	animate,
	app,
	bg,
	bind,
	cont,
	equals,
	every,
	gen,
	implies,
	int,
	lex,
	map,
	nf,
	not,
	or,
	overlap,
	qn,
	ref,
	salient,
	some,
	ungen,
	unint,
	unnf,
	unref,
	v,
	λ,
} from './model';
import { typeToPlainText } from './render';
import { getFunctor } from './structures';
import type { AnimacyClass, Expr, ExprType } from './types';

export const covertV = lex('raı', Int(Fn('e', Fn('v', 't'))));

export const nullaryLittleV = λ(Fn('v', 't'), pred => v(pred));

export const distributiveLittleV = ref(
	{ type: 'reflexive' },
	λ(Int(Pl('e')), subject =>
		bind(
			{ type: 'reflexive' },
			v(subject),
			int(
				λ('s', w =>
					map(
						app(unint(v(subject)), v(w)),
						λ('e', subject_ =>
							λ(Fn('e', Fn('v', 't')), pred => app(v(pred), v(subject_))),
						),
					),
				),
			),
		),
	),
);

export const nondistributiveLittleV = ref(
	{ type: 'reflexive' },
	λ(Int(Pl('e')), subject =>
		bind(
			{ type: 'reflexive' },
			v(subject),
			int(
				λ('s', w =>
					λ(Fn(Pl('e'), Fn('v', 't')), pred =>
						app(v(pred), app(unint(v(subject)), v(w))),
					),
				),
			),
		),
	),
);

export const pro = nf(λ(Int(Pl('e')), x => v(x)));

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
	...personalPronouns.map(toaq => [toaq, lex(toaq, Dx(Int(Pl('e'))))] as const),
	[
		'há',
		andMap(
			salient(Int(Fn(Pl('e'), 't'))),
			λ(Int(Fn(Pl('e'), 't')), r =>
				int(
					λ('s', w =>
						gen(
							λ(Int(Pl('e')), xx =>
								app(
									app(
										and,
										app(app(unint(v(r)), v(w)), app(unint(v(xx)), v(w))),
									),
									every(
										λ('e', x =>
											app(
												app(implies, among(v(x), app(unint(v(xx)), v(w)))),
												app(app(unint(animate), v(w)), v(x)),
											),
										),
									),
								),
							),
							λ(Int(Pl('e')), xx =>
								bind({ type: 'animacy', class: 'animate' }, v(xx), v(xx)),
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
					λ(Int(Pl('e')), x =>
						bind({ type: 'animacy', class: animacy }, v(x), v(x)),
					),
				),
			] as const,
	),
	[
		'hóa',
		ref(
			{ type: 'resumptive' },
			λ(Int(Pl('e')), x => v(x)),
		),
	],
	[
		'já',
		ref(
			{ type: 'gap' },
			λ(Int(Pl('e')), x => v(x)),
		),
	],
	[
		'áq',
		ref(
			{ type: 'reflexive' },
			λ(Int(Pl('e')), x => bind({ type: 'reflexive' }, v(x), v(x))),
		),
	],
]);

export const pronominalTenses = new Set(['tuom', 'naı', 'jıa', 'pu']);

export const polarities = new Map<string, Expr>([
	['jeo', λ('t', t => v(t))],
	['bu', not],
]);

export const determiners = new Map<string, (domain: ExprType) => Expr>([
	[
		'sá',
		domain =>
			λ(Fn(domain, 't'), predicate =>
				cont(
					λ(Fn(domain, 't'), c =>
						some(
							λ(domain, x =>
								app(app(and, app(v(predicate), v(x))), app(v(c), v(x))),
							),
						),
					),
				),
			),
	],
	[
		'tú',
		domain =>
			λ(Fn(domain, 't'), predicate =>
				cont(
					λ(Fn(domain, 't'), c =>
						every(
							λ(domain, x =>
								app(app(implies, app(v(predicate), v(x))), app(v(c), v(x))),
							),
						),
					),
				),
			),
	],
	[
		'sía',
		domain =>
			λ(Fn(domain, 't'), predicate =>
				cont(
					λ(Fn(domain, 't'), c =>
						app(
							not,
							some(
								λ(domain, x =>
									app(app(and, app(v(predicate), v(x))), app(v(c), v(x))),
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
			λ(Fn(domain, 't'), predicate =>
				gen(
					v(predicate),
					λ(domain, x => v(x)),
				),
			),
	],
	[
		'hí',
		domain =>
			λ(Fn(domain, 't'), predicate =>
				qn(
					v(predicate),
					λ(domain, x => v(x)),
				),
			),
	],
	['ké', domain => lex('ké', Fn(Fn(domain, 't'), Dx(domain)))],
	['hú', domain => lex('hú', Fn(Fn(domain, 't'), Dx(domain)))],
	['ní', domain => lex('ní', Fn(Fn(domain, 't'), Dx(domain)))],
	['nánı', domain => lex('nánı', Fn(Fn(domain, 't'), Dx(domain)))],
]);

export const littleN = λ(Fn(Int(Pl('e')), 't'), predicate =>
	gen(
		v(predicate),
		λ(Int(Pl('e')), x => v(x)),
	),
);

export const covertCrel = λ(Nf(Int(Pl('e')), 't'), predicate =>
	λ(Int(Pl('e')), arg => app(unnf(v(predicate)), v(arg))),
);

export const complementizers = new Map<string, Expr>([
	['ꝡa', λ(Int('t'), t => v(t))],
	[
		'ma',
		λ(Int('t'), p =>
			int(
				λ('s', w =>
					qn(
						λ(Fn('t', 't'), polarity =>
							app(
								app(
									or,
									equals(
										v(polarity),
										λ('t', t => v(t)),
									),
								),
								equals(v(polarity), not),
							),
						),
						λ(Fn('t', 't'), polarity =>
							app(v(polarity), app(unint(v(p)), v(w))),
						),
					),
				),
			),
		),
	],
	['ꝡä', lex('ꝡä', Int(Fn(Int('t'), Fn(Int(Pl('e')), 't'))))],
	['mä', lex('mä', Int(Fn(Int('t'), Fn(Int(Pl('e')), 't'))))],
	[
		'lä',
		int(
			λ('s', w =>
				λ(Ref({ type: 'gap' }, Int('t')), p =>
					app(
						app(
							unint(
								lex(
									'lä',
									Int(Fn(Fn(Int(Pl('e')), Int('t')), Fn(Int(Pl('e')), 't'))),
								),
							),
							v(w),
						),
						unref(v(p)),
					),
				),
			),
		),
	],
	[
		'ꝡë',
		λ(Ref({ type: 'resumptive' }, Int('t')), p =>
			int(
				λ('s', w =>
					λ(Int(Pl('e')), x => app(unint(app(unref(v(p)), v(x))), v(w))),
				),
			),
		),
	],
]);

export const covertCp = salient(Int('t'));

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
		λ(Int('t'), antecedent =>
			λ(Int('t'), consequent =>
				andMap(
					accessibility,
					λ(Fn('s', Fn('s', 't')), accessible =>
						int(
							λ('s', w =>
								gen(
									λ('s', w_ =>
										app(
											app(and, app(app(v(accessible), v(w)), v(w_))),
											app(unint(v(antecedent)), v(w_)),
										),
									),
									λ('s', w_ => app(unint(v(consequent)), v(w_))),
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
		λ(Int('t'), antecedent =>
			λ(Int('t'), consequent =>
				andMap(
					accessibility,
					λ(Fn('s', Fn('s', 't')), accessible =>
						andMap(
							app(
								bg,
								app(
									lex('da', Fn(Int('t'), Act('()'))),
									int(λ('s', w => app(not, app(unint(v(antecedent)), v(w))))),
								),
							),
							λ('()', () =>
								int(
									λ('s', w =>
										gen(
											λ('s', w_ =>
												app(
													app(and, app(app(v(accessible), v(w)), v(w_))),
													app(unint(v(antecedent)), v(w_)),
												),
											),
											λ('s', w_ => app(unint(v(consequent)), v(w_))),
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
		λ('t', antecedent =>
			λ('t', consequent =>
				gen(
					λ('()', () => v(antecedent)),
					λ('()', () => v(consequent)),
				),
			),
		),
	],
]);

const always = (domain: ExprType) =>
	λ(Gen(domain, 't'), p =>
		ungen(
			v(p),
			λ(Fn(domain, 't'), r =>
				λ(Fn(domain, 't'), b =>
					every(
						λ(domain, x => app(app(implies, app(v(r), v(x))), app(v(b), v(x)))),
					),
				),
			),
		),
	);

const sometimes = (domain: ExprType) =>
	λ(Gen(domain, 't'), p =>
		ungen(
			v(p),
			λ(Fn(domain, 't'), r =>
				λ(Fn(domain, 't'), b =>
					some(λ(domain, x => app(app(and, app(v(r), v(x))), app(v(b), v(x))))),
				),
			),
		),
	);

const never = (domain: ExprType) =>
	λ(Gen(domain, 't'), p =>
		ungen(
			v(p),
			λ(Fn(domain, 't'), r =>
				λ(Fn(domain, 't'), b =>
					app(
						not,
						some(
							λ(domain, x => app(app(and, app(v(r), v(x))), app(v(b), v(x)))),
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

const distributiveEventiveAdverbial = λ(Fn('e', Fn('v', 't')), p =>
	λ('v', outerEvent =>
		some(λ('v', innerEvent => app(app(v(p), v(outerEvent)), v(innerEvent)))),
	),
);

const eventiveAdverbial = (distributive: boolean) => {
	if (!distributive)
		throw new Ungrammatical('Non-distributive eventive adverbial');
	return distributiveEventiveAdverbial;
};

const distributiveSubjectSharingAdverbial = ref(
	{ type: 'reflexive' },
	λ(Int(Pl('e')), subject =>
		bind(
			{ type: 'reflexive' },
			v(subject),
			int(
				λ('s', w =>
					map(
						app(unint(v(subject)), v(w)),
						λ('e', subject_ =>
							λ(Fn('e', Fn('v', 't')), p =>
								λ('v', outerEvent =>
									some(
										λ('v', innerEvent =>
											app(
												app(
													and,
													app(
														app(app(unint(overlap), v(w)), v(innerEvent)),
														v(outerEvent),
													),
												),
												app(app(v(p), v(subject_)), v(innerEvent)),
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
	),
);

const nondistributiveSubjectSharingAdverbial = ref(
	{ type: 'reflexive' },
	λ(Int(Pl('e')), subject =>
		bind(
			{ type: 'reflexive' },
			v(subject),
			int(
				λ('s', w =>
					λ(Fn(Pl('e'), Fn('v', 't')), p =>
						λ('v', outerEvent =>
							some(
								λ('v', innerEvent =>
									app(
										app(
											and,
											app(
												app(app(unint(overlap), v(w)), v(innerEvent)),
												v(outerEvent),
											),
										),
										app(app(v(p), app(unint(v(subject)), v(w))), v(innerEvent)),
									),
								),
							),
						),
					),
				),
			),
		),
	),
);

export const subjectSharingAdverbial = (distributive: boolean) =>
	distributive
		? distributiveSubjectSharingAdverbial
		: nondistributiveSubjectSharingAdverbial;

export const adjuncts: Partial<
	Record<SubjectType, (distributive: boolean) => Expr>
> = {
	free: eventiveAdverbial,
	event: eventiveAdverbial,
	shape: eventiveAdverbial,
	agent: subjectSharingAdverbial,
	individual: subjectSharingAdverbial,
};
