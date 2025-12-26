import {
	Impossible,
	Ungrammatical,
	Unimplemented,
	Unrecognized,
} from '../core/error';
import { splitNonEmpty } from '../core/misc';
import type { VerbEntry } from '../morphology/dictionary';
import { Tone, inTone } from '../morphology/tone';
import { getFrame } from '../syntax/frame';
import { getDistribution } from '../syntax/serial';
import {
	type CovertWord,
	type Leaf,
	type StrictTree,
	type Word,
	assertLeaf,
	effectiveLabel,
	getLeaf,
} from '../tree';
import { compose } from './compose';
import {
	adjuncts,
	aspects,
	clausalConjunctions,
	cleftVerb,
	conditionals,
	covertComplementizers,
	covertCp,
	covertV,
	determiners,
	distributiveLittleV,
	eventAccessor,
	knownVerbs,
	littleNs,
	nondistributiveLittleV,
	overtComplementizers,
	pluralCoordinator,
	polarities,
	pro,
	pronominalTenses,
	pronouns,
	quantifiers,
	serialFrames,
	speechActParticles,
	subjectSharingAdverbial,
	tenses,
	wrapInBindings,
} from './data';
import {
	Act,
	Bind,
	Cont,
	Dx,
	Fn,
	Indef,
	Int,
	Pl,
	Qn,
	address,
	app,
	ask,
	assertFn,
	assertInt,
	bg,
	bind,
	empathize,
	int,
	lex,
	quote,
	ref,
	topic,
	uncont,
	unindef,
	unint,
	unit,
	v,
	λ,
} from './model';
import { reduce } from './reduce';
import { typeToPlainText } from './render';
import {
	findEffect,
	getBigFunctorUntil,
	getFunctor,
	idFunctor,
	unwrapEffects,
} from './structures';
import {
	type DETree,
	type DTree,
	type ETree,
	type Expr,
	type ExprType,
	getErrors,
} from './types';

function findVp(tree: StrictTree): StrictTree | null {
	if (
		tree.label === 'VP' ||
		(tree.label === 'CP' &&
			'left' in tree &&
			tree.left.label === 'C' &&
			('left' in tree.left || !tree.left.word.covert)) ||
		tree.label === 'EvAP' ||
		tree.label === 'mıP' ||
		tree.label === 'shuP' ||
		tree.label === 'moP'
	)
		return tree;
	if ('word' in tree) return null;
	return findVp(tree.left) ?? findVp(tree.right);
}

function getVerbWord_(verb: StrictTree): Word | CovertWord {
	switch (verb.label) {
		case 'V':
		case 'C':
		case 'EvA':
		case 'VP':
			return getVerbWord(verb);
		case 'mıP':
			if ('word' in verb || !('word' in verb.right))
				throw new Unrecognized('mıP shape');
			return verb.right.word;
		case 'shuP':
		case 'moP':
			if ('word' in verb || !('word' in verb.left))
				throw new Unrecognized(`${verb.label} shape`);
			if (verb.left.word.covert)
				throw new Impossible(`Covert ${verb.left.label}`);
			return verb.left.word;
		case 'buP':
		case 'muP':
		case 'geP':
		case 'buqP':
		case 'TelicityP':
			if ('word' in verb) throw new Unrecognized(`${verb.label} shape`);
			return getVerbWord_(verb.right);
		default:
			throw new Unrecognized('VP shape');
	}
}

function getVerbWord(vp: StrictTree): Word | CovertWord {
	if ('word' in vp) return vp.word;
	if (vp.label === 'mıP' || vp.label === 'shuP' || vp.label === 'moP')
		return getVerbWord_(vp);
	return getVerbWord_(vp.left);
}

function incorpObject_(
	type: ExprType,
	relVar: number,
	objectVar: number,
	objectType: ExprType,
	worldVar: number,
	applyArgs: (e: Expr) => Expr,
): Expr {
	assertFn(type);
	if (typeof type.range === 'object' && type.range.head === 'fn')
		return λ(type.domain, arg =>
			incorpObject_(type.range, relVar, objectVar, objectType, worldVar, e =>
				app(applyArgs(e), v(arg)),
			),
		);

	return app(
		unint(
			app(
				uncont(v(objectVar)),
				λ(objectType, obj =>
					int(
						λ('s', w =>
							λ(type.domain, arg =>
								app(
									applyArgs(app(app(unint(v(relVar)), v(w)), v(obj))),
									v(arg),
								),
							),
						),
					),
				),
			),
		),
		v(worldVar),
	);
}

