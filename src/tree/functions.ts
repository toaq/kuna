import { Impossible } from '../core/error';
import { bare, clean } from '../morphology/tokenize';
import { repairTones } from '../morphology/tone';
import { type Label, type Tree, assertBranch } from './types';

export function isBoringNull(tree: Tree): boolean {
	return (
		'word' in tree &&
		tree.word.covert &&
		(tree.word.value === '∅' ||
			tree.word.value === 'REL' ||
			tree.word.value === 'PRO')
	);
}

/**
 * Iterates over the children of a tree.
 */
export function treeChildren(tree: Tree): Tree[] {
	return 'children' in tree
		? tree.children
		: 'left' in tree
			? [tree.left, tree.right]
			: [];
}

/** Extract the head X from an XP or X'. */
export function findHead(tree: Tree): Tree {
	if (tree.label.match(/['P]$/)) {
		const headLabel = tree.label.replace(/['P]$/, '');
		for (const child of treeChildren(tree)) {
			if (child.label.replace(/['P]$/, '') === headLabel) {
				return findHead(child);
			}
		}
		throw new Impossible(`${tree.label} without ${headLabel} child`);
	}
	return tree;
}

/** Depth-first search for a subtree with the given label. */
export function findSubtree(tree: Tree, label: Label): Tree | undefined {
	if (tree.label === label) return tree;
	for (const child of treeChildren(tree)) {
		const result = findSubtree(child, label);
		if (result) return result;
	}
	return undefined;
}

export function nodeType(label: Label): 'phrase' | 'bar' | 'head' {
	if (label.endsWith('P') || label === '*𝘷Pdet') {
		return 'phrase';
	}
	if (label.endsWith("'")) {
		return 'bar';
	}
	return 'head';
}

export function effectiveLabel(tree: Tree): Label {
	if (tree.label === '&P') {
		assertBranch(tree);
		return effectiveLabel(tree.left);
	}
	if (tree.label === 'FocusP') {
		assertBranch(tree);
		return effectiveLabel(tree.right);
	}
	return tree.label;
}

export function containsWords(
	tree: Tree,
	words: string[],
	stopLabels: Label[],
): boolean {
	if ('word' in tree) {
		return !tree.word.covert && words.includes(clean(tree.word.text));
	}
	return treeChildren(tree).some(
		child =>
			!stopLabels.includes(child.label) &&
			containsWords(child, words, stopLabels),
	);
}

export function circled(i: number): string {
	return '⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'[i] ?? `(${i})`;
}

export function leafText(tree: Tree): string {
	if (!('word' in tree)) {
		throw new Impossible(`Unexpected non-leaf ${tree.label}`);
	}
	if (tree.movement?.text) {
		return tree.movement.text;
	}
	if (tree.movement?.movedTo) {
		return '';
	}
	if (tree.word.covert) return '';
	return tree.word.text;
}

export function treeText(tree: Tree, cpIndices?: Map<Tree, number>): string {
	if ('word' in tree) {
		return leafText(tree);
	}
	if (cpIndices) {
		const cpIndex = cpIndices.get(tree);
		if (cpIndex !== undefined) {
			return circled(cpIndex);
		}
	}

	const children = treeChildren(tree).map(x => treeText(x));
	return repairTones(children.join(' ').trim());
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
	}
	const children = treeChildren(tree);
	// Hack to avoid descending into PRO leaves @_@
	let i = children.length - 1;
	while (i >= 0 && isCovertLeaf(children[i])) i -= 1;
	return i >= 0 ? findAtRightBoundary(children[i], predicate) : undefined;
}

export function endsInClauseBoundary(tree: Tree): Tree | undefined {
	return findAtRightBoundary(
		tree,
		t => t.label === 'CP' && 'left' in t && treeText(t.left) !== '',
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

export function catSource(...args: (Tree | string | undefined | null)[]) {
	return repairTones(
		args
			.map(x => (typeof x === 'string' ? x : x ? x.source : undefined))
			.filter(x => x)
			.join(' '),
	);
}
