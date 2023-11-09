import { Canvas, CanvasRenderingContext2D, createCanvas } from 'canvas';
import { CompactExpr } from '../semantics/compact';
import { DTree } from '../semantics/model';
import { Tree } from '../tree';
import {
	PlacedBranch,
	PlacedLeaf,
	PlacedTree,
	RenderedDenotation,
	TreePlacer,
} from './place';

interface Location {
	x: number;
	y: number;
	width: number;
}

export type ThemeName = 'dark' | 'light';

interface Theme {
	backgroundColor: string;
	textColor: string;
	denotationColor: string;
	wordColor: string;
}

const themes: Record<ThemeName, Theme> = {
	dark: {
		backgroundColor: '#36393E',
		textColor: '#DCDDDE',
		denotationColor: '#FF4466',
		wordColor: '#99EEFF',
	},
	light: {
		backgroundColor: '#FFFFFF',
		textColor: '#000000',
		denotationColor: '#FF0000',
		wordColor: '#3399FF',
	},
};

class TreeDrawer {
	private margin = 40;
	private font = '27px Noto Sans Math, Noto Sans';

	private canvas: Canvas;
	private ctx: CanvasRenderingContext2D;
	private rootX: number;
	private rootY: number;
	private extent: { minX: number; maxX: number; minY: number; maxY: number };
	private locations: Map<string, Location> = new Map();
	private arrows: Array<[string, string]> = [];
	private promises: Array<Promise<void>> = [];

	constructor(
		private theme: Theme,
		private layerHeight: number,
	) {
		const width = 8400;
		const height = 4400;
		this.canvas = createCanvas(width, height);
		this.ctx = this.canvas.getContext('2d');
		this.ctx.fillStyle = theme.backgroundColor;
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
		this.ctx.strokeStyle = this.theme.textColor;
		this.ctx.lineWidth = 1;
		this.ctx.beginPath();
		this.ctx.moveTo(x1, y1);
		this.ctx.lineTo(x2, y2);
		this.ctx.stroke();
	}

	private drawText(
		text: string | RenderedDenotation,
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

	private drawLabel(x: number, y: number, tree: PlacedTree): void {
		if (tree.coindex) {
			const w1 = this.ctx.measureText(tree.label).width;
			const w2 = this.ctx.measureText(tree.coindex).width;
			this.drawText(tree.label, x - w2 / 2, y, this.theme.textColor);
			this.drawText(tree.coindex, x + w1 / 2, y + 8, this.theme.textColor);
		} else {
			this.drawText(tree.label, x, y, this.theme.textColor);
		}
	}

	private drawLeaf(x: number, y: number, tree: PlacedLeaf): void {
		this.drawLabel(x, y, tree);
		if (tree.denotation) {
			this.drawText(tree.denotation, x, y + 30, this.theme.denotationColor);
		}
		if (tree.word !== undefined) {
			const dy = 35 + (tree.denotation?.height(this.ctx) ?? 0);
			this.drawLine(x, y + dy, x, y + this.layerHeight - 15);
			this.drawText(tree.word, x, y + this.layerHeight, this.theme.wordColor);
			if (tree.gloss) {
				const yg = y + this.layerHeight + 30;
				this.drawText(tree.gloss, x, yg, this.theme.textColor);
			}
		}

		if (tree.id) {
			const width = this.ctx.measureText(tree.word ?? '').width;
			const location = { x, y: y + 120, width };
			this.locations.set(tree.id, location);
			if (tree.movedTo) {
				this.arrows.push([tree.id, tree.movedTo]);
			}
		}
	}

	private drawBranch(x: number, y: number, tree: PlacedBranch): void {
		this.drawLabel(x, y, tree);
		if (tree.denotation) {
			this.drawText(tree.denotation, x, y + 30, this.theme.denotationColor);
		}
		const n = tree.children.length;
		for (let i = 0; i < n; i++) {
			const dx = (i - (n - 1) / 2) * tree.distanceBetweenChildren;
			this.drawTree(x + dx, y + this.layerHeight, tree.children[i]);
			const dy = 35 + (tree.denotation?.height(this.ctx) ?? 0);
			this.drawLine(x, y + dy, x + dx, y + this.layerHeight - 15);
		}
	}

	private drawTree(x: number, y: number, tree: PlacedTree): void {
		if ('word' in tree) {
			this.drawLeaf(x, y, tree);
		} else {
			this.drawBranch(x, y, tree);
		}
	}

	private drawArrows() {
		this.ctx.strokeStyle = this.theme.textColor;
		this.ctx.lineWidth = 1;
		for (const [i, j] of this.arrows) {
			this.ctx.beginPath();
			const start = this.locations.get(i)!;
			const end = this.locations.get(j)!;
			const x0 = start.x - start.width / 2 - 15;
			const y0 = start.y;
			const x1 = end.x;
			const y1 = end.y + 25;
			this.ctx.moveTo(x0, y0);
			this.ctx.quadraticCurveTo(x1, y0, x1, y1);
			this.ctx.stroke();
			for (const dx of [-8, 8]) {
				this.drawLine(x1, y1, x1 + dx, y1 + 8);
			}
		}
	}

	private fitCanvasToContents() {
		const { minX, maxX, minY, maxY } = this.extent;
		const cropWidth = maxX - minX;
		const cropHeight = maxY - minY;
		const temp = this.ctx.getImageData(minX, minY, cropWidth, cropHeight);
		this.canvas.width = cropWidth;
		this.canvas.height = cropHeight;
		this.ctx.putImageData(temp, 0, 0);
		return this.canvas;
	}

	public async pngDrawTree(
		tree: Tree | DTree,
		renderer: (denotation: CompactExpr) => RenderedDenotation,
	): Promise<Canvas> {
		const placer = new TreePlacer(this.ctx, renderer);
		const placed = placer.placeTree(tree);
		this.drawTree(this.rootX, this.rootY, placed);
		await Promise.all(this.promises);
		this.drawArrows();
		this.fitCanvasToContents();
		return this.canvas;
	}
}

export function pngDrawTree(
	theme: ThemeName,
	layerHeight: number,
	tree: Tree | DTree,
	renderer: (denotation: CompactExpr) => RenderedDenotation,
): Promise<Canvas> {
	const drawer = new TreeDrawer(themes[theme], layerHeight);
	return drawer.pngDrawTree(tree, renderer);
}
