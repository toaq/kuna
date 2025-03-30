import { expect, test } from 'vitest';
import { EarleyParser, type Grammar } from './earley';

test('it matches the examples from the Scott paper', () => {
	type N = 'A' | 'B' | 'S';
	type T = 'a' | 'b';

	const Γ4: Grammar<T, N> = {
		start: 'S',
		rules: [
			{
				head: 'S',
				body: [
					{ terminal: 'a' },
					{ nonterminal: 'A' },
					{ terminal: 'b' },
					{ nonterminal: 'B' },
				],
			},
			{ head: 'A', body: [{ terminal: 'a' }] },
			{ head: 'B', body: [{ nonterminal: 'A' }] },
			{ head: 'B', body: [{ terminal: 'a' }] },
		],
	};

	const parser = new EarleyParser(Γ4, t => t);
	const { table, sppf } = parser.parse(['a', 'a', 'b', 'a']);
	const show = parser.showItem.bind(parser);
	expect(table[0].map(show).sort()).toEqual(['(S → •a A b B, 0)']);
	expect(table[1].map(show).sort()).toEqual([
		'(A → •a, 1)',
		'(S → a•A b B, 0)',
	]);
	expect(table[2].map(show).sort()).toEqual([
		'(A → a•, 1)',
		'(S → a A•b B, 0)',
	]);
	expect(table[3].map(show).sort()).toEqual([
		'(A → •a, 3)',
		'(B → •A, 3)',
		'(B → •a, 3)',
		'(S → a A b•B, 0)',
	]);
	expect(table[4].map(show).sort()).toEqual([
		'(A → a•, 3)',
		'(B → A•, 3)',
		'(B → a•, 3)',
		'(S → a A b B•, 0)',
	]);
	expect(sppf).toEqual({
		symbol: { nonterminal: 'S' },
		startIndex: 0,
		endIndex: 4,
		families: [
			[
				{
					symbol: { ruleNumber: 0, passed: 3 },
					startIndex: 0,
					endIndex: 3,
					families: [
						[
							{
								symbol: { ruleNumber: 0, passed: 2 },
								startIndex: 0,
								endIndex: 2,
								families: [
									[
										{
											symbol: { terminal: 'a' },
											startIndex: 0,
											endIndex: 1,
											families: [],
										},
										{
											symbol: { nonterminal: 'A' },
											startIndex: 1,
											endIndex: 2,
											families: [
												[
													{
														symbol: { terminal: 'a' },
														startIndex: 1,
														endIndex: 2,
														families: [],
													},
												],
											],
										},
									],
								],
							},
							{
								symbol: { terminal: 'b' },
								startIndex: 2,
								endIndex: 3,
								families: [],
							},
						],
					],
				},
				{
					symbol: { nonterminal: 'B' },
					startIndex: 3,
					endIndex: 4,
					families: [
						[
							{
								symbol: { terminal: 'a' },
								startIndex: 3,
								endIndex: 4,
								families: [],
							},
						],
						[
							{
								symbol: { nonterminal: 'A' },
								startIndex: 3,
								endIndex: 4,
								families: [
									[
										{
											symbol: { terminal: 'a' },
											startIndex: 3,
											endIndex: 4,
											families: [],
										},
									],
								],
							},
						],
					],
				},
			],
		],
	});
});
