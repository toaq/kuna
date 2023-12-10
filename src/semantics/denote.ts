import { VerbEntry } from '../dictionary';
import {
	Impossible,
	Ungrammatical,
	Unimplemented,
	Unrecognized,
} from '../error';
import {
	Branch,
	CovertWord,
	Leaf,
	StrictTree,
	Word,
	effectiveLabel,
} from '../tree';
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
} from './data';
import {
	and,
	app,
	DTree,
	Expr,
	ExprType,
	noBindings,
	Bindings,
	v,
	verb,
	λ,
	subtype,
	AnimacyClass,
	quote,
	cloneBindings,
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

			denotation = denoteVerb(
				entry.toaq,
				// Agents are external to the verb, so not counted in the arity
				entry.frame.split(' ').length - (entry.subject === 'agent' ? 1 : 0),
			);
		}
	} else if (leaf.label === 'DP') {
		if (leaf.word.covert) {
			[denotation] = dps.hóa;
			bindings = covertHoaBindings;
		} else if (leaf.word.entry === undefined) {
			throw new Unrecognized(`DP: ${leaf.word.text}`);
		} else {
			const toaq = leaf.word.entry.toaq;
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
			bindings = { ...noBindings, head: { [cCommand.word.bare]: binding } };
		} else {
			const vp = findVp(cCommand);
			if (vp === null) throw new Impossible("Can't find the VP for this D");
			const verb = getVerbWord(vp);

			denotation = boundThe;
			bindings = cloneBindings(noBindings);
			bindings.covertResumptive = binding;
			if (leaf.word.text !== '◌́') {
				bindings.head[leaf.word.bare] = binding;
				bindings.origin.set(cCommand, binding);
			}
			if (!verb.covert) {
				bindings.variable[(verb.entry as VerbEntry).toaq] = binding;
				bindings.animacy[animacyClass(verb.entry as VerbEntry)] = binding;
			}
		}
	} else if (leaf.label === '𝘯') {
		if (cCommand === null)
			throw new Impossible("Can't denote an 𝘯 in isolation");
		const vp = findVp(cCommand);
		if (vp === null) throw new Impossible("Can't find the VP for this 𝘯");
		const verb = getVerbWord(vp);

		denotation = verb.covert
			? animacies.descriptive
			: animacies[animacyClass(verb.entry as VerbEntry)];
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

		const toaq = leaf.word.entry.toaq;
		if (toaq === 'róı') {
			denotation = pluralCoordinator;
		} else {
			const conjunct = effectiveLabel(cCommand);
			if (conjunct === 'DP') {
				denotation = argumentCoordinator;
				bindings = {
					...noBindings,
					origin: new Map([
						[cCommand, { index: 0, subordinate: false, timeIntervals: [] }],
					]),
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
		const value = leaf.word.value;
		const data = argumentConjunctions[value];
		if (data === undefined) throw new Unrecognized(`&Q: ${value}`);
		denotation = data;
		bindings = {
			...noBindings,
			origin: new Map([
				[cCommand, { index: 0, subordinate: false, timeIntervals: [] }],
			]),
		};
	} else if (leaf.label === 'Modal') {
		if (leaf.word.covert) throw new Impossible('Covert Modal');
		if (leaf.word.entry === undefined)
			throw new Unrecognized(`Modal: ${leaf.word.text}`);

		const toaq = leaf.word.entry.toaq;
		denotation = modals[toaq];
		if (denotation === undefined) throw new Unrecognized(`Modal: ${toaq}`);
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
		if (cCommand === null)
			throw new Impossible("Can't denote a Focus in isolation");
		denotation = focus;
		bindings = {
			...noBindings,
			origin: new Map([
				[cCommand, { index: 0, subordinate: false, timeIntervals: [] }],
			]),
		};
	} else if (leaf.label === 'FocAdv') {
		if (cCommand === null)
			throw new Impossible("Can't denote a FocAdv in isolation");
		if (!leaf.word.covert)
			throw new Impossible(`Overt FocAdv: ${leaf.word.text}`);
		const value = leaf.word.value;
		const data = focusAdverbs[value];
		if (data === undefined) throw new Unrecognized(`FocAdv: ${value}`);
		denotation = data;
		bindings = {
			...noBindings,
			origin: new Map([
				[cCommand, { index: 0, subordinate: false, timeIntervals: [] }],
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
		const compatibleArgument = subtype(
			argument.denotation.type,
			(fn.denotation.type as [ExprType, ExprType])[0],
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
const predicateModificationTemplate = (type: ExprType, context: ExprType[]) =>
	λ([type, 't'], context, c =>
		λ([type, 't'], c, c =>
			λ(type, c, c => and(app(v(2, c), v(0, c)), app(v(1, c), v(0, c)))),
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
			app(
				app(
					predicateModificationTemplate(
						(l.type as [ExprType, ExprType])[0],
						l.context,
					),
					l,
				),
				r,
			),
		);
		bindings = b;
	}

	return { ...branch, left, right, denotation, bindings };
};

const propositionAbstraction: CompositionRule = (branch, left, right) => {
	if (right.denotation === null) {
		throw new Impossible(`Proposition abstraction on a null ${right.label}`);
	} else {
		const worldIndex = right.denotation.context.findIndex(t => t === 's');
		if (worldIndex === -1)
			throw new Impossible(
				`Proposition abstraction on something without a world variable`,
			);

		const newContext = [...right.denotation.context];
		newContext.splice(worldIndex, 1);
		const indexMapping = (i: number) => (i < worldIndex ? i : i - 1);

		return {
			...branch,
			left,
			right,
			denotation: reduce(
				λ('s', newContext, c =>
					rewriteContext(right.denotation!, c, i =>
						i === worldIndex ? 0 : indexMapping(i) + 1,
					),
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

const dComposition: CompositionRule = (branch, left, right) => {
	if (left.denotation === null) {
		throw new Impossible(`D composition on a null ${left.label}`);
	} else if (right.denotation === null) {
		throw new Impossible(`D composition on a null ${right.label}`);
	} else {
		const [d, np, bindings] = unifyDenotations(left, right);
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
		if (bindings.covertResumptive === undefined)
			throw new Impossible("Can't identify the references to be dropped");
		const index = bindings.covertResumptive.index;
		// Create an origin binding
		bindings.origin.set(branch.right, bindings.covertResumptive);
		// Drop all references to the bindings originating in 𝘯
		const rPruned = filterPresuppositions(
			r,
			p =>
				!someSubexpression(p, e => e.head === 'variable' && e.index === index),
		);
		// Delete the covert resumptive binding as it was only needed to perform this
		// composition and should not leak outside the QP
		bindings.covertResumptive = undefined;

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

const andComposition: CompositionRule = (branch, left, right) => {
	if (left.denotation === null) {
		throw new Impossible(`and-composition on a null ${left.label}`);
	} else if (right.denotation === null) {
		throw new Impossible(`and-composition on a null ${right.label}`);
	} else {
		const [l, r, bindings] = unifyDenotations(left, right);
		return { ...branch, left, right, denotation: and(l, r), bindings };
	}
};

const predicateAbstraction: CompositionRule = (branch, left, right) => {
	if (left.denotation === null) {
		throw new Impossible(`Predicate abstraction on a null ${left.label}`);
	} else if (right.denotation === null) {
		throw new Impossible(`Predicate abstraction on a null ${right.label}`);
	} else {
		const [l, r, bindings] = unifyDenotations(left, right);
		// XXX This is a big hack, we should just put IDs in the root nodes of binding
		// sites or something as a way of matching them up
		const index = (
			'word' in branch.left
				? bindings.covertResumptive
				: bindings.origin.get(
						branch.left.label === '&QP' && !('word' in branch.left.right)
							? branch.left.right.right
							: branch.left.right,
				  )
		)?.index;
		if (index === undefined)
			throw new Impossible("Can't identify the variable to be abstracted");

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
	const leftLabel = effectiveLabel(left);
	switch (leftLabel) {
		case 'V':
		case 'Asp':
		case '𝘯':
		case 'Σ':
		case '&':
		case '&Q':
		case 'Modal':
		case 'ModalP':
		case 'mı':
		case 'mıP':
		case 'shu':
		case 'shuP':
		case 'mo':
		case 'moP':
		case 'teoP':
		case 'EvA':
		case 'Focus':
		case 'FocAdv':
			return functionalApplication;
		case 'T':
			// Existential tenses use FA, while pronomial tenses use reverse FA
			return Array.isArray(left.denotation?.type)
				? functionalApplication
				: reverseFunctionalApplication;
		case '𝘷':
			if (left.denotation === null) {
				return effectiveLabel(right) === 'TP'
					? propositionAbstraction
					: functionalApplication;
			} else {
				return subtype(left.denotation.type, ['e', ['v', 't']])
					? eventIdentification
					: functionalApplication;
			}
		case 'C':
			return propositionAbstraction;
		case 'Crel':
			return cRelComposition;
		case 'D':
			return effectiveLabel(right) === '𝘯P'
				? dComposition
				: functionalApplication;
		case 'Q':
			return qComposition;
		case 'QP':
		case 'FocAdvP':
		case 'Adjunct':
		case '&QP':
			return predicateAbstraction;
		case 'SAP':
			return andComposition;
	}

	const rightLabel = effectiveLabel(right);
	switch (rightLabel) {
		case "𝘷'":
		case 'SA':
		case "V'":
		case "&'":
		case "&Q'":
		case "EvA'":
			return reverseFunctionalApplication;
		case 'CPrel':
		case 'AdjunctP':
			return predicateModification;
	}

	// AdjunctP is placed here because &' should take precedence over it
	if (leftLabel === 'AdjunctP') return predicateModification;

	throw new Unimplemented(
		`TODO: composition of ${leftLabel} and ${rightLabel}`,
	);
}

function denoteBranch(
	branch: Branch<StrictTree>,
	left: DTree,
	right: DTree,
): DTree {
	return getCompositionRule(left, right)(branch, left, right);
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
		const denoted = denoteBranch(tree, left, right);
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
