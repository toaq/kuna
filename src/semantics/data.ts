import { Impossible, Ungrammatical } from '../core/error';
import type { SubjectType } from '../morphology/dictionary';
import type { CovertValue } from '../tree/types';
import {
	Act,
	Bind,
	Dx,
	Fn,
	Indef,
	Int,
	Pl,
	Qn,
	Ref,
	accessibility,
	among,
	and,
	andMap,
	animate,
	app,
	assertFn,
	bg,
	bind,
	cont,
	equals,
	every,
	filter,
	implies,
	indef,
	int,
	lex,
	map,
	not,
	or,
	overlap,
	qn,
	ref,
	salient,
	single,
	some,
	unindef,
	unint,
	unref,
	v,
	λ,
} from './model';
import { typeToPlainText } from './render';
import { getBigFunctor, getFunctor, idFunctor } from './structures';
import type { AnimacyClass, Expr, ExprType } from './types';

export const covertV = lex('raı', Int(Fn('e', Fn('v', 't'))));

const propositionContent = lex('ꝡä', Int(Fn(Int('t'), Fn('e', 't'))));

export const serialFrames = new Map<string, (verb: Expr) => Expr>([
	[
		'c 0',
		verb => {
			const { wrap, unwrap, map } = getBigFunctor(verb.type) ?? idFunctor;
			const inner = unwrap(verb.type);
			assertFn(inner);
			assertFn(inner.range);
			const subjectType = inner.range.domain;
			return map(
				() =>
					λ(inner, verb_ =>
						int(
							λ('s', w =>
								λ(Int(Fn('v', 't')), tail =>
									λ(subjectType, subject =>
										λ('v', e =>
											some(
												λ('e', object =>
													app(
														app(
															and,
															app(
																app(
																	app(unint(propositionContent), v(w)),
																	int(
																		λ('s', w_ =>
																			some(
																				λ('v', e_ =>
																					app(
																						app(unint(v(tail)), v(w_)),
																						v(e_),
																					),
																				),
																			),
																		),
																	),
																),
																v(object),
															),
														),
														app(
															app(app(v(verb_), v(object)), v(subject)),
															v(e),
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
				() => verb,
				verb.type,
				wrap(Fn(Int(Fn('v', 't')), Fn(subjectType, Fn('v', 't'))), verb.type),
			);
		},
	],
]);

export const distributiveLittleV = ref(
	{ type: 'subject' },
	λ(Int(Pl('e')), subject =>
		bind(
			{ type: 'subject' },
			v(subject),
			ref(
				{ type: 'reflexive' },
				λ(Int(Pl('e')), refl =>
					int(
						λ('s', w =>
							map(
								app(unint(v(refl)), v(w)),
								λ('e', refl_ =>
									bind(
										{ type: 'reflexive' },
										int(λ('s', () => single(v(refl_)))),
										λ(Fn('e', Fn('v', 't')), pred => app(v(pred), v(refl_))),
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

export const nondistributiveLittleV = ref(
	{ type: 'subject' },
	λ(Int(Pl('e')), subject =>
		bind(
			{ type: 'subject' },
			v(subject),
			int(
				λ('s', w =>
					bind(
						{ type: 'reflexive' },
						int(λ('s', () => app(unint(v(subject)), v(w)))),
						ref(
							{ type: 'reflexive' },
							λ(Int(Pl('e')), refl =>
								λ(Fn(Pl('e'), Fn('v', 't')), pred =>
									app(v(pred), app(unint(v(refl)), v(w))),
								),
							),
						),
					),
				),
			),
		),
	),
);

export const pro = ref(
	{ type: 'covert resumptive' },
	λ(Int(Pl('e')), x => v(x)),
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
	...personalPronouns.map(toaq => [toaq, lex(toaq, Dx(Int(Pl('e'))))] as const),
	[
		'há',
		andMap(
			salient(Int(Fn(Pl('e'), 't'))),
			λ(Int(Fn(Pl('e'), 't')), r =>
				int(
					λ('s', w =>
						indef(
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
		'áqna',
		ref(
			{ type: 'subject' },
			λ(Int(Pl('e')), x => v(x)),
		),
	],
	[
		'áq',
		ref(
			{ type: 'reflexive' },
			λ(Int(Pl('e')), x => v(x)),
		),
	],
	[
		'chéq',
		ref(
			{ type: 'subject' },
			λ(Int(Pl('e')), subject =>
				ref(
					{ type: 'reflexive' },
					λ(Int(Pl('e')), refl =>
						int(
							λ('s', w =>
								cont(
									λ(Fn(Bind({ type: 'reflexive' }, Int(Pl('e'))), 't'), pred =>
										every(
											λ('e', refl_ =>
												app(
													app(
														implies,
														among(v(refl_), app(unint(v(refl)), v(w))),
													),
													app(
														v(pred),
														bind(
															{ type: 'reflexive' },
															int(λ('s', () => single(v(refl_)))),
															int(
																λ('s', w_ =>
																	filter(
																		app(unint(v(subject)), v(w_)),
																		λ('e', subject_ =>
																			app(not, equals(v(subject_), v(refl_))),
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
							),
						),
					),
				),
			),
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
				indef(
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
	indef(
		v(predicate),
		λ(Int(Pl('e')), x => v(x)),
	),
);

export const covertComplementizers = new Map<CovertValue, Expr>([
	['∅', λ(Int('t'), t => v(t))],
	[
		'REL',
		λ(Ref({ type: 'covert resumptive' }, 't'), predicate =>
			unref(v(predicate)),
		),
	],
]);

export const overtComplementizers = new Map<string, Expr>([
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
	[
		'ꝡä',
		int(
			λ('s', w =>
				λ(Int('t'), prop =>
					λ(Int(Pl('e')), x =>
						every(
							λ('e', x_ =>
								app(
									app(implies, among(v(x_), app(unint(v(x)), v(w)))),
									app(
										app(app(unint(propositionContent), v(w)), v(prop)),
										v(x_),
									),
								),
							),
						),
					),
				),
			),
		),
	],
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
		andMap(
			accessibility,
			λ(Fn('s', Fn('s', 't')), accessible =>
				int(
					λ('s', w =>
						λ(Int('t'), antecedent =>
							λ(Int('t'), consequent =>
								indef(
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
										indef(
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
				indef(
					λ('()', () => v(antecedent)),
					λ('()', () => v(consequent)),
				),
			),
		),
	],
]);

const always = (domain: ExprType) =>
	λ(Indef(domain, 't'), p =>
		unindef(
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
	λ(Indef(domain, 't'), p =>
		unindef(
			v(p),
			λ(Fn(domain, 't'), r =>
				λ(Fn(domain, 't'), b =>
					some(λ(domain, x => app(app(and, app(v(r), v(x))), app(v(b), v(x))))),
				),
			),
		),
	);

const never = (domain: ExprType) =>
	λ(Indef(domain, 't'), p =>
		unindef(
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
);

const nondistributiveSubjectSharingAdverbial = ref(
	{ type: 'reflexive' },
	λ(Int(Pl('e')), subject =>
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
