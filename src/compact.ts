import { Branch, Leaf, Tree, nodeType } from './tree';

function isCovert(tree: Tree): boolean {
	return 'word' in tree && typeof tree.word === 'string';
}

export function compact(tree: Tree): Tree {
	if ('word' in tree) {
		return tree;
	} else if ('children' in tree) {
		return { label: tree.label, children: tree.children.map(compact) };
	}

	if (isCovert(tree.left)) {
		return compact(tree.right);
	} else if (isCovert(tree.right)) {
		return compact(tree.left);
	} else {
		return {
			label: tree.label,
			left: compact(tree.left),
			right: compact(tree.right),
		};
	}
}
