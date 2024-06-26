import { createCanvas } from 'canvas';
import { Glosser } from '../morphology/gloss';

export function pngGlossSentence(
	sentence: string,
	options: { easy: boolean },
): Buffer {
	const width = 1200;
	const height = 2400;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#151d29';
	ctx.fillRect(0, 0, width, height);
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	ctx.fillStyle = '#000080';
	const xMargin = 40;
	const yMargin = 20;
	let x = xMargin;
	let y = yMargin;
	const toaqFont = 'bold 20pt Noto Sans';
	const englishFont = 'italic 18pt Noto Sans';
	let clipWidth = 0;

	const trimmed = sentence.slice(0, 1000).trim();
	const glosser = new Glosser(options.easy);
	const gloss = glosser.glossSentence(trimmed);

	for (const { toaq, english } of gloss) {
		ctx.font = toaqFont;
		const tw = ctx.measureText(toaq).width;
		ctx.font = englishFont;
		const ew = ctx.measureText(english).width;
		const mw = Math.max(tw, ew) + 20;
		if (x + mw > width - xMargin) {
			x = xMargin;
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
		if (x + xMargin - 20 > clipWidth) {
			clipWidth = x + xMargin - 20;
		}
	}

	const temp = ctx.getImageData(0, 0, width, height);
	canvas.width = clipWidth;
	canvas.height = y + 80 + yMargin;
	ctx.putImageData(temp, 0, 0);
	const imgBuffer = canvas.toBuffer('image/png');
	return imgBuffer;
}
