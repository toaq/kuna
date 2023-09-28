import { VerbEntry } from '../dictionary';
import { Impossible, Unimplemented, Unrecognized } from '../error';
import { Branch, CovertValue, Leaf, StrictTree, Word } from '../tree';
import {
	after,
	afterNear,
	agent,
	ama,
	and,
	app,
	before,
	beforeNear,
	DTree,
	equals,
	every,
	expectedEnd,
	expectedStart,
	Expr,
	ExprType,
	ime,
	inertiaWorlds,
	ji,
	nhana,
	nhao,
	noBindings,
	presuppose,
	realWorld,
	Bindings,
	some,
	speechTime,
	subinterval,
	suna,
	suo,
	suq,
	temporalTrace,
	umo,
	v,
	verb,
	λ,
	animate,
	inanimate,
	abstract,
	typesEqual,
	AnimacyClass,
	not,
	everySing,
	everyCuml,
	gen,
	indeed,
} from './model';
import {
	bindTimeIntervals,
	filterPresuppositions,
	makeWorldExplicit,
	mapBindings,
	reduce,
	rewriteContext,
	someSubexpression,
	unifyDenotations,
} from './operations';

// 𝘢
const hoa = v(0, ['e']);

const hoaBindings: Bindings = {
	variable: {},
	animacy: {},
	head: {},
	resumptive: { index: 0, subordinate: false, timeIntervals: [] },
};

const covertHoaBindings: Bindings = {
	variable: {},
	animacy: {},
	head: {},
	covertResumptive: { index: 0, subordinate: false, timeIntervals: [] },
};

// 𝘢 | animate(𝘢)
const ho = presuppose(v(0, ['e']), app(animate(['e']), v(0, ['e'])));

const hoBindings: Bindings = {
	variable: {},
	animacy: { animate: { index: 0, subordinate: false, timeIntervals: [] } },
	head: {},
};

// 𝘢 | inanimate(𝘢)
const maq = presuppose(v(0, ['e']), app(inanimate(['e']), v(0, ['e'])));

const maqBindings: Bindings = {
	variable: {},
	animacy: { inanimate: { index: 0, subordinate: false, timeIntervals: [] } },
	head: {},
};

// 𝘢 | abstract(𝘢)
const hoq = presuppose(v(0, ['e']), app(abstract(['e']), v(0, ['e'])));

const hoqBindings: Bindings = {
	variable: {},
	animacy: { abstract: { index: 0, subordinate: false, timeIntervals: [] } },
	head: {},
};

// 𝘢
const ta = hoa;

const taBindings: Bindings = {
	variable: {},
	animacy: { descriptive: { index: 0, subordinate: false, timeIntervals: [] } },
	head: {},
};

// λ𝘗. λ𝘵. ∃𝘦. τ(𝘦) ⊆ 𝘵 ∧ 𝘗(𝘦)
const tam = λ(['v', 't'], [], c =>
	λ('i', c, c =>
		some('v', c, c =>
			and(
				subinterval(app(temporalTrace(c), v(0, c)), v(1, c)),
				app(v(2, c), v(0, c)),
			),
		),
	),
);

// λ𝘗. λ𝘵. ∀𝘸' : ɪᴡ(𝘸')(𝘸)(𝘵). ∃𝘦. 𝘵 ⊆ τ(𝘦) ∧ 𝘗(𝘦)(𝘸')
const chum = λ(['v', ['s', 't']], ['s'], c =>
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
);

// λ𝘗. λ𝘵. ∃𝘦. τ(𝘦) < 𝘵 ∧ 𝘗(𝘦)
const lui = λ(['v', 't'], [], c =>
	λ('i', c, c =>
		some('v', c, c =>
			and(
				before(app(temporalTrace(c), v(0, c)), v(1, c)),
				app(v(2, c), v(0, c)),
			),
		),
	),
);

