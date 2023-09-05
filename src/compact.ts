import { Branch, Leaf, Tree, nodeType } from './tree';

function isNull(tree: Tree): boolean {
	return 'word' in tree && tree.word.covert && tree.word.value === '∅';
}

export function compact(tree: Tree): Tree {
	if ('word' in tree) {
		return tree;
	} else if ('children' in tree) {
		return { label: tree.label, children: tree.children.map(compact) };
	}

	if (isNull(tree.left)) {
		return compact(tree.right);
	} else if (isNull(tree.right)) {
		return compact(tree.left);
	} else {
		return {
			label: tree.label,
			left: compact(tree.left),
			right: compact(tree.right),
		};
	}
}
