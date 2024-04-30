import { test, expect } from 'vitest';
import { expandGenerics } from './grammar-preprocessor';

test('it expands generics', () => {
	expect(
		expandGenerics([
			`CP -> wa Clause<main>`,
			`CPsub -> wä Clause<sub>`,
			`Clause<S> -> TP<S>`,
			`TP<S> -> T AspP<S>`,
		]),
	).toMatchInlineSnapshot(`
		[
		  "CP -> wa Clause_main",
		  "CPsub -> wä Clause_sub",
		  "Clause_main -> TP_main",
		  "Clause_sub -> TP_sub",
		  "TP_main -> T AspP_main",
		  "TP_sub -> T AspP_sub",
		]
	`);
});
