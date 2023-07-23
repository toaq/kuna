import { entryArity } from './dictionary';
import { StrictTree, Tree } from './tree';

export function fix(tree: Tree): StrictTree {
	if ('children' in tree) {
		if (tree.label === '*𝑣P') {
			const serial = tree.children[0];
			if (!serial) throw new Error('*𝑣P without children');
			if (serial.label !== '*Serial') throw new Error('*𝑣P without *Serial');
			if (!('children' in serial)) throw new Error('strange *Serial');
			if (serial.children.length !== 1) throw new Error('unsupported serial');
			const verb = serial.children[0];
			if (verb.label !== 'V') throw new Error('non-V *Serial');
			if (!('word' in verb)) throw new Error('strange V');
			const word = verb.word;
			if (word === 'covert') throw new Error('covert *𝑣P V');
			if (word === 'functional') throw new Error('functional *𝑣P V');
			const entry = word.entry;
			if (!entry) throw new Error('unrecognized V');
			if (entry.type !== 'predicate') throw new Error('nonpred V');
			const arity = entryArity(entry);
			console.log(arity, tree.children.length);
			if (arity === 1) {
				return {
					label: '𝑣P',
					left: { label: '𝑣0', word: 'functional' },
					right: { label: 'VP', left: verb, right: fix(tree.children[1]) },
				};
			} else if (arity === 2) {
				return {
					label: '𝑣P',
					left: fix(tree.children[1]),
					right: {
						label: "𝑣'",
						left: { label: '𝑣', word: 'functional' },
						right: { label: 'VP', left: verb, right: fix(tree.children[2]) },
					},
				};
			} else if (arity === 3) {
				return {
					label: '𝑣P',
					left: fix(tree.children[1]),
					right: {
						label: "𝑣'",
						left: { label: '𝑣', word: 'functional' },
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
