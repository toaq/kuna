import { fixSerial, pro } from './serial';
import {
	CovertValue,
	StrictTree,
	Tree,
	assertBranch,
	assertLeaf,
	effectiveLabel,
} from './tree';
import { Impossible } from './error';
import { reverse } from './misc';

interface Quantification {
	type: 'quantification';
	quantifier: CovertValue;
	nP: StrictTree;
}

interface Focus {
	type: 'focus';
	focusAdverb: CovertValue;
	dp: StrictTree;
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
 * Tracks quantification and focus within a CP.
 */
class Scope {
	private readonly bindingSites: BindingSite[] = [];

	/**
	 * Add a binding site to this scope. The first site added will have the highest
	 * scope.
	 */
	bind(b: BindingSite) {
		this.bindingSites.push(b);
	}

	/**
	 * Wrap the given CompCP (i.e. probably TP) in the QPs found in this scope.
	 */
	wrap(tree: StrictTree): StrictTree {
		for (const b of reverse(this.bindingSites)) {
			let left: StrictTree;
			switch (b.type) {
				case 'quantification':
					left = {
						label: 'QP',
						left: {
							label: 'Q',
							word: { covert: true, value: b.quantifier },
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
						},
						right: b.dp,
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
							},
							right: b.right,
						},
					};
			}
			tree = { label: tree.label, left, right: tree };
		}

		return tree;
	}
}

let indexCount = 0;

export function nextIndex(): string {
	return String.fromCodePoint('𝑖'.codePointAt(0)! + indexCount++);
}

export function fix(tree: Tree, scope?: Scope): StrictTree {
	indexCount = 0;
	if ('children' in tree) {
		if (tree.label === '*𝘷P') {
			const serial = tree.children[0];
			if (!serial) throw new Impossible('*𝘷P without children');
			if (serial.label !== '*Serial') {
				throw new Impossible('*𝘷P without *Serial, instead: ' + serial.label);
			}
			if (!('children' in serial)) throw new Impossible('strange *Serial');
			const vP = fixSerial(serial, tree.children.slice(1));
			return fix(vP, scope);
		} else {
			throw new Impossible('unexpected non-binary tree: ' + tree.label);
		}
	} else if ('left' in tree) {
		if (tree.label === 'VP' && tree.left.label === '*Serial') {
			// Tiny hack to extract a VP from fixSerial:
			const vP = fixSerial(tree.left, [pro(), tree.right]);
			assertBranch(vP);
			assertBranch(vP.right);
			return fix(vP.right.right);
		}
		if (tree.label === 'CP') {
			const newScope = new Scope();
			const right = fix(tree.right, newScope);
			return {
				label: tree.label,
				left: fix(tree.left, scope),
				right: newScope.wrap(right),
			};
		}
		const left = fix(tree.left, scope);
		const right = fix(tree.right, scope);
		if (scope !== undefined && effectiveLabel(tree) === 'DP') {
			if (tree.label === 'DP') {
				const d = tree.left;
				assertLeaf(d);
				if (d.word.covert) throw new Impossible('covert D');
				const q = quantifiers[d.word.entry?.toaq ?? ''];
				if (q) scope.bind({ type: 'quantification', quantifier: q, nP: right });
			} else if (tree.label === 'FocusP') {
				const focus = tree.left;
				assertLeaf(focus);
				if (focus.word.covert) throw new Impossible('covert Focus');
				const focusAdverb = focusAdverbs[focus.word.entry?.toaq ?? ''];
				if (focusAdverb) scope.bind({ type: 'focus', focusAdverb, dp: right });
			} else if (tree.label === '&P') {
				assertBranch(right);
				const and = right.left;
				assertLeaf(and);
				if (and.word.covert) throw new Impossible('covert &');
				const conjunction = conjunctions[and.word.entry?.toaq ?? ''];
				if (conjunction)
					scope.bind({
						type: 'conjunction',
						left,
						conjunction,
						right: right.right,
					});
			}
		}
		return { label: tree.label, left, right };
	} else {
		return tree;
	}
}
