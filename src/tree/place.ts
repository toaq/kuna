import type { CanvasRenderingContext2D } from 'canvas';
import { toLatex, toPlainText } from '../semantics/render';
import type { Expr } from '../semantics/types';

import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';
import { TeX } from 'mathjax-full/js/input/tex';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages';
import { mathjax } from 'mathjax-full/js/mathjax';
import { SVG } from 'mathjax-full/js/output/svg';
import type {
	Placed,
	RichSceneLabel,
	RichSceneLabelLine,
	Scene,
	SceneNode,
	Unplaced,
} from './scene';
import { type Theme, themes } from './theme';
import type { MovementID } from './types';

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

export interface DrawContext {
	measureText(text: string, font?: string): { width: number };
}

export interface DrawableDenotation<C extends DrawContext, Source = string> {
	draw: (
		ctx: C,
		centerX: number,
		bottomY: number,
		color: string,
	) => Promise<void>;
	width(ctx: C): number;
	height(ctx: C): number;
	source: Source;
	// This may be absent, for example if rendering from raw LaTeX.
	denotation?: Expr;
}

export type PlacedTree<C extends DrawContext> = SceneNode<
	DrawableDenotation<C>,
	Placed
>;

export function boundingRect<C extends DrawContext>(
	placedTree: PlacedTree<C>,
): { left: number; right: number; layers: number } {
	if (placedTree.children.length) {
		let left = 0;
		let right = 0;
		let layers = 0;
		const n = placedTree.children.length;
		for (let i = 0; i < n; i++) {
			const dx = placedTree.placement.childrenDx[i];
			const subRect = boundingRect(placedTree.children[i]);
			left = Math.min(left, subRect.left + dx);
			right = Math.max(right, subRect.right + dx);
			layers = Math.max(layers, subRect.layers + 1);
		}
		return { left, right, layers };
	}
	return {
		left: -placedTree.placement.width / 2,
		right: placedTree.placement.width / 2,
		layers: 1,
	};
}

export function denotationRenderText(
	denotation: Expr,
	_theme: Theme,
	compact?: boolean,
): DrawableDenotation<CanvasRenderingContext2D> {
	const text = toPlainText(denotation, compact);
	return {
		async draw(ctx, centerX, bottomY, color) {
			ctx.fillStyle = color;
			ctx.fillText(text, centerX, bottomY + 18);
		},
		width(ctx) {
			return ctx.measureText(text).width;
		},
		height() {
			return 30;
		},
		source: text,
		denotation,
	};
}