// λ𝘗. λ𝘵. ∃𝘦. τ(𝘦) > 𝘵 ∧ 𝘗(𝘦)
const za = λ(['v', 't'], [], c =>
	λ('i', c, c =>
		some('v', c, c =>
			and(
				after(app(temporalTrace(c), v(0, c)), v(1, c)),
				app(v(2, c), v(0, c)),
			),
		),
	),
);

// λ𝘗. λ𝘵. ∃𝘦. 𝘵 ⊆ τ(𝘦) ∧ 𝘵 > ExpEnd(𝘦) ∧ 𝘗(𝘦)
const hoai = λ(['v', 't'], [], c =>
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
);

// λ𝘗. λ𝘵. ∃𝘦. 𝘵 ⊆ τ(𝘦) ∧ 𝘵 < ExpStart(𝘦) ∧ 𝘗(𝘦)
const hai = λ(['v', 't'], [], c =>
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
);

// λ𝘗. λ𝘵. ∃𝘦. τ(𝘦) <.near 𝘵 ∧ 𝘗(𝘦)
const hiq = λ(['v', 't'], [], c =>
	λ('i', c, c =>
		some('v', c, c =>
			and(
				beforeNear(app(temporalTrace(c), v(0, c)), v(1, c)),
				app(v(2, c), v(0, c)),
			),
		),
	),
);

// λ𝘗. λ𝘵. ∃𝘦. τ(𝘦) >.near 𝘵 ∧ 𝘗(𝘦)
const fi = λ(['v', 't'], [], c =>
	λ('i', c, c =>
		some('v', c, c =>
			and(
				afterNear(app(temporalTrace(c), v(0, c)), v(1, c)),
				app(v(2, c), v(0, c)),
			),
		),
	),
);

function denoteAspect(toaq: string): Expr {
	switch (toaq.replace(/-$/, '')) {
		case 'tam':
			return tam;
		case 'chum':
			return chum;
		case 'luı':
			return lui;
		case 'za':
			return za;
		case 'hoaı':
			return hoai;
		case 'haı':
			return hai;
		case 'hıq':
			return hiq;
		case 'fı':
			return fi;
		default:
			throw new Unrecognized(`aspect: ${toaq}`);
	}
}

// t
const defaultTense = v(0, ['i']);

// t | t ⊆ t0
const nai = presuppose(
	v(0, ['i']),
	subinterval(v(0, ['i']), speechTime(['i'])),
);

// t | t < t0
const pu = presuppose(v(0, ['i']), before(v(0, ['i']), speechTime(['i'])));

// t | t > t0
const jia = presuppose(v(0, ['i']), after(v(0, ['i']), speechTime(['i'])));

// t | t <.near t0
const pujui = presuppose(
	v(0, ['i']),
	beforeNear(v(0, ['i']), speechTime(['i'])),
);

// t | t >.near t0
const jiajui = presuppose(
	v(0, ['i']),
	afterNear(v(0, ['i']), speechTime(['i'])),
);

// λ𝘗. ∃𝘵. 𝘗(𝘵)
const sula = λ(['i', 't'], [], c => some('i', c, c => app(v(1, c), v(0, c))));

// λ𝘗. ∃𝘵 : 𝘵 < t0. 𝘗(𝘵)
const mala = λ(['i', 't'], [], c =>
	some(
		'i',
		c,
		c => app(v(1, c), v(0, c)),
		c => before(v(0, c), speechTime(c)),
	),
);

// λ𝘗. ∃𝘵 : 𝘵 > t0. 𝘗(𝘵)
const jela = λ(['i', 't'], [], c =>
	some(
		'i',
		c,
		c => app(v(1, c), v(0, c)),
		c => after(v(0, c), speechTime(c)),
	),
);

function denoteTense(toaq: string): Expr {
	switch (toaq.replace(/-$/, '')) {
		case 'naı':
			return nai;
		case 'pu':
			return pu;
		case 'jıa':
			return jia;
		case 'pujuı':
			return pujui;
		case 'jıajuı':
			return jiajui;
		case 'sula':
			return sula;
		case 'mala':
			return mala;
		case 'jela':
			return jela;
		default:
			throw new Unrecognized(`tense: ${toaq}`);
	}
}

