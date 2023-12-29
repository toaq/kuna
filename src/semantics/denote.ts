import { VerbEntry } from '../dictionary';
import {
	Impossible,
	Ungrammatical,
	Unimplemented,
	Unrecognized,
} from '../error';
import { splitNonEmpty } from '../misc';
import { inTone } from '../tokenize';
import {
	Branch,
	CovertWord,
	Leaf,
	StrictTree,
	Word,
	effectiveLabel,
} from '../tree';
import { Tone } from '../types';
import { compose } from './compose';
import {
	adjuncts,
	animacies,
	aspects,
	boundThe,
	covertHoaBindings,
	clausalConjunctions,
	covertLittleVs,
	covertV,
	defaultTense,
	dps,
	eventAccessor,
	modals,
	nameVerbs,
	overtLittleVs,
	polarities,
	quantifiers,
	quoteVerb,
	speechActs,
	tenses,
	headAnaphor,
	focus,
	focusAdverbs,
	pluralCoordinator,
	argumentCoordinator,
	argumentConjunctions,
	covertCp,
} from './data';
import {
	DTree,
	Expr,
	noBindings,
	v,
	verb,
	λ,
	AnimacyClass,
	quote,
	cloneBindings,
} from './model';

function denoteVerb(toaq: string, arity: number): Expr {
	switch (arity) {
		case 0:
			return λ('v', ['s'], c => verb(toaq, [], v(0, c), v(1, c)));
		case 1:
			return λ('e', ['s'], c =>
				λ('v', c, c => verb(toaq, [v(1, c)], v(0, c), v(2, c))),
			);
		case 2:
			return λ('e', ['s'], c =>
				λ('e', c, c =>
					λ('v', c, c => verb(toaq, [v(1, c), v(2, c)], v(0, c), v(3, c))),
				),
			);
		default:
			throw new Impossible(`Invalid verb arity: ${toaq} (${arity})`);
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

function findVp(tree: StrictTree): StrictTree | null {
	if (tree.label === 'VP') {
		return tree;
	} else if ('word' in tree) {
		return null;
	} else {
		return findVp(tree.right) ?? findVp(tree.left);
	}
}

function getVerbWord(vp: StrictTree): Word | CovertWord {
	if ('word' in vp) {
		if (vp.word.covert) throw new Impossible('Covert VP');
		return vp.word;
	} else {
		const verb = vp.left;
		switch (verb.label) {
			case 'V':
				if (!('word' in verb)) throw new Unrecognized('V shape');
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
				if (
					'word' in verb ||
					'word' in verb.left ||
					!('word' in verb.left.left)
				)
					throw new Unrecognized('teoP shape');
				if (verb.left.left.word.covert)
					throw new Impossible(`Covert ${verb.left.left.label}`);
				return verb.left.left.word;
			default:
				throw new Unrecognized('VP shape');
		}
	}
}

function denoteLeaf(leaf: Leaf, cCommand: StrictTree | null): DTree {
	let denotation: Expr | null;
	let bindings = noBindings;

	if (leaf.label === 'V' || leaf.label === 'VP') {
		if (leaf.word.covert) {
			denotation = covertV;
		} else {
			const entry = leaf.word.entry;
			if (!entry) throw new Unrecognized('verb: ' + leaf.word.text);
			if (entry.type !== 'predicate') throw new Impossible('non-predicate V');

			let arity = splitNonEmpty(entry.frame, ' ').length;
			// Agents are external to the verb, so not counted in the arity
			if (entry.subject === 'agent') arity--;
			// In case we don't have lexical data on this word, make sure we're at least
			// providing the minimum number of arguments
			if (leaf.label === 'V') arity = Math.max(1, arity);
			denotation = denoteVerb(entry.toaq, arity);
		}
	} else if (leaf.label === 'DP') {
		if (leaf.word.covert) {
			[denotation] = dps.hóa;
			bindings = covertHoaBindings;
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`DP: ${leaf.word.text}`);
		} else {
			const toaq = inTone(leaf.word.entry.toaq, Tone.T2);
			const data = dps[toaq];
			if (data === undefined) throw new Unrecognized(`DP: ${toaq}`);
			[denotation, bindings] = data;
		}
	} else if (leaf.label === 'D') {
		if (leaf.word.covert) throw new Impossible('Covert D');
		if (cCommand === null)
			throw new Impossible("Can't denote a D in isolation");

		const binding = { index: 0, subordinate: false, timeIntervals: [] };
		if (leaf.word.text === 'hú-') {
			if (
				cCommand.label !== 'word' ||
				!('word' in cCommand) ||
				cCommand.word.covert
			)
				throw new Unrecognized('hú- DP shape');
			denotation = headAnaphor;
			bindings = {
				...noBindings,
				head: new Map([[cCommand.word.bare, binding]]),
			};
		} else {
			const vp = findVp(cCommand);
			if (vp === null) throw new Impossible("Can't find the VP for this D");
			const verb = getVerbWord(vp);

			denotation = boundThe;
			bindings = cloneBindings(noBindings);
			bindings.covertResumptive = binding;
			if (leaf.word.text !== '◌́') {
				bindings.head.set(leaf.word.bare, binding);
				if (leaf.binding !== undefined)
					bindings.index.set(leaf.binding, binding);
			}
			if (!verb.covert) {
				bindings.variable.set((verb.entry as VerbEntry).toaq, binding);
				const animacy = animacyClass(verb.entry as VerbEntry);
				if (animacy !== null) bindings.animacy.set(animacy, binding);
			}
		}
	} else if (leaf.label === '𝘯') {
		if (cCommand === null)
			throw new Impossible("Can't denote an 𝘯 in isolation");
		const vp = findVp(cCommand);
		if (vp === null) throw new Impossible("Can't find the VP for this 𝘯");
		const verb = getVerbWord(vp);

		denotation =
			animacies[
				verb.covert
					? 'descriptive'
					: animacyClass(verb.entry as VerbEntry) ?? 'descriptive'
			];
		bindings = covertHoaBindings;
	} else if (leaf.label === '𝘷') {
		if (leaf.word.covert) {
			const value = leaf.word.value;
			const data = covertLittleVs[value];
			if (data === undefined) throw new Unrecognized(`𝘷: ${value}`);
			denotation = data;
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`𝘷: ${leaf.word.text}`);
		} else {
			const toaq = leaf.word.entry.toaq;
			denotation = overtLittleVs[toaq];
			if (denotation === undefined) throw new Unrecognized(`𝘷: ${toaq}`);
		}
	} else if (leaf.label === 'Adjunct') {
		if (cCommand === null)
			throw new Impossible("Can't denote an Adjunct in isolation");
		const vp = findVp(cCommand);
		if (vp === null) throw new Impossible("Can't find the VP for this Adjunct");
		const word = getVerbWord(vp);
		if (word.covert) throw new Impossible('Covert Adjunct verb');
		if (word.entry === undefined || word.entry.type !== 'predicate')
			throw new Unrecognized(`V in AdjunctP: ${word.text}`);

		const data = adjuncts[word.entry.subject];
		if (data === undefined)
			throw new Ungrammatical(
				`${word.entry.toaq} may not be used as an adverbial adjunct`,
			);
		denotation = data;
	} else if (leaf.label === 'Asp') {
		let toaq: string;
		if (leaf.word.covert) {
			toaq = 'tam';
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`Asp: ${leaf.word.text}`);
		} else {
			toaq = leaf.word.entry.toaq.replace(/-$/, '');
		}

		denotation = aspects[toaq];
		if (denotation === undefined) throw new Unrecognized(`Asp: ${toaq}`);
	} else if (leaf.label === 'T') {
		if (leaf.word.covert) {
			denotation = defaultTense;
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`T: ${leaf.word.text}`);
		} else {
			const toaq = leaf.word.entry.toaq.replace(/-$/, '');
			denotation = tenses[toaq];
			if (denotation === undefined) throw new Unrecognized(`T: ${toaq}`);
		}
	} else if (leaf.label === 'Σ') {
		if (leaf.word.covert) throw new Impossible('Covert Σ');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`Σ: ${leaf.word.text}`);

		const toaq = leaf.word.entry.toaq.replace(/-$/, '');
		denotation = polarities[toaq];
		if (denotation === undefined) throw new Unrecognized(`Σ: ${toaq}`);
	} else if (leaf.label === 'SA') {
		let toaq: string;
		if (leaf.word.covert) {
			toaq = 'da'; // TODO: covert móq
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`SA: ${leaf.word.text}`);
		} else {
			toaq = leaf.word.entry.toaq;
		}

		denotation = speechActs[toaq];
		if (denotation === undefined) throw new Unrecognized(`SA: ${toaq}`);
	} else if (leaf.label === 'Q') {
		if (!leaf.word.covert) throw new Impossible(`Overt Q: ${leaf.word.text}`);
		const value = leaf.word.value;
		const data = quantifiers[value];
		if (data === undefined) throw new Unrecognized(`Q: ${value}`);
		denotation = data;
	} else if (leaf.label === '&') {
		if (cCommand === null)
			throw new Impossible("Can't denote an & in isolation");
		if (leaf.word.covert) throw new Impossible('Covert &');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`&: ${leaf.word.text}`);

		const toaq = inTone(leaf.word.entry.toaq, Tone.T2);
		if (toaq === 'róı') {
			denotation = pluralCoordinator;
		} else {
			const conjunct = effectiveLabel(cCommand);
			if (conjunct === 'DP') {
				denotation = argumentCoordinator;
				const binding = { index: 0, subordinate: false, timeIntervals: [] };
				if (leaf.binding !== undefined)
					bindings = {
						...noBindings,
						index: new Map([[leaf.binding, binding]]),
						head: new Map([[leaf.word.bare, binding]]),
					};
			} else {
				const data = clausalConjunctions[effectiveLabel(cCommand)]?.[toaq];
				if (data === undefined) throw new Unrecognized(`&: ${toaq}`);
				denotation = data;
			}
		}
	} else if (leaf.label === '&Q') {
		if (cCommand === null)
			throw new Impossible("Can't denote an &Q in isolation");
		if (!leaf.word.covert) throw new Impossible(`Overt &Q: ${leaf.word.text}`);
		if (leaf.binding === undefined) throw new Impossible('&Q without binding');

		const value = leaf.word.value;
		const data = argumentConjunctions[value];
		if (data === undefined) throw new Unrecognized(`&Q: ${value}`);
		denotation = data;
		bindings = {
			...noBindings,
			index: new Map([
				[leaf.binding, { index: 0, subordinate: false, timeIntervals: [] }],
			]),
		};
	} else if (leaf.label === 'Modal') {
		if (leaf.word.covert) throw new Impossible('Covert Modal');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`Modal: ${leaf.word.text}`);

		const toaq = inTone(leaf.word.entry.toaq, Tone.T4);
		denotation = modals[toaq];
		if (denotation === undefined) throw new Unrecognized(`Modal: ${toaq}`);
	} else if (leaf.label === 'CP') {
		if (!leaf.word.covert) throw new Impossible('Overt leaf CP');
		denotation = covertCp;
	} else if (leaf.label === 'mı') {
		if (leaf.word.covert) throw new Impossible('Covert mı');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`mı: ${leaf.word.text}`);

		const toaq = leaf.word.entry.toaq;
		denotation = nameVerbs[toaq];
		if (denotation === undefined) throw new Unrecognized(`mı: ${toaq}`);
	} else if (leaf.label === 'shu' || leaf.label === 'mo') {
		denotation = quoteVerb;
	} else if (leaf.label === 'word' || leaf.label === 'text') {
		if (leaf.word.covert) throw new Impossible(`Covert ${leaf.label}`);
		denotation = quote(leaf.word.text, []);
	} else if (leaf.label === 'EvA') {
		denotation = eventAccessor;
	} else if (leaf.label === 'Focus') {
		if (leaf.word.covert) throw new Impossible('Covert Focus');
		if (cCommand === null)
			throw new Impossible("Can't denote a Focus in isolation");
		denotation = focus;
		const binding = { index: 0, subordinate: false, timeIntervals: [] };
		if (leaf.binding !== undefined)
			bindings = {
				...noBindings,
				index: new Map([[leaf.binding, binding]]),
				head: new Map([[leaf.word.bare, binding]]),
			};
	} else if (leaf.label === 'FocAdv') {
		if (cCommand === null)
			throw new Impossible("Can't denote a FocAdv in isolation");
		if (!leaf.word.covert)
			throw new Impossible(`Overt FocAdv: ${leaf.word.text}`);
		if (leaf.binding === undefined)
			throw new Impossible('FocAdv without binding');

		const value = leaf.word.value;
		const data = focusAdverbs[value];
		if (data === undefined) throw new Unrecognized(`FocAdv: ${value}`);
		denotation = data;
		bindings = {
			...noBindings,
			index: new Map([
				[leaf.binding, { index: 0, subordinate: false, timeIntervals: [] }],
			]),
		};
	} else if (
		leaf.label === 'C' ||
		leaf.label === 'Crel' ||
		leaf.label === 'teo'
	) {
		denotation = null;
	} else {
		throw new Unimplemented(`TODO: ${leaf.label}`);
	}

	return { ...leaf, denotation, bindings };
}

const branchCache = new WeakMap<Branch<StrictTree>, DTree>();

export function denote_(tree: StrictTree, cCommand: StrictTree | null): DTree {
	if ('word' in tree) {
		return denoteLeaf(tree, cCommand);
	} else {
		// Because the denotation of a branch is a pure function of the branch, and
		// some structures like quantified nPs and focused DPs tend to appear at
		// multiple points in the tree, we can cache their denotations
		const cached = branchCache.get(tree);
		if (cached !== undefined) return cached;

		const left = denote_(tree.left, tree.right);
		const right = denote_(tree.right, tree.left);
		const denoted = compose(tree, left, right);
		branchCache.set(tree, denoted);
		return denoted;
	}
}

/**
 * Annotates a tree with denotations.
 */
export function denote(tree: StrictTree): DTree {
	return denote_(tree, null);
}
