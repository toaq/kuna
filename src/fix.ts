import { entryArity } from './dictionary';
import { StrictTree, Tree } from './tree';

export function fix(tree: Tree): StrictTree {
	if ('children' in tree) {
		if (tree.label === '*𝘷P') {
			const serial = tree.children[0];
			if (!serial) throw new Error('*𝘷P without children');
			if (serial.label !== '*Serial') throw new Error('*𝘷P without *Serial');
			if (!('children' in serial)) throw new Error('strange *Serial');
			if (serial.children.length !== 1) throw new Error('unsupported serial');
			const verb = serial.children[0];
			if (verb.label !== 'V') throw new Error('non-V *Serial');
			if (!('word' in verb)) throw new Error('strange V');
			const word = verb.word;
			if (word === 'covert') throw new Error('covert *𝘷P V');
			if (word === 'functional') throw new Error('functional *𝘷P V');
			const entry = word.entry;
			if (!entry) throw new Error('unrecognized V');
			if (entry.type !== 'predicate') throw new Error('nonpred V');
			const arity = entryArity(entry);
			if (arity === 1) {
				return {
					label: '𝘷P',
					left: { label: '𝘷0', word: 'functional' },
					right: { label: 'VP', left: verb, right: fix(tree.children[1]) },
				};
			} else if (arity === 2) {
				return {
					label: '𝘷P',
					left: fix(tree.children[1]),
					right: {
						label: "𝘷'",
						left: { label: '𝘷', word: 'functional' },
						right: { label: 'VP', left: verb, right: fix(tree.children[2]) },
					},
				};
			} else if (arity === 3) {
				return {
					label: '𝘷P',
					left: fix(tree.children[1]),
					right: {
						label: "𝘷'",
						left: { label: '𝘷', word: 'functional' },
						right: {
							label: 'VP',
							left: fix(tree.children[2]),
							right: { label: "V'", left: verb, right: fix(tree.children[3]) },
						},
					},
				};
			} else {
				throw new Error('unexpected arity');
			}
		} else {
			throw new Error('unexpected non-binary tree');
		}
	} else if ('left' in tree) {
		return { label: tree.label, left: fix(tree.left), right: fix(tree.right) };
	} else {
		return tree;
	}
}