// λ𝘗. ¬𝘗(𝘸)
const bu = λ(['s', 't'], ['s'], c => not(app(v(0, c), v(1, c))));

// λ𝘗. †𝘗(𝘸)
const jeo = λ(['s', 't'], ['s'], c => indeed(app(v(0, c), v(1, c))));

function denotePolarity(toaq: string): Expr {
	switch (toaq.replace(/-$/, '')) {
		case 'bu':
			return bu;
		case 'jeo':
			return jeo;
		default:
			throw new Unrecognized(`polarity: ${toaq}`);
	}
}

function denoteSpeechAct(toaq: string): string {
	switch (toaq) {
		case 'da':
			return 'ruaq';
		case 'ka':
			return 'karuaq';
		case 'ba':
			return 'baruaq';
		case 'nha':
			return 'nue';
		case 'doa':
			return 'shoe';
		case 'ꝡo':
			return 'zaru';
		case 'móq':
			return 'teqga';
		default:
			throw new Unrecognized(`speech act: ${toaq}`);
	}
}

function denoteVerb(toaq: string, arity: number): Expr {
	switch (arity) {
		case 1: // For the moment, pretend that all intranstive verbs are unaccusative
		case 2:
			return λ('e', ['s'], c =>
				λ('v', c, c => verb(toaq, [v(1, c)], v(0, c), v(2, c))),
			);
		case 3:
			return λ('e', ['s'], c =>
				λ('e', c, c =>
					λ('v', c, c => verb(toaq, [v(2, c), v(1, c)], v(0, c), v(3, c))),
				),
			);
		default:
			throw new Impossible(`Invalid verb arity: ${toaq} (${arity})`);
	}
}

// λ𝘗 : 𝘗(a). a
const boundThe = λ(
	['e', 't'],
	['e'],
	c => v(1, c),
	c => app(v(0, c), v(1, c)),
);

const boundTheBindings: Bindings = {
	variable: {},
	animacy: {},
	head: {},
	covertResumptive: { index: 0, subordinate: false, timeIntervals: [] },
};

// λ𝘢. λ𝘦. ᴀɢᴇɴᴛ(𝘦)(𝘸) = 𝘢
const littleVAgent = λ('e', ['s'], c =>
	λ('v', c, c => equals(app(app(agent(c), v(0, c)), v(2, c)), v(1, c))),
);

// λ𝘗. 𝘗
const na = λ(['e', 't'], [], c => v(0, c));

function denoteCovertLittleV(value: CovertValue): Expr | null {
	switch (value) {
		case 'CAUSE':
			return littleVAgent;
		case 'BE':
			return null;
		default:
			throw new Unrecognized(`𝘷: ${value}`);
	}
}

function denoteOvertLittleV(toaq: string): Expr {
	switch (toaq) {
		case 'nä':
			return na;
		default:
			throw new Unrecognized(`𝘷: ${toaq}`);
	}
}

function findVp(tree: StrictTree): StrictTree | null {
	if (tree.label === 'VP') {
		return tree;
	} else if ('word' in tree) {
		return null;
	} else {
		return findVp(tree.right) ?? findVp(tree.left);
	}
}

