import type { ToaqToken } from '../morphology/tokenize';
import {
	type CovertWord,
	type Label,
	type Tree,
	makeWord,
	treeChildren,
} from '../tree';
import type { Grammar, SppfNode } from './earley';

export type TokenType = 'determiner' | 'pronoun' | 'predicate';

export const toaqGrammar: Grammar<TokenType, string> = {
	start: 'Clause',
	rules: [
		{
			head: 'Clause',
			body: [{ nonterminal: 'Verb' }, { terminal: 'pronoun' }],
		},
		{
			head: 'Clause',
			body: [
				{ nonterminal: 'Verb' },
				{ terminal: 'pronoun' },
				{ terminal: 'pronoun' },
			],
		},
		{
			head: 'Clause',
			body: [
				{ terminal: 'predicate' },
				{ terminal: 'pronoun' },
				{ terminal: 'pronoun' },
			],
		},
		{
			head: 'Verb',
			body: [{ terminal: 'predicate' }],
		},
		{
			head: 'Verb',
			body: [{ nonterminal: 'Test' }, { terminal: 'predicate' }],
		},
		{
			head: 'Test',
			body: [],
		},
	],
};

export function* sppfToTrees(
	sppfNode: SppfNode<TokenType, string>,
	input: ToaqToken[],
): Generator<Tree> {
	const label: Label = (
		'terminal' in sppfNode.symbol
			? sppfNode.symbol.terminal
			: 'nonterminal' in sppfNode.symbol
				? sppfNode.symbol.nonterminal
				: ''
	) as Label;
	const source = input
		.slice(sppfNode.startIndex, sppfNode.endIndex)
		.map(x => x.value)
		.join(' ');
	if ('terminal' in sppfNode.symbol) {
		const word = makeWord([input[sppfNode.startIndex]]);
		yield { word, label, source };
		return;
	}
	for (const f of sppfNode.families) {
		if (f.length === 0) {
			const word: CovertWord = { covert: true, value: '∅' };
			yield { word, label, source };
		}
		if (f.length === 1) {
			for (const l of sppfToTrees(f[0], input)) {
				yield {
					children: l.label ? [l] : treeChildren(l),
					label,
					source,
				};
			}
		}
		if (f.length === 2) {
			for (const l of sppfToTrees(f[0], input)) {
				for (const r of sppfToTrees(f[1], input)) {
					yield {
						children: [
							...(l.label ? [l] : treeChildren(l)),
							...(r.label ? [r] : treeChildren(r)),
						],
						label,
						source,
					};
				}
			}
		}
	}
}
