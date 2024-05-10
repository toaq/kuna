import { test, expect } from 'vitest';
import { preprocess } from './grammar-preprocessor';

test('it expands generics', () => {
	expect(
		preprocess([
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

	expect(
		preprocess([
			`F<X> -> G<X> H<X>`,
			`G<X> -> J G<X>`,
			`A -> F<a>`,
			`B -> F<b>`,
			`C -> F<c>`,
		]),
	).toMatchInlineSnapshot(`
		[
		  "F_a -> G_a H_a",
		  "F_b -> G_b H_b",
		  "F_c -> G_c H_c",
		  "G_a -> J G_a",
		  "G_b -> J G_b",
		  "G_c -> J G_c",
		  "A -> F_a",
		  "B -> F_b",
		  "C -> F_c",
		]
	`);
});

test('it expands ifdefs', () => {
	const file = [
		'a',
		'#ifdef XYZ',
		'b',
		'#ifndef NOC',
		'c',
		'#endif',
		'#else',
		'd',
		'e',
		'#endif',
		'f',
	];
	expect(preprocess(file, new Set([]))).toEqual(['a', 'd', 'e', 'f']);
	expect(preprocess(file, new Set(['NOC']))).toEqual(['a', 'd', 'e', 'f']);
	expect(preprocess(file, new Set(['XYZ']))).toEqual(['a', 'b', 'c', 'f']);
	expect(preprocess(file, new Set(['XYZ', 'NOC']))).toEqual(['a', 'b', 'f']);
});