function animacyClass(verb: VerbEntry): AnimacyClass {
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

function denoteAnimacy(
	animacy: AnimacyClass,
): ((context: ExprType[]) => Expr) | null {
	switch (animacy) {
		case 'animate':
			return animate;
		case 'inanimate':
			return inanimate;
		case 'abstract':
			return abstract;
		case 'descriptive':
			return null;
	}
}

// λ𝘗. λ𝘘. ∃𝘢 : 𝘗(𝘢). 𝘘(𝘢)
const qSome = λ(['e', 't'], [], c =>
	λ(['e', 't'], c, c =>
		some(
			'e',
			c,
			c => app(v(1, c), v(0, c)),
			c => app(v(2, c), v(0, c)),
		),
	),
);

// λ𝘗. λ𝘘. ¬∃𝘢 : 𝘗(𝘢). 𝘘(𝘢)
const qNone = λ(['e', 't'], [], c =>
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
);

// λ𝘗. λ𝘘. ∀𝘢 : 𝘗(𝘢). 𝘘(𝘢)
const qEvery = λ(['e', 't'], [], c =>
	λ(['e', 't'], c, c =>
		every(
			'e',
			c,
			c => app(v(1, c), v(0, c)),
			c => app(v(2, c), v(0, c)),
		),
	),
);

// λ𝘗. λ𝘘. ∀.SING 𝘢 : 𝘗(𝘢). 𝘘(𝘢)
const qEach = λ(['e', 't'], [], c =>
	λ(['e', 't'], c, c =>
		everySing(
			'e',
			c,
			c => app(v(1, c), v(0, c)),
			c => app(v(2, c), v(0, c)),
		),
	),
);

// λ𝘗. λ𝘘. ∀.CUML 𝘢 : 𝘗(𝘢). 𝘘(𝘢)
const qAll = λ(['e', 't'], [], c =>
	λ(['e', 't'], c, c =>
		everyCuml(
			'e',
			c,
			c => app(v(1, c), v(0, c)),
			c => app(v(2, c), v(0, c)),
		),
	),
);

// λ𝘗. λ𝘘. GEN 𝘢 : 𝘗(𝘢). 𝘘(𝘢)
const qGen = λ(['e', 't'], [], c =>
	λ(['e', 't'], c, c =>
		gen(
			'e',
			c,
			c => app(v(1, c), v(0, c)),
			c => app(v(2, c), v(0, c)),
		),
	),
);

// λ𝘗 : 𝘗(a). λ𝘘. 𝘘(a) | ¬∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)
const qExo = presuppose(
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
);

// λ𝘗 : 𝘗(a). λ𝘘. 𝘘(a) | ∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)
const qEndo = presuppose(
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
);

// λ𝘗 : 𝘗(a). λ𝘘. 𝘘(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦)
const qDem = presuppose(
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
);

// λ𝘗 : 𝘗(a). λ𝘘. 𝘘(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ tıjuı.w(a, jí)(𝘦)
const qProx = presuppose(
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
);

// λ𝘗 : 𝘗(a). λ𝘘. 𝘘(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ tıjao.w(a, jí)(𝘦)
const qDist = presuppose(
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
);

function denoteQuantifier(value: CovertValue): Expr {
	switch (value) {
		case '∃':
			return qSome;
		case '¬∃':
			return qNone;
		case '∀':
			return qEvery;
		case '∀.SING':
			return qEach;
		case '∀.CUML':
			return qAll;
		case 'GEN':
			return qGen;
		case 'EXO':
			return qExo;
		case 'ENDO':
			return qEndo;
		case 'DEM':
			return qDem;
		case 'PROX':
			return qProx;
		case 'DIST':
			return qDist;
		default:
			throw new Unrecognized(`quantifier: ${value}`);
	}
}

// λ𝘗. 𝘗
const nWithoutPresupposition = λ(['e', 't'], ['e'], c => v(0, c));

function denoteLeaf(leaf: Leaf, cCommand: StrictTree | null): DTree {
	let denotation: Expr | null;
	let bindings = noBindings;

	if (leaf.label === 'V') {
		if (leaf.word.covert) throw new Impossible('covert V');
		const entry = leaf.word.entry;
		if (!entry) throw new Unrecognized('verb: ' + leaf.word.text);
		if (entry.type !== 'predicate') throw new Impossible('non-predicate V');

		denotation = denoteVerb(entry.toaq, entry.frame.split(' ').length);
	} else if (leaf.label === 'DP') {
		if (leaf.word.covert) {
			denotation = hoa;
			bindings = covertHoaBindings;
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`DP: ${leaf.word.text}`);
		} else {
			const toaq = leaf.word.entry.toaq;

			switch (toaq) {
				case 'jí':
					denotation = ji([]);
					break;
				case 'súq':
					denotation = suq([]);
					break;
				case 'nháo':
					denotation = nhao([]);
					break;
				case 'súna':
					denotation = suna([]);
					break;
				case 'nhána':
					denotation = nhana([]);
					break;
				case 'úmo':
					denotation = umo([]);
					break;
				case 'íme':
					denotation = ime([]);
					break;
				case 'súo':
					denotation = suo([]);
					break;
				case 'áma':
					denotation = ama([]);
					break;
				case 'hóa':
					denotation = hoa;
					bindings = hoaBindings;
					break;
				case 'hó':
					denotation = ho;
					bindings = hoBindings;
					break;
				case 'máq':
					denotation = maq;
					bindings = maqBindings;
					break;
				case 'hóq':
					denotation = hoq;
					bindings = hoqBindings;
					break;
				case 'tá':
					denotation = ta;
					bindings = taBindings;
					break;
				default:
					throw new Unrecognized(`DP: ${toaq}`);
			}
		}
	} else if (leaf.label === 'D') {
		denotation = boundThe;
		bindings = boundTheBindings;
	} else if (leaf.label === '𝘯') {
		if (cCommand === null)
			throw new Impossible("Can't denote an 𝘯 in isolation");
		const vp = findVp(cCommand);
		if (vp === null) throw new Impossible("Can't find the VP for this 𝘯");

		let word: Word;
		if ('word' in vp) {
			word = vp.word as Word;
		} else {
			const v = vp.left;
			if (v.label !== 'V' || !('word' in v))
				throw new Impossible('Unrecognized VP shape');
			word = v.word as Word;
		}

		const animacy = animacyClass(word.entry as VerbEntry);
		const animacyPredicate = denoteAnimacy(animacy);

		if (animacyPredicate === null) {
			denotation = nWithoutPresupposition;
		} else {
			denotation = λ(
				['e', 't'],
				['e'],
				c => v(0, c),
				c => app(animacyPredicate(c), v(1, c)),
			);
		}

		const binding = { index: 0, subordinate: false, timeIntervals: [] };
		bindings = {
			variable: { [(word.entry as VerbEntry).toaq]: binding },
			animacy: { [animacy]: binding },
			head: {},
			covertResumptive: binding,
		};
	} else if (leaf.label === '𝘷') {
		if (leaf.word.covert) {
			denotation = denoteCovertLittleV(leaf.word.value);
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`𝘷: ${leaf.word.text}`);
		} else {
			denotation = denoteOvertLittleV(leaf.word.entry.toaq);
		}
	} else if (leaf.label === 'Asp') {
		let toaq: string;
		if (leaf.word.covert) {
			toaq = 'tam';
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`Asp: ${leaf.word.text}`);
		} else {
			toaq = leaf.word.entry.toaq;
		}

		denotation = denoteAspect(toaq);
	} else if (leaf.label === 'T') {
		if (leaf.word.covert) {
			denotation = defaultTense;
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`T: ${leaf.word.text}`);
		} else {
			denotation = denoteTense(leaf.word.entry.toaq);
		}
	} else if (leaf.label === 'Σ') {
		if (leaf.word.covert) throw new Impossible('Covert Σ');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`Σ: ${leaf.word.text}`);
		denotation = denotePolarity(leaf.word.entry.toaq);
	} else if (leaf.label === 'C' || leaf.label === 'Crel') {
		denotation = null;
	} else if (leaf.label === 'SA') {
		let toaq: string;
		if (leaf.word.covert) {
			toaq = 'da'; // TODO: covert móq
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`SA: ${leaf.word.text}`);
		} else {
			toaq = leaf.word.entry.toaq;
		}

		denotation = λ(['s', 't'], [], c =>
			some('v', c, c =>
				and(
					subinterval(app(temporalTrace(c), v(0, c)), speechTime(c)),
					and(
						equals(app(app(agent(c), v(0, c)), realWorld(c)), ji(c)),
						verb(denoteSpeechAct(toaq), [v(1, c)], v(0, c), realWorld(c)),
					),
				),
			),
		);
	} else if (leaf.label === 'Q') {
		if (!leaf.word.covert) {
			throw new Impossible(`Overt Q: ${leaf.word.text}`);
		}
		denotation = denoteQuantifier(leaf.word.value);
	} else {
		throw new Unimplemented(`TODO: ${leaf.label}`);
	}

	return { ...leaf, denotation, bindings };
}

