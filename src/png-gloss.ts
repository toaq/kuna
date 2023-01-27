import { loadImage, createCanvas, registerFont } from 'canvas';
import { glossSentence } from './gloss';

export function pngGlossSentence(sentence: string): Buffer {
	const width = 1200;
	const height = 2400;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#151d29';
	ctx.fillRect(0, 0, width, height);
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	ctx.fillStyle = '#000080';
	const margin = 40;
	let x = margin;
	let y = margin;
	const toaqFont = 'bold 20pt Segoe UI';
	const englishFont = 'italic 18pt Segoe UI';
	let clipWidth = 0;

	for (const { toaq, english } of glossSentence(sentence.slice(0, 1000))) {
		ctx.font = toaqFont;
		const tw = ctx.measureText(toaq).width;
		ctx.font = englishFont;
		const ew = ctx.measureText(english).width;
		const mw = Math.max(tw, ew) + 20;
		if (x + mw > width - margin) {
			x = margin;
			y += 110;
			if (y > height) {
				break;
			}
		}
		ctx.font = toaqFont;
		ctx.fillStyle = '#00aaff';
		ctx.fillText(toaq, x, y);
		ctx.font = englishFont;
		ctx.fillStyle = '#bbbbbb';
		ctx.fillText(english, x, y + 40);
		x += mw;
		if (x + margin - 20 > clipWidth) {
			clipWidth = x + margin - 20;
		}
	}

	let temp = ctx.getImageData(0, 0, width, height);
	canvas.width = clipWidth;
	canvas.height = y + 80 + margin;
	ctx.putImageData(temp, 0, 0);
	const imgBuffer = canvas.toBuffer('image/png');
	return imgBuffer;
}
