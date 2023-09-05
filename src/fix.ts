import { entryArity } from './dictionary';
import { analyzeSerial, getFrame } from './serial';
import { StrictTree, Tree } from './tree';

export function fix(tree: Tree): StrictTree {
	if ('children' in tree) {
		if (tree.label === '*𝘷P') {
			const serial = tree.children[0];
			if (!serial) throw new Error('*𝘷P without children');
			if (serial.label !== '*Serial') throw new Error('*𝘷P without *Serial');
			if (!('children' in serial)) throw new Error('strange *Serial');
			const vP = analyzeSerial(serial, tree.children.slice(1));
			return fix(vP);
		} else {
			throw new Error('unexpected non-binary tree');
		}
	} else if ('left' in tree) {
		return { label: tree.label, left: fix(tree.left), right: fix(tree.right) };
	} else {
		return tree;
	}
}
