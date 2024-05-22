import { Impossible, Unimplemented } from '../core/error';
import { some } from '../core/misc';
import { Branch, StrictTree, effectiveLabel } from '../tree';
import {
	and,
	app,
	DTree,
	Expr,
	ExprType,
	Bindings,
	v,
	λ,
	subtype,
	Binding,
} from './model';
import {
	bindTimeIntervals,
	filterPresuppositions,
	freeVariableUsages,
	makeWorldExplicit,
	mapBindings,
	reduce,
	rewriteContext,
	skolemize,
	unifyDenotations,
} from './operations';

export type CompositionRule = (
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
		if (branch.binding === undefined)
			throw new Impossible('QP without binding');
		const [l, r, bindings] = unifyDenotations(left, right);
		if (bindings.covertResumptive === undefined)
			throw new Impossible("Can't identify the references to be dropped");
		const index = bindings.covertResumptive.index;
		// Create an index binding
		bindings.index.set(branch.binding, bindings.covertResumptive);
		// Drop all references to the bindings originating in 𝘯
		const rPruned = filterPresuppositions(
			r,
			p => !some(freeVariableUsages(p), i => i === index),
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
		let l: Expr;
		let r: Expr;
		let bindings: Bindings;
		let index: number;
		if (left.binding === undefined) {
			[l, r, bindings] = unifyDenotations(left, right);
			if (bindings.covertResumptive === undefined)
				throw new Impossible("Can't identify the variable to be abstracted");
			index = bindings.covertResumptive.index;
		} else {
			const rightBinding = right.bindings.index.get(left.binding);
			if (rightBinding === undefined)
				throw new Impossible("Can't identify the variable to be abstracted");
			// Skolemize all variables that are defined in terms of the variable to be
			// abstracted
			const [skm, skmMapping] = skolemize(right.denotation, rightBinding.index);
			const skmRight: DTree = {
				...right,
				denotation: skm,
				bindings: mapBindings(right.bindings, b => {
					const index = skmMapping[b.index];
					return index === null
						? undefined
						: {
								index,
								subordinate: b.subordinate,
								timeIntervals: b.timeIntervals.map(i => skmMapping[i]!),
							};
				}),
			};

			// Because unifyDenotations works asymmetrically and assumes that the left
			// has more binding information than the right, we need to pretend here that
			// the branches are the other way around; the right may in fact have more
			// binding information than the left's hoisted sub-tree.
			// TODO: I think this still doesn't get us quite the right behavior if
			// something in between the binding site and the bound structure shadows the
			// binding. For example, in "Do sá raı sá raı sá raq lô raı".
			[r, l, bindings] = unifyDenotations(skmRight, left);
			index = bindings.index.get(left.binding)!.index;
		}

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
		case 'VP':
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

/**
 * Denotes a branch by composing the denotations of its children.
 */
export function compose(
	branch: Branch<StrictTree>,
	left: DTree,
	right: DTree,
): DTree {
	return getCompositionRule(left, right)(branch, left, right);
}
