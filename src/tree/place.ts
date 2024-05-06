import { CanvasRenderingContext2D } from 'canvas';
import { DTree, Expr } from '../semantics/model';
import { toPlainText, toLatex, typeToPlainText } from '../semantics/render';
import { Branch, Leaf, Rose, Tree } from '../tree';
import { CompactExpr, compact } from '../semantics/compact';

import { mathjax } from 'mathjax-full/js/mathjax';
import { TeX } from 'mathjax-full/js/input/tex';
import { SVG } from 'mathjax-full/js/output/svg';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';
import { Theme } from './draw';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const mathjax_document = mathjax.document('', {
	InputJax: new TeX({ packages: AllPackages }),
	OutputJax: new SVG({ fontCache: 'local', scale: 1.5 }),
});

export function get_mathjax_svg(math: string): {
	width: string;
	height: string;
	svg: string;
} {
	const node = mathjax_document.convert(math, {
		em: 16,
		ex: 7,
		containerWidth: 1280,
	});
	const { width, height } = node.children[0].attributes;
	return { width, height, svg: adaptor.innerHTML(node) };
}

export interface RenderedDenotation {
	draw: (
		ctx: CanvasRenderingContext2D,
		centerX: number,
		bottomY: number,
		color: string,
	) => Promise<void>;
	width(ctx: CanvasRenderingContext2D): number;
	height(ctx: CanvasRenderingContext2D): number;
}

interface PlacedLeafBase {
	depth: 0;
	width: number;
	label: string;
	denotation?: RenderedDenotation;
	id?: string;
	movedTo?: string;
	coindex?: string;
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
	denotation?: RenderedDenotation;
	distanceBetweenChildren: number;
	children: PlacedTree[];
	coindex?: string;
}

export type PlacedTree = PlacedLeaf | PlacedBranch;

function getLabel(tree: Tree | DTree): string {
	return 'denotation' in tree && tree.denotation !== null
		? `${tree.label} : ${typeToPlainText(tree.denotation.type)}`
		: tree.label;
}

export function denotationRenderText(
	denotation: CompactExpr,
	theme: Theme,
): RenderedDenotation {
	const text = toPlainText(denotation);
	return {
		async draw(ctx, centerX, bottomY, color) {
			ctx.fillStyle = color;
			ctx.fillText(text, centerX, bottomY + 18);
		},
		width(ctx) {
			return ctx.measureText(text).width;
		},
		height(ctx) {
			return 30;
		},
	};
}

export function denotationRenderLatex(
	denotation: CompactExpr,
	theme: Theme,
): RenderedDenotation {
	const latex = toLatex(denotation);
	let { width, height, svg } = get_mathjax_svg('\\LARGE ' + latex);
	svg = svg.replace(/currentColor/g, theme.denotationColor);
	const pxWidth = Number(width.replace(/ex$/, '')) * 7;
	const pxHeight = Number(height.replace(/ex$/, '')) * 7;
	return {
		draw(ctx, centerX, bottomY, color) {
			return new Promise(resolve => {
				var blob = new Blob([svg], {
					type: 'image/svg+xml;charset=utf-8',
				});

				var url = URL.createObjectURL(blob);
				var img = new Image();

				img.addEventListener('load', (e: any) => {
					ctx.drawImage(
						e.target as any,
						centerX - e.target.naturalWidth / 2,
						bottomY,
					);
					URL.revokeObjectURL(url);
					resolve();
				});
				img.src = url;
			});
		},
		width(ctx) {
			return pxWidth;
		},
		height(ctx) {
			return pxHeight;
		},
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

export class TreePlacer {
	constructor(
		private ctx: CanvasRenderingContext2D,
		private theme: Theme,
		private denotationRenderer: (
			denotation: Expr,
			theme: Theme,
		) => RenderedDenotation,
	) {}

	private placeLeaf(
		leaf: Leaf | (Leaf & { denotation: Expr | null }),
	): PlacedLeaf {
		const gloss = leaf.word.covert ? undefined : leaf.word.entry?.gloss;
		const label = getLabel(leaf);
		const word = leaf.word.covert ? leaf.word.value : leaf.word.text;
		const denotation =
			'denotation' in leaf && leaf.denotation !== null
				? this.denotationRenderer(leaf.denotation, this.theme)
				: undefined;
		const width = Math.max(
			this.ctx.measureText(label).width,
			this.ctx.measureText(word ?? '').width,
			this.ctx.measureText(gloss ?? '').width,
			denotation ? denotation.width(this.ctx) : 0,
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

	private makePlacedBranch(
		label: string,
		denotation: RenderedDenotation | undefined,
		children: PlacedTree[],
	): PlacedBranch {
		const depth = Math.max(...children.map(c => c.depth)) + 1;
		const width = Math.max(
			this.ctx.measureText(label).width,
			denotation ? denotation.width(this.ctx) : 0,
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
		return {
			depth,
			width,
			label,
			denotation,
			distanceBetweenChildren,
			children,
		};
	}

	private placeBranch(
		branch: Branch<Tree> | (Branch<DTree> & { denotation: Expr | null }),
	): PlacedBranch {
		const denotation =
			'denotation' in branch && branch.denotation !== null
				? this.denotationRenderer(branch.denotation, this.theme)
				: undefined;
		const children = [
			this.placeTree(branch.left),
			this.placeTree(branch.right),
		];
		return this.makePlacedBranch(getLabel(branch), denotation, children);
	}

	private placeRose(rose: Rose<Tree>): PlacedBranch {
		const children = rose.children.map(c => this.placeTree(c));
		return this.makePlacedBranch(rose.label, undefined, children);
	}

	public placeTree(tree: Tree | DTree): PlacedTree {
		return 'word' in tree
			? this.placeLeaf(tree)
			: 'children' in tree
				? this.placeRose(tree)
				: this.placeBranch(tree);
	}
}
