import { bare, clean, repairTones } from '../morphology/tokenize';
import { Label, Tree, assertBranch } from './types';

export function isBoringNull(tree: Tree): boolean {
	return (
		'word' in tree &&
		tree.word.covert &&
		(tree.word.value === '∅' ||
			tree.word.value === 'BE' ||
			tree.word.value === 'CAUSE' ||
			tree.word.value === 'PRO')
	);
}

/** Extract the head X from an XP or X'. */
export function findHead(tree: Tree): Tree {
	while (tree.label.match(/['P]$/)) {
		const headLabel = tree.label.replace(/['P]$/, '');
		if ('left' in tree) {
			if (tree.left.label.replace(/['P]$/, '') === headLabel) {
				tree = tree.left;
			} else {
				tree = tree.right;
			}
		} else if ('children' in tree) {
			for (const child of tree.children) {
				if (child.label.replace(/['P]$/, '') === headLabel) {
					tree = child;
					break;
				}
			}
		}
	}
	return tree;
}

export function nodeType(label: Label): 'phrase' | 'bar' | 'head' {
	if (label.endsWith('P') || label === 'CPrel' || label === '*𝘷Pdet') {
		return 'phrase';
	} else if (label.endsWith("'")) {
		return 'bar';
	} else {
		return 'head';
	}
}

export function effectiveLabel(tree: Tree): Label {
	if (tree.label === '&P') {
		assertBranch(tree);
		return effectiveLabel(tree.left);
	} else if (tree.label === 'FocusP') {
		assertBranch(tree);
		return effectiveLabel(tree.right);
	} else {
		return tree.label;
	}
}

export function containsWords(
	tree: Tree,
	words: string[],
	stopLabels: Label[],
): boolean {
	if ('word' in tree) {
		return !tree.word.covert && words.includes(clean(tree.word.text));
	} else if ('left' in tree) {
		return (
			(!stopLabels.includes(tree.left.label) &&
				containsWords(tree.left, words, stopLabels)) ||
			(!stopLabels.includes(tree.right.label) &&
				containsWords(tree.right, words, stopLabels))
		);
	} else {
		return tree.children.some(
			child =>
				!stopLabels.includes(child.label) &&
				containsWords(child, words, stopLabels),
		);
	}
}

function circled(i: number): string {
	return i < 10 ? '⓪①②③④⑤⑥⑦⑧⑨'[i] : `(${i})`;
}

export function treeText(tree: Tree, cpIndices?: Map<Tree, number>): string {
	if ('word' in tree) {
		if (tree.word.covert) {
			return '';
		} else {
			return tree.word.text;
		}
	} else if ('left' in tree) {
		if (cpIndices) {
			const cpIndex = cpIndices.get(tree);
			if (cpIndex !== undefined) {
				return circled(cpIndex);
			}
		}

		return repairTones(
			(treeText(tree.left) + ' ' + treeText(tree.right)).trim(),
		);
	} else {
		return repairTones(
			tree.children
				.map(x => treeText(x))
				.join(' ')
				.trim(),
		);
	}
}

export function isQuestion(tree: Tree): boolean {
	return containsWords(
		tree,
		['hí', 'rí', 'rı', 'rî', 'ma', 'tıo', 'hıa'],
		['CP'],
	);
}

export function isCovertLeaf(tree: Tree): boolean {
	return 'word' in tree && tree.word.covert;
}

function findAtRightBoundary(
	tree: Tree,
	predicate: (t: Tree) => boolean,
): Tree | undefined {
	if (predicate(tree)) {
		return tree;
	} else if ('children' in tree) {
		// Hack to avoid descending into PRO leaves @_@
		let i = tree.children.length - 1;
		while (i >= 0 && isCovertLeaf(tree.children[i])) i -= 1;
		return i >= 0
			? findAtRightBoundary(tree.children[i], predicate)
			: undefined;
	} else if ('right' in tree) {
		// Same here
		const child = isCovertLeaf(tree.right) ? tree.left : tree.right;
		return findAtRightBoundary(child, predicate);
	} else {
		return undefined;
	}
}

export function endsInClauseBoundary(tree: Tree): Tree | undefined {
	return findAtRightBoundary(
		tree,
		t =>
			t.label === 'CP' ||
			(t.label === 'CPrel' && 'left' in t && treeText(t.left) !== ''),
	);
}

export function endsInDP(tree: Tree) {
	return findAtRightBoundary(tree, t => t.label === 'DP' && treeText(t) !== '');
}

export function labelForPrefix(word: string): Label {
	const p = bare(word).replace(/-$/, '');
	switch (p) {
		case 'beı':
		case 'juaq':
		case 'ku':
		case 'mao':
		case 'to':
			return 'Focus';
		case 'fa':
		case 'ruı':
			return 'Telicity';
		default:
			return p as Label;
	}
}

export function skipFree(tree: Tree): Tree {
	// For now we already don't keep "free" constituents (interjections,
	// parentheticals) in the tree.
	return tree;
}
