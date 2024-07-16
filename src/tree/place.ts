import type { CanvasRenderingContext2D } from 'canvas';
import type { Expr } from '../semantics/model';
import { toLatex, toPlainText } from '../semantics/render';

import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';
import { TeX } from 'mathjax-full/js/input/tex';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages';
import { mathjax } from 'mathjax-full/js/mathjax';
import { SVG } from 'mathjax-full/js/output/svg';
import type { Placed, Scene, SceneNode, Unplaced } from './scene';
import { type Theme, themes } from './theme';

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
	measureText(text: string): { width: number };
}

export interface DrawableDenotation<C extends DrawContext> {
	draw: (
		ctx: C,
		centerX: number,
		bottomY: number,
		color: string,
	) => Promise<void>;
	width(ctx: C): number;
	height(ctx: C): number;
	source: string;
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
			const dx =
				(i - (n - 1) / 2) * placedTree.placement.distanceBetweenChildren;
			const subRect = boundingRect(placedTree.children[i]);
			left = Math.min(left, subRect.left + dx);
			right = Math.max(right, subRect.right + dx);
			layers = Math.max(layers, subRect.layers + 1);
		}
		return { left, right, layers };
	}
	return {
		left: placedTree.placement.width / 2,
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

function layerExtents(tree: PlacedTree<any>): LayerExtent[] {
	const extents = [];
	let frontier = [
		{ x: 0, ...tree.placement, text: tree.text, children: tree.children },
	];
	while (frontier.length) {
		const left = Math.min(...frontier.map(e => e.x - e.width / 2));
		const right = Math.max(...frontier.map(e => e.x + e.width / 2));
		extents.push({ left, right });
		const newFrontier = [];
		for (const e of frontier) {
			if (e.text) {
				newFrontier.push({
					x: e.x,
					width: e.width,
					distanceBetweenChildren: 0,
					children: [],
					text: undefined,
				});
			}
			if (e.children.length) {
				const children = e.children;
				const n = children.length;
				for (let i = 0; i < n; i++) {
					const dx = (i - (n - 1) / 2) * e.distanceBetweenChildren;
					newFrontier.push({
						x: e.x + dx,
						width: children[i].placement.width,
						distanceBetweenChildren:
							children[i].placement.distanceBetweenChildren,
						children: children[i].children,
						text: children[i].text,
					});
				}
			}
		}
		frontier = newFrontier;
	}
	return extents;
}

interface TreePlacerOptions {
	theme: Theme;
	horizontalMargin: number;
	compact: boolean;
	truncateLabels: string[];
}

const defaultOptions: TreePlacerOptions = {
	theme: themes.light,
	horizontalMargin: 30,
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

	private placeSceneNode(node: SceneNode<D, any>): PlacedTree<C> {
		const gloss = node.gloss;
		const label = node.label;
		const text = node.text;
		const denotation = this.renderDenotation(node);
		const width = Math.max(
			this.ctx.measureText(label).width,
			this.ctx.measureText(text ?? '').width,
			this.ctx.measureText(gloss ?? '').width,
			denotation ? denotation.width(this.ctx) : 0,
		);
		let distanceBetweenChildren = 0;
		const children = node.children.map(c => this.placeSceneNode(c));
		const les = children.map(layerExtents);

		for (let i = 0; i < children.length - 1; i++) {
			const l = les[i];
			const r = les[i + 1];
			for (let j = 0; j < Math.min(r.length, l.length); j++) {
				distanceBetweenChildren = Math.max(
					distanceBetweenChildren,
					l[j].right - r[j].left + this.options.horizontalMargin,
				);
			}
		}

		return {
			placement: { width, distanceBetweenChildren },
			children,
			label,
			text,
			gloss,
			denotation,
			source: node.source,
			roof: node.roof,
		};
	}

	public placeScene(scene: Scene<D, Unplaced>): PlacedTree<C> {
		return this.placeSceneNode(scene.root);
	}
}
