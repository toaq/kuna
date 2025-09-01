import { Impossible } from '../core/error';
import {
	type StrictTree,
	type Tree,
	assertBranch,
	assertLeaf,
	findHead,
	makeNull,
	pro,
} from '../tree';
import { moveUp } from '../tree/movement';
import { fixSerial } from './serial';

const pluralN = makeNull('𝘯', 'PL');
const singularN = makeNull('𝘯', 'SG');

/**
 * Recurses down a parsed syntax tree to recover the deep structure.
 */
class Recoverer {
	private nextCoindex = 0;

	private newCoindex(): string {
		return String.fromCodePoint('𝑖'.codePointAt(0)! + this.nextCoindex++);
	}

	private fixSerial(serial: Tree, terms: Tree[]): Tree {
		return fixSerial(serial, terms, () => this.newCoindex());
	}

	private move(source: Tree, target: Tree) {
		assertLeaf(source);
		assertLeaf(target);
		moveUp(source, target);
	}

	recover(tree: Tree): StrictTree {
		if ('children' in tree) {
			if (tree.label === '*𝘷P') {
				const serial = tree.children[0];
				if (!serial) throw new Impossible('*𝘷P without children');
				if (!(serial.label === '*Serial' || serial.label === '*Serialdet')) {
					throw new Impossible(`*𝘷P without *Serial, instead: ${serial.label}`);
				}
				if (!('children' in serial)) throw new Impossible('strange *Serial');

				const vP = this.fixSerial(serial, tree.children.slice(1));
				return this.recover(vP);
			}
			if (tree.label === '*Serial') {
				// Tiny hack to extract a VP from fixSerial
				const vP = this.fixSerial(tree, [pro()]);
				assertBranch(vP);
				assertBranch(vP.right);
				return this.recover(vP.right.right);
			}
			throw new Impossible(`unexpected non-binary tree: ${tree.label}`);
		}
		if ('left' in tree) {
			if (tree.label === 'VP' && tree.left.label === '*Serial') {
				// Tiny hack to extract a VP from fixSerial
				const vP = this.fixSerial(tree.left, [pro(), tree.right]);
				assertBranch(vP);
				assertBranch(vP.right);
				return this.recover(vP.right.right);
			}

			const left = this.recover(tree.left);
			const right = this.recover(tree.right);

			// Insert 𝘯 in DPs
			if (tree.label === 'DP' && tree.right.label !== 'word') {
				assertLeaf(left);
				if (left.word.covert) throw new Impossible('Covert D');
				const d = left.word.entry?.toaq;
				return {
					label: 'DP',
					left,
					right: {
						label: '𝘯P',
						left: d === 'tú' ? singularN : pluralN,
						right,
						source: right.source,
					},
					source: tree.source,
				};
			}

			const fixed = { label: tree.label, left, right, source: tree.source };

			// v-to-Asp movement
			if (tree.label === 'AspP' && right.label === '𝘷P')
				this.move(findHead(right), left);
			// Asp-to-T movement
			if (tree.label === 'TP' && right.label === 'AspP')
				this.move(findHead(right), left);

			return fixed;
		}
		return tree;
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
	return new Recoverer().recover(tree);
}
