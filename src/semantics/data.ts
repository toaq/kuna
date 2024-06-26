import type { SubjectType } from '../morphology/dictionary';
import type { CovertValue, Label } from '../tree';
import {
	assert,
	type AnimacyClass,
	type Bindings,
	type Expr,
	type ExprType,
	abstract,
	after,
	afterNear,
	agent,
	alternative,
	ama,
	and,
	animate,
	app,
	before,
	beforeNear,
	coevent,
	content,
	equals,
	every,
	everyCuml,
	everySing,
	expectedEnd,
	expectedStart,
	gen,
	ime,
	implies,
	inanimate,
	indeed,
	inertiaWorlds,
	ji,
	le,
	nhana,
	nhao,
	noBindings,
	not,
	or,
	perform,
	permit,
	presuppose,
	promise,
	realWorld,
	roi,
	she,
	some,
	speechTime,
	subinterval,
	subject,
	suna,
	suo,
	suq,
	temporalTrace,
	topic as topicWorld,
	umo,
	v,
	verb,
	warn,
	wish,
	λ,
} from './model';
import { lift, reduce } from './operations';

const hoa = v(0, ['e']);

export const covertHoaBindings: Bindings = {
	...noBindings,
	covertResumptive: { index: 0, subordinate: false, timeIntervals: [] },
};

// λ𝘢. λ𝘦. raı.𝘸(𝘢)(𝘦)
export const covertV = λ('e', ['s'], c =>
	λ('v', c, c => verb('raı', [v(1, c)], v(0, c), v(2, c))),
);

export const dps: Record<string, [Expr, Bindings]> = {
	jí: [ji([]), noBindings],
	súq: [suq([]), noBindings],
	nháo: [nhao([]), noBindings],
	súna: [suna([]), noBindings],
	nhána: [nhana([]), noBindings],
	úmo: [umo([]), noBindings],
	íme: [ime([]), noBindings],
	súo: [suo([]), noBindings],
	áma: [ama([]), noBindings],
	// 𝘢
	hóa: [
		hoa,
		{
			...noBindings,
			resumptive: { index: 0, subordinate: false, timeIntervals: [] },
		},
	],
	// 𝘢 | animate(𝘢)
	hó: [
		presuppose(v(0, ['e']), app(animate(['e']), v(0, ['e']))),
		{
			...noBindings,
			animacy: new Map([
				['animate', { index: 0, subordinate: false, timeIntervals: [] }],
			]),
		},
	],
	// 𝘢 | inanimate(𝘢)
	máq: [
		presuppose(v(0, ['e']), app(inanimate(['e']), v(0, ['e']))),
		{
			...noBindings,
			animacy: new Map([
				['inanimate', { index: 0, subordinate: false, timeIntervals: [] }],
			]),
		},
	],
	// 𝘢 | abstract(𝘢)
	hóq: [
		presuppose(v(0, ['e']), app(abstract(['e']), v(0, ['e']))),
		{
			...noBindings,
			animacy: new Map([
				['abstract', { index: 0, subordinate: false, timeIntervals: [] }],
			]),
		},
	],
	// 𝘢
	tá: [
		hoa,
		{
			...noBindings,
			animacy: new Map([
				['descriptive', { index: 0, subordinate: false, timeIntervals: [] }],
			]),
		},
	],
};

