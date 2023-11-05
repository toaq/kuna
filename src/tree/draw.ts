import { createCanvas, CanvasRenderingContext2D, Canvas } from 'canvas';
import { DTree } from '../semantics/model';
import { Tree } from '../tree';
import { PlacedBranch, PlacedLeaf, PlacedTree, placeTree } from './place';

interface Location {
	x: number;
	y: number;
	width: number;
}

const themes = {
	dark: {
		backgroundColor: '#36393E',
		textColor: '#DCDDDE',
		denotationColor: '#FF4466',
		wordColor: '#99EEFF',
	},
	light: {
		backgroundColor: '#FFFFFF',
		textColor: '#000000',
		denotationColor: '#FF4466',
		wordColor: '#3399FF',
	},
};

interface DrawState {
	extent: { minX: number; maxX: number; minY: number; maxY: number };
	locations: Map<string, Location>;
	arrows: Array<[string, string]>;
}

class TreeDrawer {
	private canvas: Canvas;
	private ctx: CanvasRenderingContext2D;
	private state?: DrawState;

	constructor(private theme: 'light' | 'dark') {
		const width = 8400;
		const height = 4400;
		this.canvas = createCanvas(width, height);
		this.ctx = this.canvas.getContext('2d');
		this.ctx.fillStyle = themes[theme].backgroundColor;
		this.ctx.fillRect(0, 0, width, height);
		this.ctx.font = '20pt Noto Sans Math, Noto Sans';
	}

	private drawText(t: string, x: number, y: number): void {
		if (!this.state) {
			throw new Error('drawText() called in invalid state');
		}

		this.ctx.fillText(t, x, y);
		const m = this.ctx.measureText(t);
		const margin = 40;
		const minX = x - m.width / 2 - margin;
		if (minX < this.state.extent.minX) this.state.extent.minX = minX;
		const maxX = x + m.width / 2 + margin;
		if (maxX > this.state.extent.maxX) this.state.extent.maxX = maxX;
		const minY = y - margin;
		if (minY < this.state.extent.minY) this.state.extent.minY = minY;
		const maxY = y + 30 + margin;
		if (maxY > this.state.extent.maxY) this.state.extent.maxY = maxY;
	}

	private drawLeaf(x: number, y: number, tree: PlacedLeaf): void {
		if (!this.state) {
			throw new Error('drawTree() called in invalid state');
		}

		this.ctx.textAlign = 'center';
		this.ctx.textBaseline = 'top';
		const { textColor, denotationColor, wordColor } = themes[this.theme];

		this.ctx.fillStyle = textColor;
		this.drawText(tree.label, x, y);
		this.ctx.fillStyle = denotationColor;
		const denotation = tree.denotation ?? '';
		this.drawText(denotation, x, y + 30);
		this.ctx.strokeStyle = textColor;
		this.ctx.lineWidth = 1;
		if (tree.word !== undefined) {
			this.ctx.beginPath();
			this.ctx.moveTo(x, y + (denotation ? 75 : 45));
			this.ctx.lineTo(x, y + 95);
			this.ctx.stroke();
			this.ctx.fillStyle = wordColor;
			this.drawText(tree.word, x, y + 100);
			this.ctx.fillStyle = textColor;
			this.drawText(tree.gloss ?? '', x, y + 130);
		}

		if (tree.id) {
			const width = this.ctx.measureText(tree.word ?? '').width;
			const location = { x, y: y + 120, width };
			this.state.locations.set(tree.id, location);
			if (tree.movedTo) {
				this.state.arrows.push([tree.id, tree.movedTo]);
			}
		}
	}

	private drawBranch(x: number, y: number, tree: PlacedBranch): void {
		if (!this.state) {
			throw new Error('drawBranch() called in invalid state');
		}

		this.ctx.textAlign = 'center';
		this.ctx.textBaseline = 'top';
		const { textColor, denotationColor, wordColor } = themes[this.theme];

		this.ctx.fillStyle = textColor;
		this.drawText(tree.label, x, y);
		const denotation = tree.denotation ?? '';
		this.ctx.fillStyle = denotationColor;
		this.drawText(denotation, x, y + 30);
		const n = tree.children.length;
		for (let i = 0; i < n; i++) {
			const dx = (i - (n - 1) / 2) * tree.distanceBetweenChildren;
			this.drawTree(x + dx, y + 100, tree.children[i]);
			this.ctx.strokeStyle = textColor;
			this.ctx.lineWidth = 1;
			this.ctx.beginPath();
			this.ctx.moveTo(x, y + (denotation ? 75 : 45));
			this.ctx.lineTo(x + dx, y + 95);
			this.ctx.stroke();
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
		if (!this.state) {
			throw new Error('drawArrows() called in invalid state');
		}

		this.ctx.strokeStyle = themes[this.theme].textColor;
		this.ctx.lineWidth = 1;
		for (const [i, j] of this.state.arrows) {
			this.ctx.beginPath();
			const start = this.state.locations.get(i)!;
			const end = this.state.locations.get(j)!;
			const x0 = start.x - start.width / 2 - 15;
			const y0 = start.y;
			const x1 = end.x;
			const y1 = end.y + 25;
			this.ctx.moveTo(x0, y0);
			this.ctx.quadraticCurveTo(x1, y0, x1, y1);
			this.ctx.stroke();
			for (const dx of [-8, 8]) {
				this.ctx.beginPath();
				this.ctx.moveTo(x1, y1);
				this.ctx.lineTo(x1 + dx, y1 + 8);
				this.ctx.stroke();
			}
		}
	}

	public pngDrawTree(tree: Tree | DTree): Canvas {
		const placed = placeTree(this.ctx, tree);
		const x = this.canvas.width / 2;
		const y = 50;
		this.state = {
			extent: { minX: x, maxX: x, minY: y, maxY: y },
			locations: new Map(),
			arrows: [],
		};
		this.drawTree(x, y, placed);
		this.drawArrows();

		const { minX, maxX, minY, maxY } = this.state.extent;
		const cropWidth = maxX - minX;
		const cropHeight = maxY - minY;
		const temp = this.ctx.getImageData(minX, minY, cropWidth, cropHeight);
		this.canvas.width = cropWidth;
		this.canvas.height = cropHeight;
		this.ctx.putImageData(temp, 0, 0);
		return this.canvas;
	}
}

export function pngDrawTree(
	tree: Tree | DTree,
	theme: 'light' | 'dark',
): Canvas {
	return new TreeDrawer(theme).pngDrawTree(tree);
}
