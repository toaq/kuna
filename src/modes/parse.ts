import nearley from 'nearley';
import grammar from '../grammar';
import type { Tree } from '../tree';

export function parse(sentence: string): Tree[] {
	const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
	parser.feed(sentence);
	return parser.results as Tree[];
}