export const aspects: Record<string, Expr> = {
	// λ𝘗. λ𝘵. ∃𝘦. τ(𝘦) ⊆ 𝘵 ∧ 𝘗(𝘦)
	tam: λ(['v', 't'], [], c =>
		λ('i', c, c =>
			some('v', c, c =>
				and(
					subinterval(app(temporalTrace(c), v(0, c)), v(1, c)),
					app(v(2, c), v(0, c)),
				),
			),
		),
	),
	// λ𝘗. λ𝘵. ∀𝘸' : ɪᴡ(𝘸')(𝘸)(𝘵). ∃𝘦. 𝘵 ⊆ τ(𝘦) ∧ 𝘗(𝘦)(𝘸')
	chum: λ(['v', ['s', 't']], ['s'], c =>
		λ('i', c, c =>
			every(
				's',
				c,
				c =>
					some('v', c, c =>
						and(
							subinterval(v(2, c), app(temporalTrace(c), v(0, c))),
							app(app(v(3, c), v(0, c)), v(1, c)),
						),
					),
				c => app(app(app(inertiaWorlds(c), v(0, c)), v(3, c)), v(1, c)),
			),
		),
	),
	// λ𝘗. λ𝘵. ∃𝘦. τ(𝘦) < 𝘵 ∧ 𝘗(𝘦)
	luı: λ(['v', 't'], [], c =>
		λ('i', c, c =>
			some('v', c, c =>
				and(
					before(app(temporalTrace(c), v(0, c)), v(1, c)),
					app(v(2, c), v(0, c)),
				),
			),
		),
	),
	// λ𝘗. λ𝘵. ∃𝘦. τ(𝘦) > 𝘵 ∧ 𝘗(𝘦)
	za: λ(['v', 't'], [], c =>
		λ('i', c, c =>
			some('v', c, c =>
				and(
					after(app(temporalTrace(c), v(0, c)), v(1, c)),
					app(v(2, c), v(0, c)),
				),
			),
		),
	),
	// λ𝘗. λ𝘵. ∃𝘦. 𝘵 ⊆ τ(𝘦) ∧ 𝘵 > ExpEnd(𝘦) ∧ 𝘗(𝘦)
	hoaı: λ(['v', 't'], [], c =>
		λ('i', c, c =>
			some('v', c, c =>
				and(
					subinterval(v(1, c), app(temporalTrace(c), v(0, c))),
					and(
						after(v(1, c), app(expectedEnd(c), v(0, c))),
						app(v(2, c), v(0, c)),
					),
				),
			),
		),
	),
	// λ𝘗. λ𝘵. ∃𝘦. 𝘵 ⊆ τ(𝘦) ∧ 𝘵 < ExpStart(𝘦) ∧ 𝘗(𝘦)
	haı: λ(['v', 't'], [], c =>
		λ('i', c, c =>
			some('v', c, c =>
				and(
					subinterval(v(1, c), app(temporalTrace(c), v(0, c))),
					and(
						before(v(1, c), app(expectedStart(c), v(0, c))),
						app(v(2, c), v(0, c)),
					),
				),
			),
		),
	),
	// λ𝘗. λ𝘵. ∃𝘦. τ(𝘦) <.near 𝘵 ∧ 𝘗(𝘦)
	hıq: λ(['v', 't'], [], c =>
		λ('i', c, c =>
			some('v', c, c =>
				and(
					beforeNear(app(temporalTrace(c), v(0, c)), v(1, c)),
					app(v(2, c), v(0, c)),
				),
			),
		),
	),
	// λ𝘗. λ𝘵. ∃𝘦. τ(𝘦) >.near 𝘵 ∧ 𝘗(𝘦)
	fı: λ(['v', 't'], [], c =>
		λ('i', c, c =>
			some('v', c, c =>
				and(
					afterNear(app(temporalTrace(c), v(0, c)), v(1, c)),
					app(v(2, c), v(0, c)),
				),
			),
		),
	),
};

// t
export const defaultTense = v(0, ['i']);

export const tenses: Record<string, Expr> = {
	// t | t ⊆ t0
	naı: presuppose(v(0, ['i']), subinterval(v(0, ['i']), speechTime(['i']))),
	// t | t < t0
	pu: presuppose(v(0, ['i']), before(v(0, ['i']), speechTime(['i']))),
	// t | t > t0
	jıa: presuppose(v(0, ['i']), after(v(0, ['i']), speechTime(['i']))),
	// t | t <.near t0
	pujuı: presuppose(v(0, ['i']), beforeNear(v(0, ['i']), speechTime(['i']))),
	// t | t >.near t0
	jıajuı: presuppose(v(0, ['i']), afterNear(v(0, ['i']), speechTime(['i']))),
	// λ𝘗. ∃𝘵. 𝘗(𝘵)
	sula: λ(['i', 't'], [], c => some('i', c, c => app(v(1, c), v(0, c)))),
	// λ𝘗. ∃𝘵 : 𝘵 < t0. 𝘗(𝘵)
	mala: λ(['i', 't'], [], c =>
		some(
			'i',
			c,
			c => app(v(1, c), v(0, c)),
			c => before(v(0, c), speechTime(c)),
		),
	),
	// λ𝘗. ∃𝘵 : 𝘵 > t0. 𝘗(𝘵)
	jela: λ(['i', 't'], [], c =>
		some(
			'i',
			c,
			c => app(v(1, c), v(0, c)),
			c => after(v(0, c), speechTime(c)),
		),
	),
};

