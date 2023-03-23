import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import { DBranch, DLeaf, DTree, formulaToText } from './denote';
import { Branch, Leaf, Rose, Tree } from './tree';

interface PlacedLeaf {
	depth: 0;
	width: number;
	label: string;
	word: string;
	gloss?: string;
	denotation?: string;
}

interface PlacedBranch {
	depth: number;
	width: number;
	label: string;
	denotation?: string;
	distanceBetweenChildren: number;
	children: PlacedTree[];
}

type PlacedTree = PlacedLeaf | PlacedBranch;

export function placeLeaf(
	ctx: CanvasRenderingContext2D,
	leaf: Leaf | DLeaf,
): PlacedLeaf {
	const gloss =
		typeof leaf.word === 'string' ? undefined : leaf.word.entry?.gloss;
	const label = leaf.label;
	const word =
		leaf.word === 'functional'
			? ''
			: leaf.word === 'covert'
			? 'Ø'
			: leaf.word.text;
	const denotation =
		'denotation' in leaf ? formulaToText(leaf.denotation) : undefined;
	const width = Math.max(
		ctx.measureText(label).width,
		ctx.measureText(word).width,
		ctx.measureText(gloss ?? '').width,
		ctx.measureText(denotation ?? '').width,
	);
	return { depth: 0, width, label, word, gloss, denotation };
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
	denotation: string | undefined,
	children: PlacedTree[],
): PlacedBranch {
	const depth = Math.max(...children.map(c => c.depth)) + 1;
	const width = Math.max(
		ctx.measureText(label).width,
		ctx.measureText(denotation ?? '').width,
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
	branch: Branch | DBranch,
): PlacedBranch {
	const denotation =
		'denotation' in branch ? formulaToText(branch.denotation) : undefined;
	const children = [placeTree(ctx, branch.left), placeTree(ctx, branch.right)];
	return makePlacedBranch(ctx, branch.label, denotation, children);
}

export function placeRose(
	ctx: CanvasRenderingContext2D,
	rose: Rose,
): PlacedBranch {
	const children = rose.children.map(c => placeTree(ctx, c));
	return makePlacedBranch(ctx, rose.label, '', children);
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

function drawTree(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	tree: PlacedTree,
	extent: { minX: number; maxX: number; minY: number; maxY: number },
): void {
	function text(t: string, x: number, y: number): void {
		ctx.fillText(t, x, y);
		const m = ctx.measureText(t);
		const minX = x - m.width / 2 - 10;
		if (minX < extent.minX) extent.minX = minX;
		const maxX = x + m.width / 2 + 10;
		if (maxX > extent.maxX) extent.maxX = maxX;
		const minY = y - 10;
		if (minY < extent.minY) extent.minY = minY;
		const maxY = y + 40;
		if (maxY > extent.maxY) extent.maxY = maxY;
	}
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	if ('word' in tree) {
		ctx.fillStyle = '#DCDDDE';
		text(tree.label, x, y);
		ctx.fillStyle = '#FF4466';
		const denotation = tree.denotation ?? '';
		text(denotation, x, y + 30);
		ctx.strokeStyle = '#DCDDDE';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x, y + (denotation ? 75 : 45));
		ctx.lineTo(x, y + 95);
		ctx.stroke();
		ctx.fillStyle = '#99EEFF';
		text(tree.word, x, y + 100);
		ctx.fillStyle = '#DCDDDE';
		text(tree.gloss ?? '', x, y + 130);
	} else {
		ctx.fillStyle = '#DCDDDE';
		text(tree.label, x, y);
		const denotation = tree.denotation ?? '';
		ctx.fillStyle = '#FF4466';
		text(denotation, x, y + 30);
		const n = tree.children.length;
		for (let i = 0; i < n; i++) {
			const dx = (i - (n - 1) / 2) * tree.distanceBetweenChildren;
			drawTree(ctx, x + dx, y + 100, tree.children[i], extent);
			ctx.strokeStyle = '#DCDDDE';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x, y + (denotation ? 75 : 45));
			ctx.lineTo(x + dx, y + 95);
			ctx.stroke();
		}
	}
}

export function pngDrawTree(tree: Tree | DTree): Buffer {
	const width = 2400;
	const height = 2400;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#36393E';
	ctx.fillRect(0, 0, width, height);
	ctx.font = '20pt Segoe UI';

	const placed = placeTree(ctx, tree);
	const x = 1200;
	const y = 20;
	let extent = { minX: x, maxX: x, minY: y, maxY: y };
	drawTree(ctx, 1200, 20, placed, extent);

	const w = extent.maxX - extent.minX;
	const h = extent.maxY - extent.minY;
	const temp = ctx.getImageData(extent.minX, extent.minY, w, h);
	canvas.width = w;
	canvas.height = h;
	ctx.putImageData(temp, 0, 0);

	const imgBuffer = canvas.toBuffer('image/png');
	return imgBuffer;
}
