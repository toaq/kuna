import {
	type Canvas,
	type CanvasRenderingContext2D,
	createCanvas,
} from 'canvas';
import type { DTree, Expr } from '../semantics/model';
import type { Tree } from '../tree';
import type { MovementID } from './movement';
import { type DrawableDenotation, type PlacedTree, TreePlacer } from './place';
import {
	type Scene,
	SceneTextStyle,
	type Unplaced,
	sceneLabelToString,
	toScene,
} from './scene';
import { type Theme, type ThemeName, themes } from './theme';

interface Location {
	x: number;
	y: number;
	width: number;
}

interface TreeDrawerOptions {
	theme: Theme;
	layerHeight: number;
	showMovement: boolean;
	compact: boolean;
	truncateLabels: string[];
}

class TreeDrawer {
	private margin = 40;
	private font = '27px Iosevka Toaq Aile, Noto Sans Math, Noto Sans';

	private canvas: Canvas;
	readonly ctx: CanvasRenderingContext2D;
	private rootX: number;
	private rootY: number;
	private extent: { minX: number; maxX: number; minY: number; maxY: number };
	private locations: Map<MovementID, Location> = new Map();
	private arrows: Array<[MovementID, MovementID]> = [];
	private promises: Array<Promise<void>> = [];
	get theme(): Theme {
		return this.options.theme;
	}

	constructor(private options: TreeDrawerOptions) {
		const width = 8400;
		const height = 4400;
		this.canvas = createCanvas(width, height);
		this.ctx = this.canvas.getContext('2d');
		this.ctx.fillStyle = options.theme.backgroundColor;
		this.ctx.fillRect(0, 0, width, height);
		this.ctx.font = this.font;
		this.ctx.textAlign = 'center';
		this.rootX = this.canvas.width / 2;
		this.rootY = this.margin;
		this.extent = {
			minX: this.rootX,
			maxX: this.rootX,
			minY: this.rootY,
			maxY: this.rootY,
		};
	}

	private drawLine(x1: number, y1: number, x2: number, y2: number): void {
		this.ctx.strokeStyle = this.options.theme.textColor;
		this.ctx.lineWidth = 1;
		this.ctx.beginPath();
		this.ctx.moveTo(x1, y1);
		this.ctx.lineTo(x2, y2);
		this.ctx.stroke();
	}

	private drawText(
		text: string | DrawableDenotation<CanvasRenderingContext2D>,
		x: number,
		y: number,
		color: string,
	): void {
		let width: number;
		if (typeof text !== 'string') {
			this.promises.push(text.draw(this.ctx, x, y, color));
			width = text.width(this.ctx);
		} else {
			this.ctx.fillStyle = color;
			this.ctx.fillText(text, x, y + 18);
			width = this.ctx.measureText(text).width;
		}
		const minX = x - width / 2 - this.margin;
		if (minX < this.extent.minX) this.extent.minX = minX;
		const maxX = x + width / 2 + this.margin;
		if (maxX > this.extent.maxX) this.extent.maxX = maxX;
		const minY = y - this.margin;
		if (minY < this.extent.minY) this.extent.minY = minY;
		const maxY = y + this.margin;
		if (maxY > this.extent.maxY) this.extent.maxY = maxY;
	}

	private drawLabel(
		x: number,
		y: number,
		tree: PlacedTree<CanvasRenderingContext2D>,
	): void {
		// if (tree.coindex) {
		// 	const w1 = this.ctx.measureText(tree.label).width;
		// 	const w2 = this.ctx.measureText(tree.coindex).width;
		// 	this.drawText(tree.label, x - w2 / 2, y, this.theme.textColor);
		// 	this.drawText(tree.coindex, x + w1 / 2, y + 8, this.theme.textColor);
		// } else {
		this.drawText(sceneLabelToString(tree.label), x, y, this.theme.textColor);
		// }
	}

	private drawLeaf(
		x: number,
		y: number,
		tree: PlacedTree<CanvasRenderingContext2D>,
	): void {
		this.drawLabel(x, y, tree);
		if (tree.denotation) {
			this.drawText(tree.denotation, x, y + 30, this.theme.denotationColor);
		}

		const wordColor =
			tree.textStyle === SceneTextStyle.Trace
				? this.theme.traceColor
				: tree.textStyle === SceneTextStyle.MovedHere
					? this.theme.movedWordColor
					: this.theme.wordColor;
		const word = tree.text;

		if (word !== undefined) {
			const width = tree.placement.width;
			const dy = 35 + (tree.denotation?.height(this.ctx) ?? 0);
			const y1 = y + this.options.layerHeight - 15;
			if (tree.roof) {
				this.drawLine(x, y + dy, x - width / 2, y1);
				this.drawLine(x, y + dy, x + width / 2, y1);
				this.drawLine(x - width / 2, y1, x + width / 2, y1);
			} else {
				this.drawLine(x, y + dy, x, y1);
			}

			this.drawText(word, x, y + this.options.layerHeight, wordColor);
			if (tree.text && tree.gloss) {
				const yg = y + this.options.layerHeight + 30;
				this.drawText(tree.gloss, x, yg, this.theme.textColor);
			}
		}

		if (tree.id) {
			const width = this.ctx.measureText(tree.text ?? '').width;
			const location = { x, y: y + 120, width };
			this.locations.set(tree.id, location);
			// if (tree.movement.movedTo) {
			// 	this.arrows.push([tree.movement.id, tree.movement.movedTo]);
			// }
		}
	}