export const polarities: Record<string, Expr> = {
	// λ𝘗. ¬𝘗
	bu: λ('t', [], c => not(v(0, c))),
	// λ𝘗. †𝘗
	jeo: λ('t', [], c => indeed(v(0, c))),
	// λ𝘗 : A(F)(λ𝘸'. ¬𝘗(𝘸'))(𝘸) ∧ (F(𝘸) → 𝘗(𝘸)). ¬𝘗(𝘸)
	aımu: λ(
		['s', 't'],
		[['s', 't'], 's'],
		c => not(app(v(0, c), v(2, c))),
		c =>
			and(
				app(
					app(
						app(alternative(['s', 't'], c), v(1, c)),
						λ('s', c, c => not(app(v(1, c), v(0, c)))),
					),
					v(2, c),
				),
				implies(app(v(1, c), v(2, c)), app(v(0, c), v(2, c))),
			),
	),
	// λ𝘗 : A(F)(𝘗)(𝘸) ∧ ¬(F(𝘸) ∧ 𝘗(𝘸)). †𝘗(𝘸)
	jeha: λ(
		['s', 't'],
		[['s', 't'], 's'],
		c => indeed(app(v(0, c), v(2, c))),
		c =>
			and(
				app(app(app(alternative(['s', 't'], c), v(1, c)), v(0, c)), v(2, c)),
				not(and(app(v(1, c), v(2, c)), app(v(0, c), v(2, c)))),
			),
	),
};

export const speechActs: Record<string, Expr> = {
	da: assert([]),
	ka: perform([]),
	ba: wish([]),
	nha: promise([]),
	doa: permit([]),
	ꝡo: warn([]),
};

// λ𝘗. a
export const headAnaphor = λ('e', ['e'], c => v(1, c));

// λ𝘗. (a | 𝘗(a))
export const boundTheNp = λ(['e', 't'], ['e'], c =>
	presuppose(v(1, c), app(v(0, c), v(1, c)), 1),
);

// λ𝘗. (a | Cont(a)(𝘸) = 𝘗)
export const boundTheCp = λ(['s', 't'], ['e', 's'], c =>
	presuppose(
		v(1, c),
		equals(app(app(content(c), v(1, c)), v(2, c)), v(0, c)),
		1,
	),
);

export const covertLittleVs: Partial<Record<CovertValue, Expr | null>> = {
	// λ𝘢. λ𝘦. ᴀɢᴇɴᴛ(𝘦)(𝘸) = 𝘢
	CAUSE: λ('e', ['s'], c =>
		λ('v', c, c => equals(app(app(agent(c), v(0, c)), v(2, c)), v(1, c))),
	),
	BE: null,
};

export const overtLittleVs: Record<string, Expr | null> = {
	nä: null,
	gö: null,
};

const animacyPredicates: Record<
	AnimacyClass,
	((context: ExprType[]) => Expr) | null
> = {
	animate,
	inanimate,
	abstract,
	descriptive: null,
};

export const animacies = Object.fromEntries(
	Object.entries(animacyPredicates).map(
		([a, pred]) =>
			[
				a,
				pred === null
					? // λ𝘗. 𝘗
						λ(['e', 't'], ['e'], c => v(0, c))
					: // λ𝘗 : animate(a). 𝘗
						λ(
							['e', 't'],
							['e'],
							c => v(0, c),
							c => app(pred(c), v(1, c)),
						),
			] as [AnimacyClass, Expr],
	),
) as Record<AnimacyClass, Expr>;