function incorpObject(e: Expr): Expr {
	const functor =
		getBigFunctorUntil(
			e.type,
			t =>
				typeof t === 'object' &&
				t.head === 'int' &&
				typeof t.inner === 'object' &&
				t.inner.head === 'fn',
		) ?? idFunctor;
	const inner = functor.unwrap(e.type);
	assertInt(inner);
	assertFn(inner.inner);
	const { domain, range } = inner.inner;
	return functor.map(
		() =>
			λ(inner, rel =>
				λ(Cont(domain), object =>
					int(
						λ('s', w => incorpObject_(range, rel, object, domain, w, e => e)),
					),
				),
			),
		() => e,
		e.type,
		functor.wrap(Fn(Cont(domain), Int(range)), e.type),
	);
}

function isIncorpObject(tree: StrictTree): boolean {
	if ('word' in tree) {
		if (tree.label !== 'D' && tree.label !== 'DP')
			throw new Impossible("Couldn't find the object's determiner");
		return (
			!tree.word.covert &&
			(tree.word.tone === Tone.T4 ||
				tree.word.entry?.type === 'determiner prefix form')
		);
	}
	return (
		tree.label !== "&'" &&
		isIncorpObject(tree.label === 'FocusP' ? tree.right : tree.left)
	);
}

function maybeIncorpObject(
	verb: Expr,
	entry: VerbEntry,
	object: StrictTree | null,
): Expr {
	return entry.type === 'predicatizer' ||
		(object !== null && isIncorpObject(object))
		? incorpObject(verb)
		: verb;
}

function findIndef(
	t: ExprType,
): (ExprType & object & { head: 'indef' }) | null {
	if (typeof t === 'string') return null;
	if (t.head === 'indef') return t;
	const functor = getFunctor(t);
	return functor && findIndef(functor.unwrap(t));
}