type CompositionRule = (
	branch: Branch<StrictTree>,
	left: DTree,
	right: DTree,
) => DTree;

function functionalApplication_(
	branch: Branch<StrictTree>,
	left: DTree,
	right: DTree,
	fn: DTree,
	argument: DTree,
): DTree {
	let denotation: Expr | null;
	let bindings: Bindings;

	if (fn.denotation === null) {
		({ denotation, bindings } = argument);
	} else if (argument.denotation === null) {
		({ denotation, bindings } = fn);
	} else {
		const compatibleArgument = typesEqual(
			(fn.denotation.type as [ExprType, ExprType])[0],
			argument.denotation.type,
		)
			? argument
			: makeWorldExplicit(argument);
		const [l, r, b] =
			fn === left
				? unifyDenotations(fn, compatibleArgument)
				: unifyDenotations(compatibleArgument, fn);
		denotation = reduce(fn === left ? app(l, r) : app(r, l));
		bindings = b;
	}

	return { ...branch, left, right, denotation, bindings };
}

const functionalApplication: CompositionRule = (branch, left, right) =>
	functionalApplication_(branch, left, right, left, right);

const reverseFunctionalApplication: CompositionRule = (branch, left, right) =>
	functionalApplication_(branch, left, right, right, left);

// λ𝘗. λ𝘘. λ𝘢. λ𝘦. 𝘗(𝘢)(𝘦) ∧ 𝘘(𝘦)
const eventIdentificationTemplate = (context: ExprType[]) =>
	λ(['e', ['v', 't']], context, c =>
		λ(['v', 't'], c, c =>
			λ('e', c, c =>
				λ('v', c, c =>
					and(app(app(v(3, c), v(1, c)), v(0, c)), app(v(2, c), v(0, c))),
				),
			),
		),
	);