export const quantifiers: Partial<Record<CovertValue, Expr>> = {
	// λ𝘗. λ𝘘. ∃𝘢 : 𝘗(𝘢). 𝘘(𝘢)
	'∃': λ(['e', 't'], [], c =>
		λ(['e', 't'], c, c =>
			some(
				'e',
				c,
				c => app(v(1, c), v(0, c)),
				c => app(v(2, c), v(0, c)),
			),
		),
	),
	// λ𝘗. λ𝘘. ¬∃𝘢 : 𝘗(𝘢). 𝘘(𝘢)
	'¬∃': λ(['e', 't'], [], c =>
		λ(['e', 't'], c, c =>
			not(
				some(
					'e',
					c,
					c => app(v(1, c), v(0, c)),
					c => app(v(2, c), v(0, c)),
				),
			),
		),
	),
	// λ𝘗. λ𝘘. ∀𝘢 : 𝘗(𝘢). 𝘘(𝘢)
	'∀': λ(['e', 't'], [], c =>
		λ(['e', 't'], c, c =>
			every(
				'e',
				c,
				c => app(v(1, c), v(0, c)),
				c => app(v(2, c), v(0, c)),
			),
		),
	),
	// λ𝘗. λ𝘘. ∀.SING 𝘢 : 𝘗(𝘢). 𝘘(𝘢)
	'∀.SING': λ(['e', 't'], [], c =>
		λ(['e', 't'], c, c =>
			everySing(
				'e',
				c,
				c => app(v(1, c), v(0, c)),
				c => app(v(2, c), v(0, c)),
			),
		),
	),
	// λ𝘗. λ𝘘. ∀.CUML 𝘢 : 𝘗(𝘢). 𝘘(𝘢)
	'∀.CUML': λ(['e', 't'], [], c =>
		λ(['e', 't'], c, c =>
			everyCuml(
				'e',
				c,
				c => app(v(1, c), v(0, c)),
				c => app(v(2, c), v(0, c)),
			),
		),
	),
	// λ𝘗. λ𝘘. GEN 𝘢 : 𝘗(𝘢). 𝘘(𝘢)
	GEN: λ(['e', 't'], [], c =>
		λ(['e', 't'], c, c =>
			gen(
				'e',
				c,
				c => app(v(1, c), v(0, c)),
				c => app(v(2, c), v(0, c)),
			),
		),
	),
	// λ𝘗 : 𝘗(a). λ𝘘. 𝘘(a) | ¬∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)
	EXO: presuppose(
		λ(
			['e', 't'],
			['e'],
			c => λ(['e', 't'], c, c => app(v(0, c), v(2, c))),
			c => app(v(0, c), v(1, c)),
		),
		not(
			some('v', ['e'], c =>
				and(
					beforeNear(app(temporalTrace(c), v(0, c)), speechTime(c)),
					verb('meakuq', [v(1, c)], v(0, c), realWorld(c)),
				),
			),
		),
	),
	// λ𝘗 : 𝘗(a). λ𝘘. 𝘘(a) | ∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)
	ENDO: presuppose(
		λ(
			['e', 't'],
			['e'],
			c => λ(['e', 't'], c, c => app(v(0, c), v(2, c))),
			c => app(v(0, c), v(1, c)),
		),
		some('v', ['e'], c =>
			and(
				beforeNear(app(temporalTrace(c), v(0, c)), speechTime(c)),
				verb('meakuq', [v(1, c)], v(0, c), realWorld(c)),
			),
		),
	),
	// λ𝘗 : 𝘗(a). λ𝘘. 𝘘(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦)
	DEM: presuppose(
		λ(
			['e', 't'],
			['e'],
			c => λ(['e', 't'], c, c => app(v(0, c), v(2, c))),
			c => app(v(0, c), v(1, c)),
		),
		some('v', ['e'], c =>
			and(
				subinterval(app(temporalTrace(c), v(0, c)), speechTime(c)),
				and(
					equals(app(app(agent(c), v(0, c)), realWorld(c)), ji(c)),
					verb('nıka', [v(1, c)], v(0, c), realWorld(c)),
				),
			),
		),
	),
	// λ𝘗 : 𝘗(a). λ𝘘. 𝘘(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ tıjuı.w(a, jí)(𝘦)
	PROX: presuppose(
		presuppose(
			λ(
				['e', 't'],
				['e'],
				c => λ(['e', 't'], c, c => app(v(0, c), v(2, c))),
				c => app(v(0, c), v(1, c)),
			),
			some('v', ['e'], c =>
				and(
					subinterval(app(temporalTrace(c), v(0, c)), speechTime(c)),
					and(
						equals(app(app(agent(c), v(0, c)), realWorld(c)), ji(c)),
						verb('nıka', [v(1, c)], v(0, c), realWorld(c)),
					),
				),
			),
		),
		some('v', ['e'], c =>
			and(
				subinterval(app(temporalTrace(c), v(0, c)), speechTime(c)),
				verb('tıjuı', [v(1, c), ji(c)], v(0, c), realWorld(c)),
			),
		),
	),
	// λ𝘗 : 𝘗(a). λ𝘘. 𝘘(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ tıjao.w(a, jí)(𝘦)
	DIST: presuppose(
		presuppose(
			λ(
				['e', 't'],
				['e'],
				c => λ(['e', 't'], c, c => app(v(0, c), v(2, c))),
				c => app(v(0, c), v(1, c)),
			),
			some('v', ['e'], c =>
				and(
					subinterval(app(temporalTrace(c), v(0, c)), speechTime(c)),
					and(
						equals(app(app(agent(c), v(0, c)), realWorld(c)), ji(c)),
						verb('nıka', [v(1, c)], v(0, c), realWorld(c)),
					),
				),
			),
		),
		some('v', ['e'], c =>
			and(
				subinterval(app(temporalTrace(c), v(0, c)), speechTime(c)),
				verb('tıjao', [v(1, c), ji(c)], v(0, c), realWorld(c)),
			),
		),
	),
};