	private drawBranch(
		x: number,
		y: number,
		tree: PlacedTree<CanvasRenderingContext2D>,
	): void {
		this.drawLabel(x, y, tree);
		if (tree.denotation) {
			this.drawText(tree.denotation, x, y + 30, this.theme.denotationColor);
		}
		const n = tree.children.length;
		for (let i = 0; i < n; i++) {
			const dx = (i - (n - 1) / 2) * tree.placement.distanceBetweenChildren;
			this.drawTree(x + dx, y + this.options.layerHeight, tree.children[i]);
			const dy = 35 + (tree.denotation?.height(this.ctx) ?? 0);
			this.drawLine(x, y + dy, x + dx, y + this.options.layerHeight - 15);
		}
	}

	private drawTree(
		x: number,
		y: number,
		tree: PlacedTree<CanvasRenderingContext2D>,
	): void {
		if (tree.children.length) {
			this.drawBranch(x, y, tree);
		} else {
			this.drawLeaf(x, y, tree);
		}
	}

	private drawArrows() {
		for (const [i, j] of this.arrows) {
			this.ctx.strokeStyle = this.theme.textColor;
			this.ctx.lineWidth = 1;
			this.ctx.beginPath();
			const start = this.locations.get(i);
			const end = this.locations.get(j);
			if (!start || !end) continue;
			const x0 = start.x - start.width / 2;
			const y0 = Math.max(end.y + 50, start.y + 20);
			const x1 = end.x;
			const y1 = end.y + 40;
			this.ctx.moveTo(x0, y0);
			this.ctx.bezierCurveTo((x0 + x1) / 2, y0 + 40, x1, y0, x1, y1);
			this.ctx.stroke();
			for (const dx of [-8, 8]) {
				this.drawLine(x1, y1, x1 + dx, y1 + 8);
			}

			// Cross out the text
			this.ctx.strokeStyle = this.theme.traceColor;
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			this.ctx.moveTo(start.x - start.width / 2, start.y - 10);
			this.ctx.lineTo(start.x + start.width / 2, start.y - 10);
			this.ctx.stroke();
		}
	}

	private fitCanvasToContents() {
		const { minX, maxX, minY, maxY } = this.extent;
		const cropWidth = maxX - minX;
		const cropHeight = maxY - minY + 30;
		const temp = this.ctx.getImageData(minX, minY, cropWidth, cropHeight);
		this.canvas.width = cropWidth;
		this.canvas.height = cropHeight;
		this.ctx.putImageData(temp, 0, 0);
		return this.canvas;
	}

	public async drawToCanvas(
		placedTree: PlacedTree<CanvasRenderingContext2D>,
	): Promise<Canvas> {
		this.drawTree(this.rootX, this.rootY, placedTree);
		await Promise.all(this.promises);
		if (this.options.showMovement) this.drawArrows();
		this.fitCanvasToContents();
		return this.canvas;
	}
}

export function drawSceneToCanvas<D>(
	scene: Scene<D, Unplaced>,
	options: {
		themeName: ThemeName;
		tall: boolean;
		renderer: (
			denotation: D,
			theme: Theme,
			compact?: boolean,
		) => DrawableDenotation<CanvasRenderingContext2D>;
		showMovement: boolean;
		compact: boolean;
		truncateLabels: string[];
	},
): Promise<Canvas> {
	const layerHeight = options.tall ? 150 : 100;
	const theme = themes[options.themeName];
	const drawer = new TreeDrawer({
		theme,
		layerHeight,
		showMovement: options.showMovement,
		compact: options.compact,
		truncateLabels: options.truncateLabels,
	});
	const placer = new TreePlacer(drawer.ctx, options.renderer, {
		theme,
		compact: options.compact,
		truncateLabels: options.truncateLabels,
	});
	const placed = placer.placeScene(scene);
	return drawer.drawToCanvas(placed);
}

export function drawTreeToCanvas(
	tree: Tree | DTree,
	options: {
		themeName: ThemeName;
		tall: boolean;
		renderer: (
			denotation: Expr,
			theme: Theme,
			compact?: boolean,
		) => DrawableDenotation<CanvasRenderingContext2D>;
		showMovement: boolean;
		compact: boolean;
		truncateLabels: string[];
	},
): Promise<Canvas> {
	return drawSceneToCanvas(toScene(tree), options);
}
