import { fixSerial, pro } from './serial';
import {
	Branch,
	CovertValue,
	StrictTree,
	Tree,
	assertBranch,
	assertLeaf,
	effectiveLabel,
} from '../tree';
import { Impossible } from './error';
import { reverse } from './misc';
import { inTone } from '../morphology/tokenize';
import { Tone } from './types';

interface Quantification {
	type: 'quantification';
	quantifier: CovertValue;
	nP: StrictTree;
}

interface Focus {
	type: 'focus';
	focusAdverb: CovertValue;
	focus: StrictTree;
}

interface Conjunction {
	type: 'conjunction';
	left: StrictTree;
	conjunction: CovertValue;
	right: StrictTree;
}

type BindingSite = Quantification | Focus | Conjunction;

const quantifiers: Record<string, CovertValue> = {
	sá: '∃',
	sía: '¬∃',
	tútu: '∀',
	tú: '∀.SING',
	túq: '∀.CUML',
	báq: 'GEN',
	ké: 'EXO',
	hú: 'ENDO',
	ní: 'DEM',
	níjuı: 'PROX',
	níjao: 'DIST',
};

const focusAdverbs: Record<string, CovertValue> = {
	tó: '[only]',
	máo: '[also]',
	júaq: '[even]',
};

const conjunctions: Record<string, CovertValue> = {
	rú: '[and]',
	rá: '[or]',
	ró: '[xor]',
	rí: '[or?]',
	kéo: '[but]',
};

/**
 * Tracks bound structures and their binding sites within a CP.
 */
class Scope {
	private readonly bindings: [BindingSite, number][] = [];

	constructor(private newBinding: () => number) {}

	/**
	 * Add a binding site to this scope. The first site added will have the highest
	 * scope.
	 * @param origin The structure from which the binding originates.
	 * @param b The binding site.
	 */
	private bind(origin: StrictTree, b: BindingSite) {
		origin.binding = this.newBinding();
		this.bindings.push([b, origin.binding]);
	}

	quantify(dp: Branch<StrictTree>) {
		const { left: d, right: nP } = dp;
		assertLeaf(d);
		if (!d.word.covert && d.word.entry !== undefined) {
			const quantifier = quantifiers[inTone(d.word.entry.toaq, Tone.T2)];
			if (quantifier !== undefined)
				this.bind(d, { type: 'quantification', quantifier, nP });
		}
	}

	focus(focusP: Branch<StrictTree>) {
		const { left: focusParticle, right: focus } = focusP;
		assertLeaf(focusParticle);
		if (focusParticle.word.covert) throw new Impossible('Covert Focus');
		const focusAdverb = focusAdverbs[focusParticle.word.entry?.toaq ?? ''];
		if (focusAdverb !== undefined)
			this.bind(focusParticle, { type: 'focus', focusAdverb, focus });
	}

	conjoin(andP: Branch<StrictTree>) {
		assertBranch(andP.right);
		const {
			left,
			right: { left: and, right },
		} = andP;
		assertLeaf(and);
		if (and.word.covert) throw new Impossible('Covert &');
		const conjunction = conjunctions[and.word.entry?.toaq ?? ''];
		if (conjunction !== undefined)
			this.bind(and, { type: 'conjunction', left, conjunction, right });
	}

	/**
	 * Wrap the given CompCP (probably TP) in the binding sites for this scope.
	 */
	wrap(tree: StrictTree): StrictTree {
		for (const [b, index] of reverse(this.bindings)) {
			let left: StrictTree;
			switch (b.type) {
				case 'quantification':
					left = {
						label: 'QP',
						left: {
							label: 'Q',
							word: { covert: true, value: b.quantifier },
							binding: index,
						},
						right: b.nP,
					};
					break;
				case 'focus':
					left = {
						label: 'FocAdvP',
						left: {
							label: 'FocAdv',
							word: { covert: true, value: b.focusAdverb },
							binding: index,
						},
						right: b.focus,
					};
					break;
				case 'conjunction':
					left = {
						label: '&QP',
						left: b.left,
						right: {
							label: "&Q'",
							left: {
								label: '&Q',
								word: { covert: true, value: b.conjunction },
								binding: index,
							},
							right: b.right,
						},
					};
			}

			left.binding = index;
			tree = { label: tree.label, left, right: tree };
		}

		return tree;
	}
}

let coindexCount = 0;

export function nextCoindex(): string {
	return String.fromCodePoint('𝑖'.codePointAt(0)! + coindexCount++);
}

function fix_(
	tree: Tree,
	newBinding: () => number,
	scope: Scope | undefined,
): StrictTree {
	coindexCount = 0;

	if ('children' in tree) {
		if (tree.label === '*𝘷P') {
			const serial = tree.children[0];
			if (!serial) throw new Impossible('*𝘷P without children');
			if (serial.label !== '*Serial') {
				throw new Impossible('*𝘷P without *Serial, instead: ' + serial.label);
			}
			if (!('children' in serial)) throw new Impossible('strange *Serial');

			const vP = fixSerial(serial, tree.children.slice(1));
			return fix_(vP, newBinding, scope);
		} else {
			throw new Impossible('unexpected non-binary tree: ' + tree.label);
		}
	} else if ('left' in tree) {
		if (tree.label === 'VP' && tree.left.label === '*Serial') {
			// Tiny hack to extract a VP from fixSerial:
			const vP = fixSerial(tree.left, [pro(), tree.right]);
			assertBranch(vP);
			assertBranch(vP.right);
			return fix_(vP.right.right, newBinding, undefined);
		}

		// Subclauses open a new scope
		if (tree.label === 'CP' || tree.label === 'CPrel') {
			const newScope = new Scope(newBinding);
			const right = fix_(tree.right, newBinding, newScope);
			return {
				label: tree.label,
				left: fix_(tree.left, newBinding, scope),
				right: newScope.wrap(right),
			};
		}

		// Conjoined clauses each get a new scope of their own
		if (tree.label === '&P' && effectiveLabel(tree) !== 'DP') {
			const leftScope = new Scope(newBinding);
			const left = fix_(tree.left, newBinding, leftScope);
			const rightScope = new Scope(newBinding);
			assertBranch(tree.right);
			const conjunction = fix_(tree.right.left, newBinding, scope);
			const right = fix_(tree.right.right, newBinding, rightScope);
			return {
				label: tree.label,
				left: leftScope.wrap(left),
				right: {
					label: tree.right.label,
					left: conjunction,
					right: rightScope.wrap(right),
				},
			};
		}

		const left = fix_(tree.left, newBinding, scope);
		const right = fix_(tree.right, newBinding, scope);
		const fixed = { label: tree.label, left, right };

		if (scope !== undefined && effectiveLabel(tree) === 'DP') {
			if (tree.label === 'DP') {
				scope.quantify(fixed);
			} else if (tree.label === 'FocusP') {
				scope.focus(fixed);
			} else if (tree.label === '&P') {
				scope.conjoin(fixed);
			}
		}

		return fixed;
	} else {
		return tree;
	}
}

export function fix(tree: Tree): StrictTree {
	let nextBinding = 0;
	return fix_(tree, () => nextBinding++, undefined);
}