// λ𝘗. λ𝘦. ∃𝘦'. 𝘗(𝘦)(𝘦')
const eventiveAdverbial = λ(['e', ['v', 't']], [], c =>
	λ('v', c, c => some('v', c, c => app(app(v(2, c), v(1, c)), v(0, c)))),
);

// λ𝘗. λ𝘦. ∃𝘦'. 𝘦' o 𝘦 ∧ 𝘗(SUBJ(𝘦)(𝘸))(𝘦')
const subjectSharingAdverbial = λ(['e', ['v', 't']], ['s'], c =>
	λ('v', c, c =>
		some('v', c, c =>
			and(
				coevent(v(0, c), v(1, c)),
				app(app(v(2, c), app(app(subject(c), v(1, c)), v(3, c))), v(0, c)),
			),
		),
	),
);

export const adjuncts: Partial<Record<SubjectType, Expr>> = {
	free: eventiveAdverbial,
	event: eventiveAdverbial,
	shape: eventiveAdverbial,
	agent: subjectSharingAdverbial,
	individual: subjectSharingAdverbial,
};

const conjunctionWords: Record<string, (left: Expr, right: Expr) => Expr> = {
	rú: and,
	rá: or,
};

const conjunctTypes: Partial<Record<Label, ExprType>> = {
	AdjunctP: ['v', 't'],
	CPrel: ['e', 't'],
	ΣP: 't',
};

export const clausalConjunctions: Partial<Record<Label, Record<string, Expr>>> =
	Object.fromEntries(
		Object.entries(conjunctTypes).map(([label, t]) => [
			label,
			Object.fromEntries(
				Object.entries(conjunctionWords).map(([toaq, conjoin]) => [
					toaq,
					// λ𝘗. λ𝘘. λ𝘦. 𝘘(𝘦) ∧ 𝘗(𝘦)
					reduce(
						lift(
							// λ𝘗. λ𝘘. 𝘘 ∧ 𝘗
							λ('t', [], c => λ('t', c, c => conjoin(v(0, c), v(1, c)))),
							[t, [t, t]],
						),
					),
				]),
			),
		]),
	);

const conjunctionValues: Partial<
	Record<CovertValue, (left: Expr, right: Expr) => Expr>
> = {
	'[and]': and,
	'[or]': or,
};

