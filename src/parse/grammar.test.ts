import { expect, test } from 'vitest';
import { textual_tree_from_json } from '../modes/textual-tree';
import { ToaqTokenizer } from '../morphology/tokenize';
import { EarleyParser } from './earley';
import { type TokenType, sppfToTrees, toaqGrammar } from './grammar';

test('parses Toaq tokenizations', () => {
	const toaqParser = new EarleyParser(toaqGrammar, x => x);

	const tokenizer = new ToaqTokenizer();
	tokenizer.reset('Maı jí súq');
	const { table, sppf } = toaqParser.parse(
		tokenizer.tokens.map(x => x.type as TokenType),
	);
	expect(table).toHaveLength(4);

	const trees = [...sppfToTrees(sppf!, tokenizer.tokens)];
	expect(trees).toHaveLength(3);
	for (const tree of trees) {
		// console.log(textual_tree_from_json(tree));
		expect(textual_tree_from_json(tree)).toContain('Clause');
	}
});
