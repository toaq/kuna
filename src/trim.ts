import { Tree } from './tree';

function isNull(tree: Tree): boolean {
	return 'word' in tree && tree.word.covert && tree.word.value === '∅';
}

/**
 * Trim null leaves from a tree and coalesce the labels. For example,
 *
 *         XP                   XP·YP
 *        /  \      becomes      / \
 *       X    YP                …   …
 *       ø   /  \
 *          …    …
 */
export function trimTree(tree: Tree): Tree {
	if ('word' in tree) {
		return tree;
	} else if ('children' in tree) {
		return { label: tree.label, children: tree.children.map(trimTree) };
	}

	if (isNull(tree.left)) {
		let result = trimTree(tree.right);
		result.label = (tree.label + '·' + result.label) as any;
		return result;
	} else if (isNull(tree.right)) {
		let result = trimTree(tree.left);
		result.label = (tree.label + '·' + result.label) as any;
		return result;
	} else {
		return {
			label: tree.label,
			left: trimTree(tree.left),
			right: trimTree(tree.right),
		};
	}
}
