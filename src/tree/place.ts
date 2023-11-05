import { CanvasRenderingContext2D } from 'canvas';
import { DTree, Expr } from '../semantics/model';
import { toPlainText, typeToPlainText } from '../semantics/render';
import { Branch, Leaf, Rose, Tree } from '../tree';

export interface DenotationRender {
	draw: (
		ctx: CanvasRenderingContext2D,
		centerX: number,
		bottomY: number,
		color: string,
	) => void;
	width(ctx: CanvasRenderingContext2D): number;
}

interface PlacedLeafBase {
	depth: 0;
	width: number;
	label: string;
	denotation?: DenotationRender;
	id?: string;
	movedTo?: string;
}

interface HasWord {
	word: string;
	gloss: string | undefined;
}

interface NoWord {
	word: undefined;
}

export type PlacedLeaf = PlacedLeafBase & (HasWord | NoWord);

export interface PlacedBranch {
	depth: number;
	width: number;
	label: string;
	denotation?: DenotationRender;
	distanceBetweenChildren: number;
	children: PlacedTree[];
}

export type PlacedTree = PlacedLeaf | PlacedBranch;

function getLabel(tree: Tree | DTree): string {
	return 'denotation' in tree && tree.denotation !== null
		? `${tree.label} : ${typeToPlainText(tree.denotation.type)}`
		: tree.label;
}

export function denotationRenderText(denotation: Expr): DenotationRender {
	const text = toPlainText(denotation);
	return {
		draw(ctx, centerX, bottomY, color) {
			ctx.fillStyle = color;
			ctx.fillText(text, centerX, bottomY + 18);
		},
		width(ctx) {
			return ctx.measureText(text).width;
		},
	};
}

export function placeLeaf(
	ctx: CanvasRenderingContext2D,
	leaf: Leaf | (Leaf & { denotation: Expr | null }),
): PlacedLeaf {
	const gloss = leaf.word.covert ? undefined : leaf.word.entry?.gloss;
	const label = getLabel(leaf);
	const word = leaf.word.covert ? leaf.word.value : leaf.word.text;
	const denotation =
		'denotation' in leaf && leaf.denotation !== null
			? denotationRenderText(leaf.denotation)
			: undefined;
	const width = Math.max(
		ctx.measureText(label).width,
		ctx.measureText(word ?? '').width,
		ctx.measureText(gloss ?? '').width,
		denotation ? denotation.width(ctx) : 0,
	);
	return {
		depth: 0,
		width,
		label,
		word,
		gloss,
		denotation,
		id: leaf.id,
		movedTo: leaf.movedTo,
	};
}

function layerExtents(tree: PlacedTree): { left: number; right: number }[] {
	let extents = [];
	let frontier = [{ x: 0, tree }];
	while (frontier.length) {
		const left = Math.min(...frontier.map(e => e.x - e.tree.width / 2));
		const right = Math.max(...frontier.map(e => e.x + e.tree.width / 2));
		extents.push({ left, right });
		let newFrontier = [];
		for (const e of frontier) {
			if ('word' in e.tree) {
				newFrontier.push({
					x: e.x,
					tree: { width: e.tree.width, children: [] } as any as PlacedTree,
				});
				continue;
			}
			const children = e.tree.children;
			const n = children.length;
			for (let i = 0; i < n; i++) {
				const dx = (i - (n - 1) / 2) * e.tree.distanceBetweenChildren;
				newFrontier.push({ x: e.x + dx, tree: children[i] });
			}
		}
		frontier = newFrontier;
	}
	return extents;
}

export function makePlacedBranch(
	ctx: CanvasRenderingContext2D,
	label: string,
	denotation: DenotationRender | undefined,
	children: PlacedTree[],
): PlacedBranch {
	const depth = Math.max(...children.map(c => c.depth)) + 1;
	const width = Math.max(
		ctx.measureText(label).width,
		denotation ? denotation.width(ctx) : 0,
	);
	let distanceBetweenChildren = 0;
	for (let i = 0; i < children.length - 1; i++) {
		const l = layerExtents(children[i]);
		const r = layerExtents(children[i + 1]);
		for (let j = 0; j < Math.min(r.length, l.length); j++) {
			distanceBetweenChildren = Math.max(
				distanceBetweenChildren,
				l[j].right - r[j].left + 30,
			);
		}
	}
	return { depth, width, label, denotation, distanceBetweenChildren, children };
}

export function placeBranch(
	ctx: CanvasRenderingContext2D,
	branch: Branch<Tree> | (Branch<DTree> & { denotation: Expr | null }),
): PlacedBranch {
	const denotation =
		'denotation' in branch && branch.denotation !== null
			? denotationRenderText(branch.denotation)
			: undefined;
	const children = [placeTree(ctx, branch.left), placeTree(ctx, branch.right)];
	return makePlacedBranch(ctx, getLabel(branch), denotation, children);
}

export function placeRose(
	ctx: CanvasRenderingContext2D,
	rose: Rose<Tree>,
): PlacedBranch {
	const children = rose.children.map(c => placeTree(ctx, c));
	return makePlacedBranch(ctx, rose.label, undefined, children);
}

export function placeTree(
	ctx: CanvasRenderingContext2D,
	tree: Tree | DTree,
): PlacedTree {
	return 'word' in tree
		? placeLeaf(ctx, tree)
		: 'children' in tree
		? placeRose(ctx, tree)
		: placeBranch(ctx, tree);
}
