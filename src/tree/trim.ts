import { type Tree, isBoringNull } from '.';

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
		return { ...tree, children: tree.children.map(trimTree) };
	}

	if (isBoringNull(tree.left)) {
		const result = { ...trimTree(tree.right) };
		result.label = (tree.label + '·' + result.label) as any;
		console.log({ result, tree });
		if ((tree as any).denotation)
			(result as any).denotation = (tree as any).denotation;
		return result;
	} else if (isBoringNull(tree.right)) {
		const result = { ...trimTree(tree.left) };
		result.label = (tree.label + '·' + result.label) as any;
		if ((tree as any).denotation)
			(result as any).denotation = (tree as any).denotation;
		return result;
	} else {
		return {
			...tree,
			left: trimTree(tree.left),
			right: trimTree(tree.right),
		};
	}
}