// λ𝘗. λ𝘢. λ𝘦. 𝘗(𝘦)
const eventIdentificationRightOnlyTemplate = (context: ExprType[]) =>
	λ(['v', 't'], context, c =>
		λ('e', c, c => λ('v', c, c => app(v(2, c), v(0, c)))),
	);

const eventIdentification: CompositionRule = (branch, left, right) => {
	let denotation: Expr | null;
	let bindings: Bindings;

	if (left.denotation === null) {
		denotation =
			right.denotation === null
				? null
				: reduce(
						app(
							eventIdentificationRightOnlyTemplate(right.denotation.context),
							right.denotation,
						),
				  );
		bindings = right.bindings;
	} else if (right.denotation === null) {
		({ denotation, bindings } = left);
	} else {
		const [l, r, b] = unifyDenotations(left, right);
		denotation = reduce(app(app(eventIdentificationTemplate(l.context), l), r));
		bindings = b;
	}

	return { ...branch, left, right, denotation, bindings };
};

// λ𝘗. λ𝘘. λ𝘢. 𝘗(𝘢) ∧ 𝘘(𝘢)
const predicateModificationTemplate = (context: ExprType[]) =>
	λ(['e', 't'], context, c =>
		λ(['e', 't'], c, c =>
			λ('e', c, c => and(app(v(2, c), v(0, c)), app(v(1, c), v(0, c)))),
		),
	);

const predicateModification: CompositionRule = (branch, left, right) => {
	let denotation: Expr | null;
	let bindings: Bindings;

	if (left.denotation === null) {
		({ denotation, bindings } = right);
	} else if (right.denotation === null) {
		({ denotation, bindings } = left);
	} else {
		const [l, r, b] = unifyDenotations(left, right);
		denotation = reduce(
			app(app(predicateModificationTemplate(l.context), l), r),
		);
		bindings = b;
	}

	return { ...branch, left, right, denotation, bindings };
};