export const argumentConjunctions: Partial<Record<CovertValue, Expr>> =
	Object.fromEntries(
		Object.entries(conjunctionValues).map(([toaq, conjoin]) => [
			toaq,
			// λ𝘢. λ𝘣. λ𝘗. 𝘗(𝘣) ∧ 𝘗(𝘢)
			λ('e', ['e'], c =>
				λ('e', c, c =>
					λ(['e', 't'], c, c =>
						conjoin(app(v(0, c), v(1, c)), app(v(0, c), v(2, c))),
					),
				),
			),
		]),
	);

// λ𝘢. λ𝘣. a
export const argumentCoordinator = λ('e', ['e'], c => λ('e', c, c => v(2, c)));

// λ𝘢. λ𝘣. 𝘣 & 𝘢
export const pluralCoordinator = λ('e', [], c =>
	λ('e', c, c => roi(v(0, c), v(1, c))),
);

interface ModalWord {
	counterfactual: boolean;
	quantifier: typeof every;
}

const modalWords: Record<string, ModalWord> = {
	shê: { counterfactual: false, quantifier: every },
	dâı: { counterfactual: false, quantifier: some },
	âo: { counterfactual: true, quantifier: every },
	êa: { counterfactual: true, quantifier: some },
};

export const modals: Record<string, Expr> = Object.fromEntries(
	Object.entries(modalWords).map(([toaq, { counterfactual, quantifier }]) => [
		toaq,
		// λ𝘗 : ¬𝘗(𝘸). λ𝘘. ∀𝘸' : SHE(𝘸)(𝘸') ∧ 𝘗(𝘸'). 𝘘(𝘸')
		λ(
			['s', 't'],
			['s'],
			c =>
				λ(['s', 't'], c, c =>
					quantifier(
						's',
						c,
						c => app(v(1, c), v(0, c)),
						c => and(app(app(she(c), v(3, c)), v(0, c)), app(v(2, c), v(0, c))),
					),
				),
			counterfactual ? c => not(app(v(0, c), v(1, c))) : undefined,
		),
	]),
);

// P
export const covertCp = v(0, [['s', 't']]);

const nameVerbWords = ['mı', 'mıru'];

export const nameVerbs: Record<string, Expr> = Object.fromEntries(
	nameVerbWords.map(w => [
		w,
		// λ𝘢. λ𝘣. λ𝘦. mı.𝘸(𝘣, 𝘢)(𝘦)
		λ('e', ['s'], c =>
			λ('e', c, c =>
				λ('v', c, c => verb(w, [v(1, c), v(2, c)], v(0, c), v(3, c))),
			),
		),
	]),
);

// λ𝘢. λ𝘣. λ𝘦. eq.𝘸(𝘣, 𝘢)(𝘦)
export const quoteVerb = λ('e', ['s'], c =>
	λ('e', c, c =>
		λ('v', c, c => verb('eq', [v(1, c), v(2, c)], v(0, c), v(3, c))),
	),
);

// λ𝘗. λ𝘢. ∃𝘦 : 𝘦 = 𝘢. 𝘗(𝘦)
export const eventAccessor = λ(['v', 't'], [], c =>
	λ('e', c, c =>
		some(
			'v',
			c,
			c => app(v(2, c), v(0, c)),
			c => equals(v(0, c), v(1, c)),
		),
	),
);

const focusTypes: Partial<Record<Label, ExprType>> = {
	DP: 'e',
	AdjunctP: ['v', 't'],
};

export const focus: Partial<Record<Label, Expr>> = Object.fromEntries(
	Object.entries(focusTypes).map(([label, type]) => [
		label,
		// λ𝘗. a
		λ(type, [type], c => v(1, c)),
	]),
);

const nonContrastiveFocus = (type: ExprType) =>
	// λ𝘹. λ𝘗 : ∃𝘺. 𝘗(𝘺). 𝘗(𝘹)
	λ(type, [type], c =>
		λ(
			[type, 't'],
			c,
			c => app(v(0, c), v(1, c)),
			c => some(type, c, c => app(v(1, c), v(0, c))),
		),
	);

