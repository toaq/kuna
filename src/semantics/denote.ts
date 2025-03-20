import { Impossible, Unimplemented, Unrecognized } from '../core/error';
import { splitNonEmpty } from '../core/misc';
import type { VerbEntry } from '../morphology/dictionary';
import { inTone } from '../morphology/tokenize';
import { Tone } from '../morphology/tone';
import { getFrame } from '../syntax/serial';
import type { CovertWord, Leaf, StrictTree, Word } from '../tree';
import { compose } from './compose';
import {
	causeLittleV,
	complementizers,
	covertCrel,
	covertResumptive,
	covertSigma,
	covertV,
	declarativeComplementizer,
	determiners,
	pronominalTenses,
	pronouns,
	speechActParticles,
} from './data';
import {
	type AnimacyClass,
	Bind,
	Cont,
	type DTree,
	Dx,
	type Expr,
	Fn,
	Gen,
	Int,
	Pl,
	Qn,
	bind,
	closed,
	gen,
	lex,
	λ,
} from './model';
import { reduceExpr } from './reduce';
import { typeToPlainText } from './render';
import { findInner, unwrapEffects } from './structures';

function findVp(tree: StrictTree): StrictTree | null {
	if (tree.label === 'VP' || tree.label === "EvA'") {
		return tree;
	}
	if ('word' in tree) {
		return null;
	}
	return findVp(tree.right) ?? findVp(tree.left);
}

