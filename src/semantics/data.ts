import { Unrecognized } from '../error';
import { CovertValue } from '../tree';
import {
	after,
	afterNear,
	agent,
	and,
	app,
	before,
	beforeNear,
	equals,
	every,
	expectedEnd,
	expectedStart,
	Expr,
	ExprType,
	inertiaWorlds,
	ji,
	presuppose,
	realWorld,
	Bindings,
	some,
	speechTime,
	subinterval,
	temporalTrace,
	v,
	verb,
	λ,
	animate,
	inanimate,
	abstract,
	AnimacyClass,
	not,
	everySing,
	everyCuml,
	gen,
	indeed,
	noBindings,
	suq,
	nhao,
	suna,
	nhana,
	umo,
	ime,
	suo,
	ama,
} from './model';

const hoa = v(0, ['e']);

export const covertHoaBindings: Bindings = {
	variable: {},
	animacy: {},
	head: {},
	covertResumptive: { index: 0, subordinate: false, timeIntervals: [] },
};

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
			variable: {},
			animacy: {},
			head: {},
			resumptive: { index: 0, subordinate: false, timeIntervals: [] },
		},
	],
	// 𝘢 | animate(𝘢)
	hó: [
		presuppose(v(0, ['e']), app(animate(['e']), v(0, ['e']))),
		{
			variable: {},
			animacy: { animate: { index: 0, subordinate: false, timeIntervals: [] } },
			head: {},
		},
	],
	// 𝘢 | inanimate(𝘢)
	máq: [
		presuppose(v(0, ['e']), app(inanimate(['e']), v(0, ['e']))),
		{
			variable: {},
			animacy: {
				inanimate: { index: 0, subordinate: false, timeIntervals: [] },
			},
			head: {},
		},
	],
	// 𝘢 | abstract(𝘢)
	hóq: [
		presuppose(v(0, ['e']), app(abstract(['e']), v(0, ['e']))),
		{
			variable: {},
			animacy: {
				abstract: { index: 0, subordinate: false, timeIntervals: [] },
			},
			head: {},
		},
	],
	// 𝘢
	tá: [
		hoa,
		{
			variable: {},
			animacy: {
				descriptive: { index: 0, subordinate: false, timeIntervals: [] },
			},
			head: {},
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
	// λ𝘗. ¬𝘗(𝘸)
	bu: λ(['s', 't'], ['s'], c => not(app(v(0, c), v(1, c)))),
	// λ𝘗. †𝘗(𝘸)
	jeo: λ(['s', 't'], ['s'], c => indeed(app(v(0, c), v(1, c)))),
};

const speechActVerbs: Record<string, string> = {
	da: 'ruaq',
	ka: 'karuaq',
	ba: 'baruaq',
	nha: 'nue',
	doa: 'shoe',
	ꝡo: 'zaru',
	móq: 'teqga',
};

export const speechActs: Record<string, Expr> = Object.fromEntries(
	Object.entries(speechActVerbs).map(
		([toaq, verb_]) =>
			[
				toaq,
				λ(['s', 't'], [], c =>
					some('v', c, c =>
						and(
							subinterval(app(temporalTrace(c), v(0, c)), speechTime(c)),
							and(
								equals(app(app(agent(c), v(0, c)), realWorld(c)), ji(c)),
								verb(verb_, [v(1, c)], v(0, c), realWorld(c)),
							),
						),
					),
				),
			] as [string, Expr],
	),
);

// λ𝘗 : 𝘗(a). a
export const boundThe = λ(
	['e', 't'],
	['e'],
	c => v(1, c),
	c => app(v(0, c), v(1, c)),
);

export const boundTheBindings: Bindings = {
	variable: {},
	animacy: {},
	head: {},
	covertResumptive: { index: 0, subordinate: false, timeIntervals: [] },
};

export const covertLittleVs: Partial<Record<CovertValue, Expr | null>> = {
	// λ𝘢. λ𝘦. ᴀɢᴇɴᴛ(𝘦)(𝘸) = 𝘢
	CAUSE: λ('e', ['s'], c =>
		λ('v', c, c => equals(app(app(agent(c), v(0, c)), v(2, c)), v(1, c))),
	),
	BE: null,
};

export const overtLittleVs: Record<string, Expr> = {
	// λ𝘗. 𝘗
	nä: λ(['e', 't'], [], c => v(0, c)),
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
					? λ(['e', 't'], ['e'], c => v(0, c))
					: λ(
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