const cComposition: CompositionRule = (branch, left, right) => {
	if (right.denotation === null) {
		throw new Impossible(`C composition on a null ${right.label}`);
	} else {
		const worldIndex = right.denotation.context.findIndex(t => t === 's');
		if (worldIndex === -1)
			throw new Impossible(
				`C composition on something without a world variable`,
			);

		const newContext = [...right.denotation.context];
		newContext.splice(worldIndex, 1);
		const indexMapping = (i: number) =>
			i === worldIndex ? 0 : i < worldIndex ? i + 1 : i;

		return {
			...branch,
			left,
			right,
			denotation: reduce(
				λ('s', newContext, c =>
					rewriteContext(right.denotation!, c, indexMapping),
				),
			),
			bindings: mapBindings(right.bindings, b => ({
				index: indexMapping(b.index),
				subordinate: true,
				timeIntervals: b.timeIntervals.map(indexMapping),
			})),
		};
	}
};

const cRelComposition: CompositionRule = (branch, left, right) => {
	if (right.denotation === null) {
		throw new Impossible(`Crel composition on a null ${right.label}`);
	} else {
		const hoa = right.bindings.resumptive ?? right.bindings.covertResumptive;
		if (hoa === undefined) {
			return {
				...branch,
				left,
				right,
				denotation: reduce(
					λ('e', right.denotation.context, c =>
						rewriteContext(right.denotation!, c, i => i + 1),
					),
				),
				bindings: mapBindings(right.bindings, b => ({
					...b,
					subordinate: true,
				})),
			};
		} else {
			const newContext = [...right.denotation.context];
			newContext.splice(hoa.index, 1);
			const indexMapping = (i: number) => (i > hoa.index ? i - 1 : i);

			return {
				...branch,
				left,
				right,
				denotation: reduce(
					λ('e', newContext, c =>
						rewriteContext(right.denotation!, c, i =>
							i === hoa.index ? 0 : indexMapping(i) + 1,
						),
					),
				),
				bindings: mapBindings(right.bindings, b =>
					b.index === hoa.index
						? undefined
						: {
								index: indexMapping(b.index),
								subordinate: true,
								timeIntervals: b.timeIntervals.map(indexMapping),
						  },
				),
			};
		}
	}
};

const nComposition: CompositionRule = (branch, left, right) => {
	if (left.denotation === null) {
		throw new Impossible(`𝘯 composition on a null ${left.label}`);
	} else if (right.denotation === null) {
		throw new Impossible(`𝘯 composition on a null ${right.label}`);
	} else {
		const [n, cpRel, bindings] = unifyDenotations(left, right);
		if (bindings.covertResumptive === undefined)
			throw new Impossible("𝘯 doesn't create a binding");
		const index = bindings.covertResumptive.index;

		return {
			...branch,
			left,
			right,
			denotation: reduce(app(n, cpRel)),
			// Associate all new time interval variables with this binding
			bindings: bindTimeIntervals(cpRel, bindings, index),
		};
	}
};

const dComposition: CompositionRule = (branch, left, right) => {
	if (left.denotation === null) {
		throw new Impossible(`D composition on a null ${left.label}`);
	} else if (right.denotation === null) {
		throw new Impossible(`D composition on a null ${right.label}`);
	} else {
		// Because unifyDenotations is heuristic and asymmetric, and 𝘯P will have more
		// binding information than D, we need to pretend that nP is on the left here
		const [np, d, bindings] = unifyDenotations(right, left);
		if (bindings.covertResumptive === undefined)
			throw new Impossible("𝘯P doesn't create a binding");
		const index = bindings.covertResumptive.index;
		// Delete the covert resumptive binding as it was only needed to perform this
		// composition and should not leak outside the DP
		bindings.covertResumptive = undefined;

		return {
			...branch,
			left,
			right,
			denotation: reduce(app(d, np)),
			// Associate all new time interval variables with this binding
			bindings: bindTimeIntervals(np, bindings, index),
		};
	}
};