function getVerbWord(vp: StrictTree): Word | CovertWord {
	if ('word' in vp) {
		if (vp.word.covert) throw new Impossible('Covert VP');
		return vp.word;
	}
	const verb = vp.left;
	switch (verb.label) {
		case 'V':
		case 'EvA':
			if (!('word' in verb)) throw new Unrecognized(`${verb.label} shape`);
			return verb.word;
		case 'VP':
			return getVerbWord(verb);
		case 'shuP':
		case 'mıP':
			if ('word' in verb || !('word' in verb.left))
				throw new Unrecognized(`${verb.label} shape`);
			if (verb.left.word.covert)
				throw new Impossible(`Covert ${verb.left.label}`);
			return verb.left.word;
		case 'teoP':
			if ('word' in verb || 'word' in verb.left || !('word' in verb.left.left))
				throw new Unrecognized('teoP shape');
			if (verb.left.left.word.covert)
				throw new Impossible(`Covert ${verb.left.left.label}`);
			return verb.left.left.word;
		default:
			throw new Unrecognized('VP shape');
	}
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

function denoteLeaf(leaf: Leaf, cCommand: DTree | null): Expr {
	if (leaf.label === 'V' || leaf.label === 'VP') {
		if (leaf.word.covert) return covertV;

		const entry = leaf.word.entry;
		if (!entry) throw new Unrecognized(`verb: ${leaf.word.text}`);
		if (entry.type !== 'predicate' && entry.type !== 'predicatizer')
			throw new Impossible('non-predicate V');

		let arity = splitNonEmpty(getFrame(leaf), ' ').length;
		// Agents are external to the verb, so not counted in the arity
		if (entry.subject === 'agent') arity--;
		// In case we don't have lexical data on this word, make sure we're at least
		// providing the minimum number of arguments
		if (leaf.label === 'V') arity = Math.max(1, arity);

		let type = Fn('v', 't');
		for (let i = 0; i < arity; i++) type = Fn('e', type);
		type = Int(type);
		return lex(entry.toaq, type, closed);
	}

	if (leaf.label === '𝘷') {
		if (leaf.word.covert) {
			const value = leaf.word.value;
			if (value === 'CAUSE') return causeLittleV;
			if (value === 'BE') {
				if (cCommand === null)
					throw new Impossible("Can't denote BE in isolation");
				return λ(unwrapEffects(cCommand.denotation.type), closed, (pred, s) =>
					s.var(pred),
				);
			}
			throw new Unrecognized(`𝘷: ${value}`);
		}
		throw new Unimplemented('Overt 𝘷');
	}

	if (leaf.label === 'DP') {
		if (leaf.word.covert) return covertResumptive;
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`DP: ${leaf.word.text}`);

		const toaq = inTone(leaf.word.entry.toaq, Tone.T2);
		const type = pronouns.get(toaq);
		if (type === undefined) throw new Unrecognized(`DP: ${toaq}`);
		return lex(toaq, type, closed);
	}

	if (leaf.label === 'Asp') {
		let toaq: string;
		if (leaf.word.covert) {
			toaq = 'tam';
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`Asp: ${leaf.word.text}`);
		} else {
			toaq = leaf.word.entry.toaq.replace(/-$/, '');
		}

		// TODO: chum will need a different type
		return lex(toaq, Int(Fn(Fn('v', 't'), Fn('i', 't'))), closed);
	}

	if (leaf.label === 'T') {
		let toaq: string;
		if (leaf.word.covert) {
			toaq = 'tuom';
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`T: ${leaf.word.text}`);
		} else {
			toaq = leaf.word.entry.toaq.replace(/-$/, '');
		}

		return lex(
			toaq,
			toaq === 'sula'
				? Fn(Fn('i', 't'), 't')
				: Dx(pronominalTenses.has(toaq) ? 'i' : Fn(Fn('i', 't'), 't')),
			closed,
		);
	}

	if (leaf.label === 'Σ') {
		if (leaf.word.covert) return covertSigma;
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`Σ: ${leaf.word.text}`);
		const toaq = leaf.word.entry.toaq.replace(/-$/, '');
		return lex(toaq, Fn('t', 't'), closed);
	}

	// TODO: Add bindings to DPs
	if (leaf.label === 'D') {
		if (leaf.word.covert)
			// TODO: This shouldn't be a random lexical entry
			return lex('ló', Fn(Fn(Int(Pl('e')), 't'), Dx(Int(Pl('e')))), closed);
		if (cCommand === null)
			throw new Impossible('Cannot denote a D in isolation');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`D: ${leaf.word.text}`);

		const toaq = inTone(leaf.word.entry.toaq, Tone.T2);
		const type = determiners.get(toaq);
		if (type === undefined) throw new Unrecognized(`D: ${toaq}`);
		const inner = findInner(cCommand.denotation.type, Gen('e', 'e'));
		if (inner === null)
			throw new Impossible(
				`D complement: ${typeToPlainText(cCommand.denotation.type)}`,
			);
		return lex(toaq, type(inner), closed);
	}

	if (leaf.label === '𝘯') {
		if (cCommand === null)
			throw new Impossible('Cannot denote an 𝘯 in isolation');
		const vp = findVp(cCommand);
		if (vp === null) throw new Impossible("Can't find the VP for this 𝘯");
		const verb = getVerbWord(vp);
		const animacy = verb.covert ? null : animacyClass(verb.entry as VerbEntry);
		return λ(Fn(Int(Pl('e')), 't'), closed, (predicate, s) =>
			gen(
				s.var(predicate),
				λ(Int(Pl('e')), s, (x, s) => {
					let result: Expr = s.var(x);
					if (animacy !== null)
						result = bind(
							{ type: 'animacy', class: animacy },
							s.var(x),
							result,
						);
					if (!verb.covert)
						result = bind(
							{ type: 'verb', verb: (verb.entry as VerbEntry).toaq },
							s.var(x),
							result,
						);
					return result;
				}),
			),
		);
	}

	if (leaf.label === 'Crel') {
		if (leaf.word.covert) return covertCrel;
		throw new Unimplemented('Overt Crel');
	}

	if (leaf.label === 'C') {
		let toaq: string;
		if (leaf.word.covert) toaq = 'ꝡa';
		else if (leaf.word.entry === undefined)
			throw new Unrecognized(`C: ${leaf.word.text}`);
		else toaq = leaf.word.entry.toaq;
		if (toaq === 'ꝡa') return declarativeComplementizer;

		const type = complementizers.get(toaq);
		if (type === undefined) throw new Unrecognized(`C: ${toaq}`);
		return lex(toaq, type, closed);
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
		return lex(toaq, type(cCommand.denotation.type), closed);
	}

	if (leaf.label === '&') {
		if (leaf.word.covert) throw new Impossible('Covert &');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`&: ${leaf.word.text}`);
		const toaq = inTone(leaf.word.entry.toaq, Tone.T2);
		// TODO: Generalize to more than just verbal arguments
		return lex(
			toaq,
			toaq === 'róı'
				? Fn(
						Int(Pl('e')),
						Fn(Int(Pl('e')), Bind({ type: 'head', head: 'róı' }, Int(Pl('e')))),
					)
				: Fn(
						Int(Pl('e')),
						Fn(
							Int(Pl('e')),
							Cont(Bind({ type: 'head', head: toaq }, Int(Pl('e')))),
						),
					),
			closed,
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
				Cont(Bind({ type: 'head', head: leaf.word.entry.toaq }, Int(Pl('e')))),
			),
			closed,
		);
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
	const denotation = reduceExpr(expr);
	return { ...tree, left, right, denotation, mode };
}

/**
 * Annotates a tree with denotations.
 */
export function denote(tree: StrictTree): DTree {
	return denote_(tree, null);
}
