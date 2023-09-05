import { analyzeSerial } from './serial';
import { CovertValue, StrictTree, Tree, assertLeaf } from './tree';
import { Impossible } from './error';

interface Quantification {
	quantifier: CovertValue;
	nP: StrictTree;
}

const quantifiers: Record<string, CovertValue> = {
	sá: '[∃]',
	tú: '[∀]',
};

/**
 * Tracks quantifiers encountered in a CP.
 */
class Scope {
	private quantifications: Quantification[];
	constructor() {
		this.quantifications = [];
	}

	/**
	 * Add a quantification to this scope. The first quantification added will
	 * have the highest scope.
	 */
	quantify(quantifier: CovertValue, nP: StrictTree) {
		this.quantifications.push({ quantifier, nP });
	}

	/**
	 * Wrap the given CompCP (i.e. probably TP) in the QPs found in this scope.
	 */
	wrap(tree: StrictTree): StrictTree {
		for (let i = this.quantifications.length - 1; i >= 0; i--) {
			const { quantifier, nP } = this.quantifications[i];
			tree = {
				label: tree.label,
				left: {
					label: 'QP',
					left: {
						label: 'Q',
						word: { covert: true, value: quantifier },
					},
					right: nP,
				},
				right: tree,
			};
		}
		return tree;
	}
}

export function fix(tree: Tree, scope?: Scope): StrictTree {
	if ('children' in tree) {
		if (tree.label === '*𝘷P') {
			const serial = tree.children[0];
			if (!serial) throw new Impossible('*𝘷P without children');
			if (serial.label !== '*Serial')
				throw new Impossible('*𝘷P without *Serial');
			if (!('children' in serial)) throw new Impossible('strange *Serial');
			const vP = analyzeSerial(serial, tree.children.slice(1));
			return fix(vP, scope);
		} else {
			throw new Impossible('unexpected non-binary tree');
		}
	} else if ('left' in tree) {
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
		if (scope && tree.label === 'DP') {
			const d = tree.left;
			assertLeaf(d);
			if (d.word.covert) throw new Impossible('covert D');
			const q = quantifiers[d.word.entry?.toaq ?? ''];
			if (q) {
				scope.quantify(q, right);
			}
		}
		return { label: tree.label, left, right };
	} else {
		return tree;
	}
}
