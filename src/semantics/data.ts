import { Impossible, Ungrammatical } from '../core/error';
import type { SubjectType, VerbEntry } from '../morphology/dictionary';
import { bare } from '../morphology/tokenize';
import type { CovertValue, CovertWord, Word } from '../tree/types';
import { compose } from './compose';
import {
	Act,
	Bind,
	Cont,
	Dx,
	Fn,
	Indef,
	Int,
	Pair,
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
	assertInt,
	assertPl,
	bg,
	bind,
	constrast,
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
	pair,
	qn,
	ref,
	salient,
	single,
	some,
	uncont,
	unindef,
	unint,
	union,
	universe,
	unpair,
	unref,
	v,
	xor,
	λ,
} from './model';
import { reduce } from './reduce';
import { typeToPlainText } from './render';
import {
	getBigFunctor,
	getFunctor,
	idFunctor,
	unwrapEffects,
} from './structures';
import type { AnimacyClass, Binding, Expr, ExprType } from './types';

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
	[
		'0',
		verb => {
			const { wrap, unwrap, map } = getBigFunctor(verb.type) ?? idFunctor;
			const inner = unwrap(verb.type);
			assertFn(inner);
			assertFn(inner.range);
			return map(
				() =>
					λ(inner, verb_ =>
						int(
							λ('s', w =>
								λ(Int(Fn('v', 't')), tail =>
									λ('v', e =>
										some(
											λ('e', subject =>
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
																				app(app(unint(v(tail)), v(w_)), v(e_)),
																			),
																		),
																	),
																),
															),
															v(subject),
														),
													),
													app(app(v(verb_), v(subject)), v(e)),
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
				wrap(Fn(Int(Fn('v', 't')), Fn('v', 't')), verb.type),
			);
		},
	],
]);