export function denotationRenderRawLatex(
	latex: string,
	theme: Theme,
	_compact?: boolean,
): DrawableDenotation<CanvasRenderingContext2D> {
	let { width, height, svg } = get_mathjax_svg(`\\LARGE ${latex}`);
	svg = svg.replace(/currentColor/g, theme.denotationColor);
	const pxWidth = Number(width.replace(/ex$/, '')) * 7;
	const pxHeight = Number(height.replace(/ex$/, '')) * 7;
	return {
		draw(ctx, centerX, bottomY) {
			return new Promise(resolve => {
				const blob = new Blob([svg], {
					type: 'image/svg+xml;charset=utf-8',
				});

				const url = URL.createObjectURL(blob);
				const img = new Image();

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
		width() {
			return pxWidth;
		},
		height() {
			return pxHeight;
		},
		source: latex,
		denotation: undefined,
	};
}

export function denotationRenderLatex(
	denotation: Expr,
	theme: Theme,
	compact?: boolean,
): DrawableDenotation<CanvasRenderingContext2D> {
	const latex = toLatex(denotation, compact);
	return denotationRenderRawLatex(latex, theme, compact);
}

interface LayerExtent {
	left: number;
	right: number;
}

interface TreePlacerOptions {
	theme: Theme;
	horizontalMargin: number;
	minimumDistanceBetweenChildren: number;
	compact: boolean;
	truncateLabels: string[];
}

const defaultOptions: TreePlacerOptions = {
	theme: themes.light,
	horizontalMargin: 30,
	minimumDistanceBetweenChildren: 100,
	compact: false,
	truncateLabels: [],
};

export class TreePlacer<C extends DrawContext, D> {
	private options: TreePlacerOptions;

	constructor(
		private ctx: C,
		private denotationRenderer: (
			denotation: D,
			theme: Theme,
			compact?: boolean,
		) => DrawableDenotation<C>,
		options: Partial<TreePlacerOptions> = {},
	) {
		this.options = { ...defaultOptions, ...options };
	}

	private renderDenotation(
		node: SceneNode<D, any>,
	): DrawableDenotation<C> | undefined {
		if (!('denotation' in node) || !node.denotation) return undefined;
		return this.denotationRenderer(
			node.denotation,
			this.options.theme,
			this.options.compact,
		);
	}

	private measureRichSceneLabelLine(line: RichSceneLabelLine): number {
		let sum = 0;
		for (const piece of line.pieces) {
			sum += this.ctx.measureText(piece.text, piece.font).width;
		}
		return sum;
	}

	private measureLabelWidth(label: string | RichSceneLabel): number {
		if (typeof label === 'string') {
			return this.ctx.measureText(label).width;
		}
		return Math.max(
			...label.lines.map(line => this.measureRichSceneLabelLine(line)),
		);
	}

	private placeSceneNode(
		node: SceneNode<D, any>,
		skew = 0,
	): {
		tree: PlacedTree<C>;
		extents: LayerExtent[];
	} {
		const gloss = node.gloss;
		const label = node.label;
		const text = node.text;
		const denotation = this.renderDenotation(node);
		const width = Math.max(
			this.measureLabelWidth(label),
			this.ctx.measureText(text ?? '').width,
			this.ctx.measureText(gloss ?? '').width,
			denotation ? denotation.width(this.ctx) : 0,
		);

		// First place all the children...
		const children = node.children.map(c => this.placeSceneNode(c, skew));

		// Find the smallest x-distance between this node's children that avoids
		// making any of the descendants overlap.
		let distanceBetweenChildren = this.options.minimumDistanceBetweenChildren;
		for (let i = 0; i < children.length - 1; i++) {
			const l = children[i].extents;
			const r = children[i + 1].extents;
			for (let j = 0; j < Math.min(r.length, l.length); j++) {
				distanceBetweenChildren = Math.max(
					distanceBetweenChildren,
					l[j].right - r[j].left + this.options.horizontalMargin,
				);
			}
		}

		// Quantize the distance to multiples of 20px so the trees look more uniform:
		distanceBetweenChildren = Math.ceil(distanceBetweenChildren / 20) * 20;

		// Compute new extents for this subtree
		const extents = [{ left: -width / 2, right: width / 2 }];
		const childrenDx = [];
		const b =
			children.length && children[0].tree.children.length > 0 ? 0 : skew;
		for (let i = 0; i < children.length; i++) {
			const dx = (i - b - (children.length - 1) / 2) * distanceBetweenChildren;
			childrenDx.push(dx);
			const e = children[i].extents;
			for (let j = 0; j < e.length; j++) {
				extents[j + 1] ??= {
					left: Number.POSITIVE_INFINITY,
					right: Number.NEGATIVE_INFINITY,
				};
				extents[j + 1].left = Math.min(extents[j + 1].left, e[j].left + dx);
				extents[j + 1].right = Math.max(extents[j + 1].right, e[j].right + dx);
			}
		}

		const tree = {
			...node,
			placement: { width, childrenDx },
			children: children.map(x => x.tree),
			label,
			text,
			gloss,
			denotation,
		};
		return { tree, extents };
	}

	public placeScene(scene: Scene<D, Unplaced>, skew = 0): PlacedTree<C> {
		return this.placeSceneNode(scene.root, skew).tree;
	}
}

export function movementPoints<C extends DrawContext>(
	placed: PlacedTree<C>,
): Map<MovementID, { x: number; width: number; layer: number }> {
	const points = new Map();
	function walk(tree: PlacedTree<C>, x: number, layer: number): void {
		if (tree.id) {
			points.set(tree.id, { x, width: tree.placement.width, layer });
		}
		const n = tree.children.length;
		for (let i = 0; i < n; i++) {
			const dx = tree.placement.childrenDx[i];
			walk(tree.children[i], x + dx, layer + 1);
		}
	}
	walk(placed, 0, 0);
	return points;
}
