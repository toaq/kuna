import { fixSerial, pro } from './serial';
import {
	Branch,
	CovertValue,
	StrictTree,
	Tree,
	assertBranch,
	assertLeaf,
	effectiveLabel,
	findHead,
} from '../tree';
import { Impossible } from '../core/error';
import { reverse } from '../core/misc';
import { inTone, repairTones } from '../morphology/tokenize';
import { Tone } from '../morphology/tone';
import { moveUp } from '../tree/movement';

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
	 * @param site The binding site.
	 */
	private bind(origin: StrictTree, site: BindingSite) {
		origin.binding = this.newBinding();
		this.bindings.push([site, origin.binding]);
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
	 * Wrap the given CompCP (probably ΣP) in the binding sites for this scope.
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

/**
 * Recurses down a parsed syntax tree to recover the deep structure.
 */
class Recoverer {
	private nextBinding = 0;
	private nextCoindex = 0;
	private nextMovementId = 0;

	constructor() {}

	private newCoindex(): string {
		return String.fromCodePoint('𝑖'.codePointAt(0)! + this.nextCoindex++);
	}

	private newScope(): Scope {
		return new Scope(() => this.nextBinding++);
	}

	private fixSerial(serial: Tree, terms: Tree[]): Tree {
		return fixSerial(serial, terms, () => this.newCoindex());
	}

	private move(source: Tree, target: Tree) {
		assertLeaf(source);
		assertLeaf(target);
		moveUp(source, target);
	}

	recover(tree: Tree, scope: Scope | undefined): StrictTree {
		if ('children' in tree) {
			if (tree.label === '*𝘷P') {
				const serial = tree.children[0];
				if (!serial) throw new Impossible('*𝘷P without children');
				if (serial.label !== '*Serial') {
					throw new Impossible('*𝘷P without *Serial, instead: ' + serial.label);
				}
				if (!('children' in serial)) throw new Impossible('strange *Serial');

				const vP = this.fixSerial(serial, tree.children.slice(1));
				return this.recover(vP, scope);
			} else {
				throw new Impossible('unexpected non-binary tree: ' + tree.label);
			}
		} else if ('left' in tree) {
			if (tree.label === 'VP' && tree.left.label === '*Serial') {
				// Tiny hack to extract a VP from fixSerial:
				const vP = this.fixSerial(tree.left, [pro(), tree.right]);
				assertBranch(vP);
				assertBranch(vP.right);
				return this.recover(vP.right.right, undefined);
			}

			// Subclauses open a new scope
			if (tree.label === 'CP' || tree.label === 'CPrel') {
				const newScope = this.newScope();
				const right = this.recover(tree.right, newScope);
				return {
					label: tree.label,
					left: this.recover(tree.left, scope),
					right: newScope.wrap(right),
				};
			}

			// Conjoined clauses each get a new scope of their own
			if (tree.label === '&P' && effectiveLabel(tree) !== 'DP') {
				const leftScope = this.newScope();
				const left = this.recover(tree.left, leftScope);
				const rightScope = this.newScope();
				assertBranch(tree.right);
				const conjunction = this.recover(tree.right.left, scope);
				const right = this.recover(tree.right.right, rightScope);
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

			const left = this.recover(tree.left, scope);
			const right = this.recover(tree.right, scope);
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

			// v-to-Asp movement
			if (tree.label === 'AspP' && right.label === '𝘷P') {
				this.move(findHead(right), left);
			}

			// Asp-to-T movement
			if (tree.label === 'TP' && right.label === 'AspP') {
				this.move(findHead(right), left);
			}

			return fixed;
		} else {
			return tree;
		}
	}
}

/**
 * Recover a deep-structure Toaq syntax tree by undoing movement and creating
 * QP/FocAdvP around scope boundaries.
 *
 * @param tree A surface-structure tree parsed by the Nearley grammar.
 * @returns A strictly binary deep-structure syntax tree.
 */
export function recover(tree: Tree): StrictTree {
	return new Recoverer().recover(tree, undefined);
}
