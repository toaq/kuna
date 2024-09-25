import { Impossible, Unimplemented, Unrecognized } from '../core/error';
import { splitNonEmpty } from '../core/misc';
import { getFrame } from '../syntax/serial';
import type { Leaf, StrictTree } from '../tree';
import { compose } from './compose';
import { covertLittleVs, covertSigma, covertV, pronominalTenses } from './data';
import { type DTree, type Expr, Fn, IO, Int, closed, lex } from './model';

function denoteLeaf(leaf: Leaf): Expr {
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
			const data = covertLittleVs[value];
			if (data === undefined) throw new Unrecognized(`𝘷: ${value}`);
			return data;
		}
		throw new Unimplemented('Overt 𝘷');
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
				: IO(pronominalTenses.has(toaq) ? 'i' : Fn(Fn('i', 't'), 't')),
			closed,
		);
	}

	if (leaf.label === 'Σ') {
		if (leaf.word.covert) {
			return covertSigma;
		}
		if (leaf.word.entry === undefined) {
			throw new Unrecognized(`Σ: ${leaf.word.text}`);
		}
		const toaq = leaf.word.entry.toaq.replace(/-$/, '');
		return lex(toaq, Fn('t', 't'), closed);
	}

	throw new Unimplemented(`TODO: ${leaf.label}`);
}

/**
 * Annotates a tree with denotations.
 */
export function denote(tree: StrictTree): DTree {
	if ('word' in tree) {
		const denotation = denoteLeaf(tree);
		return { ...tree, denotation };
	}

	const left = denote(tree.left);
	const right = denote(tree.right);
	const [denotation, mode] = compose(left.denotation, right.denotation);
	return { ...tree, left, right, denotation, mode };
}