const contrastiveFocus = (type: ExprType) =>
	// λ𝘹. λ𝘗 : A(a)(𝘹)(𝘸) ∧ ∃𝘺. 𝘗(𝘺). 𝘗(𝘹) ∧ ¬𝘗(a)
	λ(type, [type, type, 's'], c =>
		λ(
			[type, 't'],
			c,
			c => and(app(v(0, c), v(1, c)), not(app(v(0, c), v(3, c)))),
			c =>
				and(
					app(app(app(alternative(type, c), v(3, c)), v(1, c)), v(4, c)),
					some(type, c, c => app(v(1, c), v(0, c))),
				),
		),
	);

const only = (type: ExprType) =>
	// λ𝘢. λ𝘗 : 𝘗(𝘢). ∀𝘣 : A(𝘣)(𝘢)(𝘸). ¬𝘗(𝘣)
	λ(type, [type, 's'], c =>
		λ(
			[type, 't'],
			c,
			c =>
				every(
					type,
					c,
					c => not(app(v(1, c), v(0, c))),
					c => app(app(app(alternative(type, c), v(0, c)), v(2, c)), v(4, c)),
				),
			c => app(v(0, c), v(1, c)),
		),
	);

const also = (type: ExprType) =>
	// λ𝘢. λ𝘗 : ∃𝘣 : A(𝘣)(𝘢)(𝘸). 𝘗(𝘣). 𝘗(𝘢)
	λ(type, [type, 's'], c =>
		λ(
			[type, 't'],
			c,
			c => app(v(0, c), v(1, c)),
			c =>
				some(
					type,
					c,
					c => app(v(1, c), v(0, c)),
					c => app(app(app(alternative(type, c), v(0, c)), v(2, c)), v(4, c)),
				),
		),
	);

const even = (type: ExprType) =>
	// λ𝘹. λ𝘗 : ∀𝘺 : A(𝘺)(𝘹)(𝘸). (∀𝘸' : LE(𝘸)(𝘸'). 𝘗(𝘹)(𝘸') → 𝘗(𝘺)(𝘸')) ∧ ¬∀𝘸' : LE(𝘸)(𝘸'). 𝘗(𝘺)(𝘸') → 𝘗(𝘹)(𝘸'). 𝘗(𝘹)(𝘸)
	λ(type, [type, 's'], c =>
		λ(
			[type, ['s', 't']],
			c,
			c => app(app(v(0, c), v(1, c)), v(3, c)),
			c =>
				every(
					type,
					c,
					// We want to express that the focus is less likely to satisfy the
					// predicate than any of its alternatives. □(A → B) says that the worlds in
					// which A holds are a subset of the worlds in which B holds, and we can
					// make them be a proper subset by adding the claim ¬□(B → A). So if □
					// refers to likelihood, we end up with "A is less likely than B".
					c =>
						and(
							every(
								's',
								c,
								c =>
									implies(
										app(app(v(2, c), v(3, c)), v(0, c)),
										app(app(v(2, c), v(1, c)), v(0, c)),
									),
								c => app(app(le(c), v(5, c)), v(0, c)),
							),
							not(
								every(
									's',
									c,
									c =>
										implies(
											app(app(v(2, c), v(1, c)), v(0, c)),
											app(app(v(2, c), v(3, c)), v(0, c)),
										),
									c => app(app(le(c), v(5, c)), v(0, c)),
								),
							),
						),
					c => app(app(app(alternative(type, c), v(0, c)), v(2, c)), v(4, c)),
				),
		),
	);

export const focusAdverbs: Partial<
	Record<Label, Partial<Record<CovertValue, Expr>>>
> = Object.fromEntries(
	Object.entries(focusTypes).map(([label, type]) => [
		label,
		{
			'[focus]': nonContrastiveFocus(type),
			'[focus+c]': contrastiveFocus(type),
			'[only]': only(type),
			'[also]': also(type),
			'[even]': even(type),
		},
	]),
);

// λ𝘗. λ𝘹. 𝘗(Topic(𝘹)(𝘸))
export const topic = λ(['s', 't'], ['s'], c =>
	λ('e', c, c => app(v(1, c), app(app(topicWorld(c), v(0, c)), v(2, c)))),
);
