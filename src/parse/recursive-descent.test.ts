import * as fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse } from '../modes/parse';
import type { Tree } from '../tree';
import { RecursiveDescentParser } from './recursive-descent';

function recursiveDescentParse(sentence: string): Tree | string {
	const parser = new RecursiveDescentParser(sentence);
	try {
		return parser.expectFragment();
	} catch (e) {
		return String(e);
	}
}

describe('recursive descent parser matches Nearley parser', () => {
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
				expect(recursiveDescentParse(sentence)).toEqual(trees[0]);
			} else {
				expect(recursiveDescentParse(sentence)).toBeTypeOf('string');
			}
		},
	);
});
