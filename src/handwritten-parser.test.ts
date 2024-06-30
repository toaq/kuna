import { test, expect } from 'vitest';
import * as fs from 'fs';
import { parse } from './modes/parse';
import { ToaqTokenizer } from './morphology/tokenize';
import { HandwrittenParser } from './handwritten-parser';
import { Tree } from './tree';

function handParse(sentence: string): Tree | string {
	const parser = new HandwrittenParser(sentence);
	try {
		return parser.expectFragment();
	} catch (e) {
		return String(e);
	}
}

test('it matches the Nearley parser', () => {
	const sentences = fs
		.readFileSync('sentences/refgram.txt')
		.toString('utf-8')
		.trim()
		.split('\n');
	for (const sentence of sentences) {
		const trees = parse(sentence);
		if (trees.length === 1) {
			expect(handParse(sentence)).toEqual(trees[0]);
		} else {
			expect(handParse(sentence)).toBeTypeOf('string');
		}
	}
	console.log(sentences);
});
