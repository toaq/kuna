import * as fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { HandwrittenParser } from './handwritten-parser';
import { parse } from './modes/parse';
import type { Tree } from './tree';

function handParse(sentence: string): Tree | string {
	const parser = new HandwrittenParser(sentence);
	try {
		return parser.expectFragment();
	} catch (e) {
		return String(e);
	}
}

describe('handwritten parser matches Nearley parser', () => {
	const sentences = fs
		.readFileSync('sentences/refgram.txt')
		.toString('utf-8')
		.trim()
		.split('\n');
	test.each(sentences.filter(x => !/\. /.test(x)).map(x => [x]))(
		'%s',
		sentence => {
			let trees: Tree[] = [];
			try {
				trees = parse(sentence);
			} catch (_e) {
				// No parse; leave `trees` empty.
			}
			if (trees.length === 1) {
				expect(handParse(sentence)).toEqual(trees[0]);
			} else {
				expect(handParse(sentence)).toBeTypeOf('string');
			}
		},
	);
});
