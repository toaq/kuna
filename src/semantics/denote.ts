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
} from '../tree';
import { compose } from './compose';
import {
	adjuncts,
	conditionals,
	covertComplementizers,
	covertCp,
	covertV,
	determiners,
	distributiveLittleV,
	nondistributiveLittleV,
	nullaryLittleV,
	overtComplementizers,
	polarities,
	pro,
	pronominalTenses,
	pronouns,
	quantifiers,
	serialFrames,
	speechActParticles,
	subjectSharingAdverbial,
} from './data';
import {
	Bind,
	Cont,
	Dx,
	Fn,
	Indef,
	Int,
	Pl,
	Qn,
	app,
	assertFn,
	bind,
	indef,
	lex,
	quote,
	ref,
	unindef,
	v,
	λ,
} from './model';
import { reduce } from './reduce';
import { typeToPlainText } from './render';
import { findInner, getFunctor, unwrapEffects } from './structures';
import type { AnimacyClass, DTree, Expr, ExprType } from './types';

function findVp(tree: StrictTree): StrictTree | null {
	if (
		tree.label === 'VP' ||
		(tree.label === 'CP' &&
			'left' in tree &&
			'word' in tree.left &&
			!tree.left.word.covert) ||
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
			if (leaf.word.entry.type !== 'predicate')
				throw new Impossible(`Serializing ${leaf.word.entry.type}`);
			const data = serialFrames.get(leaf.word.entry.frame);
			if (data === undefined)
				throw new Unimplemented(`Serial frame (${leaf.word.entry.frame})`);
			return data(verb);
		}

		return verb;
	}

	if (leaf.label === '𝘷') {
		if (leaf.word.covert) {
			if (cCommand === null)
				throw new Impossible("Can't denote covert 𝘷 in isolation");
			const type = unwrapEffects(cCommand.denotation.type);
			assertFn(type);
			if (
				typeof type.domain === 'object' &&
				type.domain.head === 'pl' &&
				type.domain.inner === 'e'
			)
				return nondistributiveLittleV;
			if (type.domain === 'e') return distributiveLittleV;
			if (type.domain === 'v') return nullaryLittleV;
			throw new Unrecognized(`𝘷 for type ${typeToPlainText(type)}`);
		}
		if (cCommand?.label === "Cond'")
			return λ(unwrapEffects(cCommand.denotation.type), pred => v(pred));
		throw new Unimplemented(`Overt 𝘷: ${leaf.word.text}`);
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
		return lex(toaq, Int(Fn(Fn('v', 't'), Fn('i', 't'))));
	}

	if (leaf.label === 'T') {
		let toaq: string;
		if (leaf.word.covert) toaq = 'tuom';
		else if (leaf.word.entry === undefined)
			throw new Unrecognized(`T: ${leaf.word.text}`);
		else toaq = leaf.word.entry.toaq.replace(/-$/, '');

		return lex(
			toaq,
			toaq === 'sula'
				? Fn(Fn('i', 't'), 't')
				: Dx(pronominalTenses.has(toaq) ? 'i' : Fn(Fn('i', 't'), 't')),
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
				assertLeaf(cCommand);
				if (cCommand.word.covert) throw new Impossible('Covert name');
				if (cCommand.word.entry === undefined)
					throw new Unrecognized(`name: ${cCommand.word.text}`);
				const animacy = animacyClass(cCommand.word.entry as VerbEntry);
				const word = cCommand.word.entry.toaq;
				return λ('e', () =>
					ref(
						{ type: 'name', verb: word },
						λ(Int(Pl('e')), x => {
							let result: Expr = v(x);
							if (animacy !== null)
								result = bind(
									{ type: 'animacy', class: animacy },
									v(x),
									result,
								);
							result = bind({ type: 'name', verb: word }, v(x), result);
							return result;
						}),
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
		assertFn(data.type);
		const { range } = data.type;
		const functor = getFunctor(range);
		if (functor === null)
			throw new Impossible(`${toaq} doesn't return a functor`);

		return λ(Indef(indef.domain, indef.inner), np =>
			unindef(
				v(np),
				λ(Fn(indef.domain, 't'), restriction =>
					λ(Fn(indef.domain, indef.inner), body =>
						functor.map(
							() => λ(indef.domain, x => app(v(body), v(x))),
							() => app(data, v(restriction)),
							range,
							functor.wrap(indef.inner, range),
						),
					),
				),
			),
		);
	}

	if (leaf.label === '𝘯') {
		if (cCommand === null)
			throw new Impossible('Cannot denote an 𝘯 in isolation');
		const vp = findVp(cCommand);
		if (vp === null) throw new Impossible("Can't find the VP for this 𝘯");
		const verb = getVerbWord(vp);

		const animacy =
			!verb.covert &&
			verb.entry !== undefined &&
			'pronominal_class' in verb.entry
				? animacyClass(verb.entry)
				: null;

		return λ(Fn(Int(Pl('e')), 't'), predicate =>
			indef(
				v(predicate),
				λ(Int(Pl('e')), x => {
					let result: Expr = v(x);
					if (animacy !== null)
						result = bind({ type: 'animacy', class: animacy }, v(x), result);
					if (
						!verb.covert &&
						verb.entry !== undefined &&
						verb.entry.type !== 'predicatizer'
					)
						result = bind(
							verb.entry.type === 'predicate'
								? { type: 'name', verb: verb.entry.toaq }
								: { type: 'head', head: verb.bare },
							v(x),
							result,
						);
					return result;
				}),
			),
		);
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
				findInner(cCommand.denotation.type, Qn('e', 't')) === null
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
			λ(Indef(indef.domain, 't'), g =>
				unindef(
					v(g),
					lex(toaq, Fn(Fn(indef.domain, 't'), Fn(Fn(indef.domain, 't'), 't'))),
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
		if (leaf.word.covert) throw new Impossible('Covert &');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`&: ${leaf.word.text}`);
		const toaq = inTone(leaf.word.entry.toaq, Tone.T2);
		const out = Bind({ type: 'head', head: leaf.word.bare }, Int(Pl('e')));

		// TODO: Generalize to more than just verbal arguments
		return lex(
			toaq,
			toaq === 'róı'
				? Fn(Int(Pl('e')), Fn(Int(Pl('e')), out))
				: Fn(Int(Pl('e')), Fn(Int(Pl('e')), Cont(out))),
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

	if (leaf.label === 'teo') {
		if (cCommand === null)
			throw new Impossible('Cannot denote a teo in isolation');
		return λ(cCommand.denotation.type, x => v(x));
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

	throw new Unimplemented(`TODO: ${leaf.label}`);
}

export function denote_(tree: StrictTree, cCommand: DTree | null): DTree {
	if ('word' in tree) {
		const denotation = denoteLeaf(tree, cCommand);
		return { ...tree, denotation };
	}

	let left: DTree;
	let right: DTree;
	if ('word' in tree.left) {
		right = denote_(tree.right, null);
		left = denote_(tree.left, right);
	} else {
		left = denote_(tree.left, null);
		right = denote_(tree.right, left);
	}

	const [expr, mode] = compose(left.denotation, right.denotation);
	const denotation = reduce(expr);
	return { ...tree, left, right, denotation, mode };
}

/**
 * Annotates a tree with denotations.
 */
export function denote(tree: StrictTree): DTree {
	return denote_(tree, null);
}
