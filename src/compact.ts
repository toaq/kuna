import { Branch, Leaf, Tree, nodeType } from './tree';

export function compact(tree: Tree): Tree {
	if ('word' in tree) {
		return tree;
	} else if ('children' in tree) {
		return { label: tree.label, children: tree.children.map(compact) };
	}

	const recurse = (tree: Branch): Branch => ({
		label: tree.label,
		left: compact(tree.left),
		right: compact(tree.right),
	});

	if (nodeType(tree.label) !== 'phrase') return recurse(tree);

	let restOfTree: Tree | undefined;
	for (const direction of ['left', 'right'] as const) {
		const child = tree[direction];
		switch (nodeType(child.label)) {
			case 'phrase':
				restOfTree = child;
				break;
			case 'bar':
				return recurse(tree);
			case 'head':
				if (typeof (child as Leaf).word === 'object') {
					return recurse(tree);
				}
		}
	}

	if (!restOfTree) return recurse(tree);

	return compact(restOfTree);
}