function denoteLeaf(leaf: Leaf, cCommand: DTree | null): Expr {
	if (leaf.label === 'V' || leaf.label === 'VP') {
		if (leaf.word.covert) return covertV;

		const entry = leaf.word.entry;
		if (!entry) throw new Unrecognized(`verb: ${leaf.word.text}`);
		if (entry.type !== 'predicate' && entry.type !== 'predicatizer')
			throw new Impossible('non-predicate V');

		const data = knownVerbs.get(entry.toaq);
		if (data !== undefined) return maybeIncorpObject(data, entry, cCommand);

		let arity = splitNonEmpty(getFrame(leaf), ' ').length;
		// In case we don't have lexical data on this word, make sure we're at least
		// providing the minimum number of arguments
		if (leaf.label === 'V') arity = Math.max(1, arity);
		const distribution = splitNonEmpty(getDistribution(leaf), ' ');

		let type = Fn('v', 't');
		for (let i = 0; i < arity; i++)
			type = Fn(
				distribution[distribution.length - arity + i] === 'd' ? 'e' : Pl('e'),
				type,
			);
		type = Int(type);
		const verb = lex(entry.toaq, type);

		// If the complement is a 𝘷P, serialize with it
		if (cCommand?.label === '𝘷P' && leaf.word.entry !== undefined) {
			if (entry.type !== 'predicate')
				throw new Impossible(`Serializing ${leaf.word.entry.type}`);
			const data = serialFrames.get(entry.frame);
			if (data === undefined)
				throw new Unimplemented(`Serial frame (${entry.frame})`);
			return data(verb);
		}

		return maybeIncorpObject(verb, entry, cCommand);
	}

	if (leaf.label === '𝘷') {
		if (cCommand === null) throw new Impossible("Can't denote 𝘷 in isolation");

		if (leaf.word.covert) {
			const type = unwrapEffects(cCommand.denotation.type);
			assertFn(type);
			if (leaf.word.value === '∅') return unit;
			if (
				typeof type.domain === 'object' &&
				type.domain.head === 'pl' &&
				type.domain.inner === 'e'
			)
				return nondistributiveLittleV(cCommand.denotation.type);
			if (type.domain === 'e')
				return distributiveLittleV(cCommand.denotation.type);
			throw new Unrecognized(`𝘷 for type ${typeToPlainText(type)}`);
		}

		if (leaf.word.entry?.toaq === 'nä')
			switch (effectiveLabel(cCommand)) {
				case "Cond'":
				case 'AdjunctP':
					return unit;
				case 'DP':
					return cleftVerb;
			}
		throw new Unrecognized(`𝘷: ${leaf.word.entry?.toaq ?? leaf.word.text}`);
	}

	if (leaf.label === 'DP') {
		if (leaf.word.covert) return pro;
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`DP: ${leaf.word.text}`);

		const toaq = inTone(leaf.word.entry.toaq.replace(/-$/, ''), Tone.T2);

		const data = pronouns.get(toaq);
		if (data === undefined) throw new Unrecognized(`DP: ${toaq}`);
		return data;
	}

	if (leaf.label === 'Asp') {
		let toaq: string;
		if (leaf.word.covert) toaq = 'tam';
		else if (leaf.word.entry === undefined)
			throw new Unrecognized(`Asp: ${leaf.word.text}`);
		else toaq = leaf.word.entry.toaq.replace(/-$/, '');

		// TODO: chum will need a different type
		return (
			aspects.get(toaq) ??
			lex(toaq, Int(Fn(Fn('v', 't'), Fn('i', Fn('v', 't')))))
		);
	}

	if (leaf.label === 'T') {
		let toaq: string;
		if (leaf.word.covert) toaq = 'tuom';
		else if (leaf.word.entry === undefined)
			throw new Unrecognized(`T: ${leaf.word.text}`);
		else toaq = leaf.word.entry.toaq.replace(/-$/, '');

		return (
			tenses.get(toaq) ??
			lex(
				toaq,
				toaq === 'sula'
					? Fn(Fn('i', Fn('v', 't')), Fn('v', 't'))
					: Dx(
							pronominalTenses.has(toaq)
								? 'i'
								: Fn(Fn('i', Fn('v', 't')), Fn('v', 't')),
						),
			)
		);
	}

	if (leaf.label === 'Σ') {
		let toaq: string;
		if (leaf.word.covert) toaq = 'jeo';
		else if (leaf.word.entry === undefined)
			throw new Unrecognized(`Σ: ${leaf.word.text}`);
		else toaq = leaf.word.entry.toaq.replace(/-$/, '');

		const data = polarities.get(toaq);
		if (data === undefined) throw new Unrecognized(`Σ: ${toaq}`);
		return data;
	}

	if (leaf.label === 'D') {
		if (leaf.word.covert) throw new Impossible('Covert D');
		if (cCommand === null)
			throw new Impossible('Cannot denote a D in isolation');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`D: ${leaf.word.text}`);

		if (leaf.word.bare === '◌') {
			if (cCommand.label === 'word') {
				const word = getLeaf(cCommand);
				assertLeaf(word);
				if (word.word.covert) throw new Impossible('Covert name');
				if (word.word.entry === undefined)
					throw new Unrecognized(`name: ${word.word.text}`);
				const verb = word.word.entry.toaq;
				return λ('e', () =>
					ref(
						{ type: 'name', verb },
						λ(Int(Pl('e')), x => wrapInBindings(v(x), v(x), word.word)),
					),
				);
			}

			// This is the (trivial) tonal determiner found on "ꝡé hao hóa", "ꝡá ruqshua"
			return λ(Int(Pl('e')), x => v(x));
		}

		if (leaf.word.text === 'hú-') {
			assertLeaf(cCommand);
			if (cCommand.word.covert) throw new Impossible('Covert head');
			if (cCommand.word.entry === undefined)
				throw new Unrecognized(`head: ${cCommand.word.text}`);
			const word = cCommand.word.bare;
			return λ('e', () =>
				ref(
					{ type: 'head', head: word },
					λ(Int(Pl('e')), x => bind({ type: 'head', head: word }, v(x), v(x))),
				),
			);
		}

		const toaq = inTone(leaf.word.entry.toaq.replace(/-$/, ''), Tone.T2);

		const indef = findIndef(cCommand.denotation.type);
		if (indef === null)
			throw new Impossible(
				`D complement: ${typeToPlainText(cCommand.denotation.type)}`,
			);
		const data = determiners.get(toaq)?.(indef.domain);
		if (data === undefined) throw new Unrecognized(`D: ${toaq}`);

		if (toaq === 'túq')
			// túq is cursed and requires its own branch
			return λ(Int(indef), np =>
				int(
					λ('s', w =>
						app(
							unindef(
								app(unint(v(np)), v(w)),
								λ(Fn(indef.domain, 't'), () =>
									λ(Fn(indef.domain, indef.inner), body => v(body)),
								),
							),
							app(
								data,
								int(
									λ('s', w =>
										unindef(
											app(unint(v(np)), v(w)),
											λ(Fn(indef.domain, 't'), restriction =>
												λ(Fn(indef.domain, indef.inner), () => v(restriction)),
											),
										),
									),
								),
							),
						),
					),
				),
			);

		assertFn(data.type);
		const { range } = data.type;
		const functor = getFunctor(range);
		if (functor === null)
			throw new Impossible(`${toaq} doesn't return a functor`);

		return λ(indef, np =>
			unindef(
				v(np),
				λ(Fn(indef.domain, 't'), restriction =>
					λ(Fn(indef.domain, indef.inner), body =>
						reduce(
							functor.map(
								() => v(body),
								() => app(data, v(restriction)),
								range,
								functor.wrap(indef.inner, range),
							),
						),
					),
				),
			),
		);
	}

	if (leaf.label === '𝘯') {
		if (cCommand === null)
			throw new Impossible('Cannot denote an 𝘯 in isolation');
		if (!leaf.word.covert) throw new Impossible('Overt 𝘯');

		const data = littleNs.get(leaf.word.value);
		if (data === undefined) throw new Unrecognized(`𝘯: ${leaf.word.value}`);
		const vp = findVp(cCommand);
		if (vp === null) throw new Impossible("Can't find the VP for this 𝘯");
		return data(getVerbWord(vp));
	}

	if (leaf.label === 'C') {
		if (leaf.word.covert) {
			const data = covertComplementizers.get(leaf.word.value);
			if (data === undefined) throw new Unrecognized(`C: ${leaf.word.value}`);
			return data;
		}
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`C: ${leaf.word.text}`);

		const toaq = leaf.word.entry.toaq;
		const data = overtComplementizers.get(toaq);
		if (data === undefined) throw new Unrecognized(`C: ${toaq}`);
		return data;
	}

	if (leaf.label === 'EvA') return eventAccessor;

	if (leaf.label === 'CP') {
		if (!leaf.word.covert) throw new Impossible('Overt CP');
		return covertCp;
	}

	if (leaf.label === 'SA') {
		if (cCommand === null)
			throw new Impossible('Cannot denote an SA in isolation');
		let toaq: string;
		if (leaf.word.covert) {
			toaq =
				findEffect(cCommand.denotation.type, Qn('e', 't')) === null
					? 'da'
					: 'móq';
		} else if (leaf.word.entry === undefined)
			throw new Unrecognized(`SA: ${leaf.word.text}`);
		else toaq = leaf.word.entry.toaq;

		const type = speechActParticles.get(toaq);
		if (type === undefined) throw new Unrecognized(`SA: ${toaq}`);
		return lex(toaq, type(cCommand.denotation.type));
	}

	if (leaf.label === 'Cond') {
		if (!leaf.word.covert) throw new Impossible('Overt Cond');
		const data = conditionals.get(leaf.word.value);
		if (data === undefined) throw new Unrecognized(`Cond: ${leaf.word.value}`);
		return data;
	}

	if (leaf.label === 'Q') {
		if (cCommand === null)
			throw new Impossible('Cannot denote a Q in isolation');
		if (leaf.word.covert) throw new Impossible('Covert Q');
		const toaq = leaf.word.bare;
		const indef = findIndef(cCommand.denotation.type);
		if (indef === null)
			throw new Impossible(
				`Q complement: ${typeToPlainText(cCommand.denotation.type)}`,
			);

		return (
			quantifiers.get(toaq)?.(indef.domain) ??
			λ(Indef(indef.domain, Int(Fn('v', 't'))), g =>
				unindef(
					v(g),
					lex(
						toaq,
						Fn(
							Fn(indef.domain, 't'),
							Fn(Fn(indef.domain, Int(Fn('v', 't'))), Int(Fn('v', 't'))),
						),
					),
				),
			)
		);
	}

	if (leaf.label === 'Adjunct') {
		if (cCommand === null)
			throw new Impossible('Cannot denote an Adjunct in isolation');

		let data: (distributive: boolean) => Expr;
		if (leaf.word.covert || leaf.word.entry?.toaq === '◌̂') {
			const vp = findVp(cCommand);
			if (vp === null)
				throw new Impossible("Can't find the VP for this Adjunct");
			const word = getVerbWord(vp);
			if (word.covert) throw new Impossible('Covert Adjunct verb');
			if (word.entry === undefined || word.entry.type !== 'predicate')
				throw new Unrecognized(`V in AdjunctP: ${word.text}`);

			const data_ = adjuncts[word.entry.subject];
			if (data_ === undefined)
				throw new Ungrammatical(
					`${word.entry.toaq} may not be used as an adverbial adjunct`,
				);
			data = data_;
		} else if (leaf.word.entry?.toaq === 'kı-') data = subjectSharingAdverbial;
		else throw new Unrecognized(`Adjunct: ${leaf.word.text}`);

		const predicate = unwrapEffects(cCommand.denotation.type);
		assertFn(predicate);
		return data(predicate.domain === 'e');
	}

	if (leaf.label === '&') {
		if (cCommand === null) throw new Impossible('Cannot denote & in isolation');
		if (leaf.word.covert) throw new Impossible('Covert &');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`&: ${leaf.word.text}`);
		const toaq = inTone(leaf.word.entry.toaq, Tone.T2);

		if (toaq === 'róı') return pluralCoordinator;
		const conjunct = unwrapEffects(cCommand.denotation.type);
		const data = clausalConjunctions.get(toaq);
		if (data === undefined) throw new Unrecognized(`&: ${toaq}`);
		return data(
			// TODO: We ought not to need the Int on Int(conjunct)
			conjunct === 'e' ? Int(Pl('e')) : Int(conjunct),
			conjunct === 'e',
		);
	}

	if (leaf.label === 'Focus') {
		if (leaf.word.covert) throw new Impossible('Covert Focus');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`Focus: ${leaf.word.text}`);
		// TODO: Generalize to more than just verbal arguments
		return lex(
			leaf.word.entry.toaq,

			Fn(
				Int(Pl('e')),
				Cont(Bind({ type: 'head', head: leaf.word.bare }, Int(Pl('e')))),
			),
		);
	}

	if (leaf.label === 'Topic') {
		if (cCommand === null)
			throw new Impossible('Cannot denote Topic in isolation');
		const deixis = findEffect(cCommand.denotation.type, Dx('()'));
		if (deixis === null) throw new Ungrammatical('Nothing to topicalize');
		const { inner } = deixis as ExprType & object & { head: 'dx' };
		return λ(Dx(inner), p =>
			λ(Pl('e'), x => app(app(topic(inner), v(x)), v(p))),
		);
	}

	if (leaf.label === 'word' || leaf.label === 'text') {
		if (leaf.word.covert) throw new Impossible(`Covert ${leaf.label}`);
		return quote(leaf.word.text);
	}

	if (leaf.label === 'mı' || leaf.label === 'shu' || leaf.label === 'mo') {
		if (leaf.word.covert) throw new Impossible(`Covert ${leaf.label}`);
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`${leaf.label}: ${leaf.word.text}`);
		return lex(leaf.word.entry.toaq, Int(Fn('e', Fn('e', Fn('v', 't')))));
	}

	if (
		leaf.label === 'bu' ||
		leaf.label === 'mu' ||
		leaf.label === 'ge' ||
		leaf.label === 'buq' ||
		leaf.label === 'Telicity'
	) {
		if (cCommand === null)
			throw new Impossible(`Cannot denote a ${leaf.label} in isolation`);
		if (leaf.word.covert) throw new Impossible(`Covert ${leaf.label}`);
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`${leaf.label}: ${leaf.word.text}`);
		const type = unwrapEffects(cCommand.denotation.type);
		return lex(leaf.word.entry.toaq, Fn(type, type));
	}

	if (leaf.label === 'SAP') {
		if (leaf.word.covert) throw new Impossible('Covert SAP');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`SAP: ${leaf.word.text}`);
		const base = lex(leaf.word.bare, Act('()'));
		switch (leaf.word.tone) {
			case Tone.T1:
			case Tone.T3:
				return base;
			case Tone.T2:
				return app(ask, base);
			case Tone.T4:
				return app(empathize, base);
		}
	}

	if (leaf.label === 'Vocative') return address;

	if (leaf.label === 'kıo') return bg;

	if (leaf.label === 'teo' || leaf.label === 'kı') return unit;

	throw new Unimplemented(`TODO: ${leaf.label}`);
}

function denote_(tree: StrictTree, cCommand: DTree | null): DETree {
	if ('word' in tree) {
		try {
			const denotation = denoteLeaf(tree, cCommand);
			return { ...tree, denotation };
		} catch (error) {
			return { ...tree, error };
		}
	}

	let left: DETree;
	let right: DETree;
	if ('word' in tree.left && tree.right.label !== '𝘷') {
		right = denote_(tree.right, null);
		left = denote_(tree.left, 'denotation' in right ? right : null);
	} else {
		left = denote_(tree.left, null);
		right = denote_(tree.right, 'denotation' in left ? left : null);
	}

	if ('denotation' in left && 'denotation' in right) {
		try {
			const result = compose(left.denotation, right.denotation);
			const denotation = reduce(result.denotation);
			return {
				...tree,
				left,
				right,
				denotation,
				mode: result.mode,
			};
		} catch (error) {
			return { ...tree, left, right, error };
		}
	}

	const errors: ETree[] = [];
	errors.push(...getErrors(left));
	errors.push(...getErrors(right));
	return { ...tree, left, right, errors };
}

/**
 * Annotates a tree with denotations.
 */
export function denote(tree: StrictTree): DETree {
	return denote_(tree, null);
}