const qComposition: CompositionRule = (branch, left, right) => {
	if (left.denotation === null) {
		throw new Impossible(`Q composition on a null ${left.label}`);
	} else if (right.denotation === null) {
		throw new Impossible(`Q composition on a null ${right.label}`);
	} else {
		const [l, r, bindings] = unifyDenotations(left, right);
		// Drop all references to the bindings originating in 𝘯
		if (bindings.covertResumptive === undefined)
			throw new Impossible("Can't identify the references to be dropped");
		const index = bindings.covertResumptive.index;
		const rPruned = filterPresuppositions(
			r,
			p =>
				!someSubexpression(p, e => e.head === 'variable' && e.index === index),
		);

		return {
			...branch,
			left,
			right,
			denotation: reduce(app(l, rPruned)),
			// Associate all new time interval variables with this binding
			bindings: bindTimeIntervals(r, bindings, index),
		};
	}
};

const predicateAbstraction: CompositionRule = (branch, left, right) => {
	if (left.denotation === null) {
		throw new Impossible(`Predicate abstraction on a null ${left.label}`);
	} else if (right.denotation === null) {
		throw new Impossible(`Predicate abstraction on a null ${right.label}`);
	} else {
		const [l, r, bindings] = unifyDenotations(left, right);
		if (bindings.covertResumptive === undefined)
			throw new Impossible("Can't identify the variable to be abstracted");
		const index = bindings.covertResumptive.index;

		// Remove the abstracted binding from the final denotation
		const newContext = [...r.context];
		newContext.splice(index, 1);
		const indexMapping = (i: number) => {
			if (i === index)
				throw new Impossible('Abstracted variable is still used');
			return i > index ? i - 1 : i;
		};

		return {
			...branch,
			left,
			right,
			denotation: reduce(
				app(
					rewriteContext(l, newContext, indexMapping),
					λ('e', newContext, c =>
						rewriteContext(r, c, i =>
							i === index ? 0 : i > index ? i : i + 1,
						),
					),
				),
			),
			bindings: mapBindings(bindings, b =>
				b.index === index
					? undefined
					: {
							index: indexMapping(b.index),
							subordinate: b.subordinate,
							timeIntervals: b.timeIntervals.map(indexMapping),
					  },
			),
		};
	}
};

function getCompositionRule(left: DTree, right: DTree): CompositionRule {
	switch (left.label) {
		case 'V':
		case 'Asp':
		case 'Σ':
			return functionalApplication;
		case 'T':
			// Existential tenses use FA, while pronomial tenses use reverse FA
			return Array.isArray(left.denotation?.type)
				? functionalApplication
				: reverseFunctionalApplication;
		case '𝘷':
			return left.denotation !== null &&
				typesEqual(left.denotation.type, ['e', ['v', 't']])
				? eventIdentification
				: functionalApplication;
		case 'C':
			return cComposition;
		case 'Crel':
			return cRelComposition;
		case '𝘯':
			return nComposition;
		case 'D':
			return dComposition;
		case 'Q':
			return qComposition;
		case 'QP':
			return predicateAbstraction;
	}

	switch (right.label) {
		case "𝘷'":
		case 'SA':
		case "V'":
			return reverseFunctionalApplication;
		case 'CPrel':
			return predicateModification;
	}

	throw new Unimplemented(
		`TODO: composition of ${left.label} and ${right.label}`,
	);
}

function denoteBranch(
	branch: Branch<StrictTree>,
	left: DTree,
	right: DTree,
): DTree {
	return getCompositionRule(left, right)(branch, left, right);
}

export function denote_(tree: StrictTree, cCommand: StrictTree | null): DTree {
	if ('word' in tree) {
		return denoteLeaf(tree, cCommand);
	} else {
		const left = denote_(tree.left, tree.right);
		const right = denote_(tree.right, tree.left);
		return denoteBranch(tree, left, right);
	}
}

/**
 * Annotates a tree with denotations.
 */
export function denote(tree: StrictTree): DTree {
	return denote_(tree, null);
}