export const distributiveLittleV = (cCommand: ExprType) => {
	const unwrapped = unwrapEffects(cCommand);
	assertFn(unwrapped);
	return ref(
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
											λ(Fn('e', unwrapped.range), pred =>
												app(v(pred), v(refl_)),
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
};

export const nondistributiveLittleV = (cCommand: ExprType) => {
	const unwrapped = unwrapEffects(cCommand);
	assertFn(unwrapped);
	return ref(
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
									λ(Fn(Pl('e'), unwrapped.range), pred =>
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
};

export const cleftVerb = λ(Ref({ type: 'resumptive' }, 't'), p => unref(v(p)));

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

const po = salient(Int(Fn(Pl('e'), Fn(Pl('e'), Fn('v', 't')))));

export const knownVerbs = new Map<string, Expr>([
	['po', po],
	...(function* () {
		for (const [toaq, e] of pronouns) {
			yield [`${bare(toaq)}bo`, reduce(compose(po, e).denotation)] satisfies [
				string,
				Expr,
			];
		}
	})(),
	['nu', lex('nu', Dx(Int(Fn(Pl('e'), Fn('v', 't')))))],
	['nınu', lex('nınu', Dx(Int(Fn(Pl('e'), Fn('v', 't')))))],
	['nanu', lex('nanu', Dx(Int(Fn(Pl('e'), Fn('v', 't')))))],
]);

export const pronominalTenses = new Set(['tuom', 'naı', 'jıa', 'pu']);

export const polarities = new Map<string, Expr>([
	['jeo', λ('t', t => v(t))],
	['bu', not],
]);

// Int Pl e, i, Int Pl e  ->  e, i, e
function distributeSemaTuple(t: ExprType): ExprType {
	if (typeof t === 'string') return t;
	if (t.head === 'pair')
		return Pair(
			distributeSemaTuple(t.inner),
			distributeSemaTuple(t.supplement),
		);
	return t.head === 'int' &&
		typeof t.inner === 'object' &&
		t.inner.head === 'pl' &&
		t.inner.inner === 'e'
		? 'e'
		: t;
}

// e, i, e  ->  Int Pl e, i, Int Pl e
function liftDistributedSemaTuple(e: Expr): Expr {
	if (e.type === 'e')
		return app(
			λ('e', x => int(λ('s', () => single(v(x))))),
			e,
		);
	if (typeof e.type === 'object' && e.type.head === 'pair') {
		const { inner, supplement } = e.type;
		return unpair(
			e,
			λ(inner, l =>
				λ(supplement, r =>
					pair(liftDistributedSemaTuple(v(l)), liftDistributedSemaTuple(v(r))),
				),
			),
		);
	}
	return e;
}

// Int Pl (e, e)  ->  Int Pl e, Int Pl e
function splitDistributedSemaTuple(e: () => Expr, type: ExprType): Expr {
	assertInt(type);
	assertPl(type.inner);
	if (
		typeof type.inner.inner === 'object' &&
		type.inner.inner.head === 'pair'
	) {
		const { inner } = type.inner;
		const { inner: l, supplement: r } = inner;
		return pair(
			splitDistributedSemaTuple(
				() =>
					int(
						λ('s', w =>
							map(
								app(unint(e()), v(w)),
								λ(inner, x =>
									unpair(
										v(x),
										λ(l, l => λ(r, () => v(l))),
									),
								),
							),
						),
					),
				Int(Pl(l)),
			),
			splitDistributedSemaTuple(
				() =>
					int(
						λ('s', w =>
							map(
								app(unint(e()), v(w)),
								λ(inner, x =>
									unpair(
										v(x),
										λ(l, () => λ(r, r => v(r))),
									),
								),
							),
						),
					),
				Int(Pl(r)),
			),
		);
	}
	return e();
}

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
		'túq',
		domain =>
			λ(Int(Fn(domain, 't')), predicate => {
				const distributed = distributeSemaTuple(domain);
				return splitDistributedSemaTuple(
					() =>
						int(
							λ('s', w =>
								filter(
									universe(distributed),
									λ(distributed, x =>
										app(
											app(unint(v(predicate)), v(w)),
											liftDistributedSemaTuple(v(x)),
										),
									),
								),
							),
						),
					Int(Pl(distributed)),
				);
			}),
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

function animacyClass(verb: VerbEntry): AnimacyClass | null {
	if (verb.toaq === 'raı') return null;
	switch (verb.pronominal_class) {
		case 'ho':
			return 'animate';
		case 'maq':
			return 'inanimate';
		case 'hoq':
			return 'abstract';
		default:
			return 'descriptive';
	}
}

export function wrapInBindings(
	value: Expr,
	sema: Expr,
	verb: Word | CovertWord,
): Expr {
	let result = value;
	const animacy =
		!verb.covert && verb.entry !== undefined && 'pronominal_class' in verb.entry
			? animacyClass(verb.entry)
			: null;
	if (animacy !== null)
		result = bind({ type: 'animacy', class: animacy }, sema, result);
	if (
		!verb.covert &&
		verb.entry !== undefined &&
		verb.entry.type !== 'predicatizer'
	)
		result = bind(
			verb.entry.type === 'predicate'
				? { type: 'name', verb: verb.entry.toaq }
				: { type: 'head', head: verb.bare },
			sema,
			result,
		);
	return result;
}

export const littleNs = new Map<CovertValue, (verb: Word | CovertWord) => Expr>(
	[
		[
			'PL',
			verb =>
				λ(Fn(Int(Pl('e')), 't'), predicate =>
					indef(
						v(predicate),
						λ(Int(Pl('e')), x => wrapInBindings(v(x), v(x), verb)),
					),
				),
		],
		[
			'SG',
			verb =>
				λ(Fn(Int(Pl('e')), 't'), predicate =>
					indef(
						λ(Int('e'), x =>
							app(
								v(predicate),
								int(λ('s', w => single(app(unint(v(x)), v(w))))),
							),
						),
						λ(Int('e'), x =>
							wrapInBindings(
								int(λ('s', w => single(app(unint(v(x)), v(w))))),
								int(λ('s', w => single(app(unint(v(x)), v(w))))),
								verb,
							),
						),
					),
				),
		],
	],
);

export const covertComplementizers = new Map<CovertValue, Expr>([
	[
		'∅',
		λ(Cont('t'), p =>
			app(
				uncont(v(p)),
				λ('t', t => v(t)),
			),
		),
	],
	[
		'REL',
		λ(Ref({ type: 'covert resumptive' }, 't'), predicate =>
			unref(v(predicate)),
		),
	],
]);

export const overtComplementizers = new Map<string, Expr>([
	[
		'ꝡa',
		λ(Cont('t'), p =>
			app(
				uncont(v(p)),
				λ('t', t => v(t)),
			),
		),
	],
	[
		'ma',
		λ(Cont('t'), p =>
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
				λ(Fn('t', 't'), polarity => app(uncont(v(p)), v(polarity))),
			),
		),
	],
	[
		'ꝡä',
		int(
			λ('s', w =>
				λ(Int(Cont('t')), prop =>
					λ(Int(Pl('e')), x =>
						every(
							λ('e', x_ =>
								app(
									app(implies, among(v(x_), app(unint(v(x)), v(w)))),
									app(
										app(
											app(unint(propositionContent), v(w)),
											int(
												λ('s', w_ =>
													app(
														uncont(app(unint(v(prop)), v(w_))),
														λ('t', t => v(t)),
													),
												),
											),
										),
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
		λ(Cont(Ref({ type: 'resumptive' }, 't')), p =>
			λ(Int(Pl('e')), x =>
				app(
					uncont(v(p)),
					λ(Ref({ type: 'resumptive' }, 't'), p_ => app(unref(v(p_)), v(x))),
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
	['ꝡeı', () => Fn(Int('t'), Act('()'))], // TODO: Interaction with degrees?
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
		andMap(
			accessibility,
			λ(Fn('s', Fn('s', 't')), accessible =>
				λ(Int('t'), antecedent =>
					andMap(
						app(
							bg,
							app(
								lex('da', Fn(Int('t'), Act('()'))),
								int(λ('s', w => app(not, app(unint(v(antecedent)), v(w))))),
							),
						),
						λ('()', () =>
							λ(Int('t'), consequent =>
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

export type Conjunction = (conjunct: ExprType, bind: boolean) => Expr;

function clausalConjunction(conjoin: Expr, headBinding: string): Conjunction {
	const binding: Binding = { type: 'head', head: headBinding };
	return (conjunct, bnd) =>
		λ(Cont(conjunct), r =>
			λ(Cont(conjunct), l =>
				cont(
					λ(Fn(bnd ? Bind(binding, conjunct) : conjunct, 't'), pred => {
						const pred_ = bnd
							? λ(conjunct, x => app(v(pred), bind(binding, v(x), v(x))))
							: v(pred);
						return app(
							app(conjoin, app(uncont(v(l)), pred_)),
							app(uncont(v(r)), pred_),
						);
					}),
				),
			),
		);
}

export const clausalConjunctions = new Map<string, Conjunction>([
	['rú', clausalConjunction(and, 'ru')],
	['rá', clausalConjunction(or, 'ra')],
	['ró', clausalConjunction(xor, 'ro')],
	[
		'rí',
		(conjunct, bnd) =>
			λ(Cont(conjunct), r =>
				λ(Cont(conjunct), l =>
					qn(
						λ(Cont(conjunct), x =>
							app(app(or, equals(v(x), v(l))), equals(v(x), v(r))),
						),
						λ(Cont(conjunct), x => {
							if (!bnd) return v(x);
							const binding: Binding = { type: 'head', head: 'rı' };
							return cont(
								λ(Fn(Bind(binding, conjunct), 't'), pred =>
									app(
										uncont(v(x)),
										λ(conjunct, x_ =>
											app(v(pred), bind(binding, v(x_), v(x_))),
										),
									),
								),
							);
						}),
					),
				),
			),
	],
	[
		'kéo',
		(conjunct, bnd) =>
			λ(Cont(conjunct), r =>
				λ(Cont(conjunct), l =>
					andMap(
						app(bg, constrast(v(l), v(r))),
						λ('()', () => {
							const binding: Binding = { type: 'head', head: 'keo' };
							return cont(
								λ(Fn(bnd ? Bind(binding, conjunct) : conjunct, 't'), pred => {
									const pred_ = bnd
										? λ(conjunct, x => app(v(pred), bind(binding, v(x), v(x))))
										: v(pred);
									return app(
										app(and, app(uncont(v(l)), pred_)),
										app(uncont(v(r)), pred_),
									);
								}),
							);
						}),
					),
				),
			),
	],
]);

export const pluralCoordinator = λ(Int(Pl('e')), r =>
	λ(Int(Pl('e')), l => {
		const result = int(
			λ('s', w => union(app(unint(v(l)), v(w)), app(unint(v(r)), v(w)))),
		);
		return bind({ type: 'head', head: 'roı' }, result, result);
	}),
);
