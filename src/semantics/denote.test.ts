import { test, expect } from 'vitest';
import { parse } from '../parse';
import { fix } from '../fix';
import { denote } from './denote';
import { Expr } from './model';
import { toPlainText } from './render';
import { Impossible } from '../error';

// Sentences expected to have fully correct denotations
const sentences = ['Hıo jí súq ka', 'Dua jí hóq'];

function forEachFreeVariableUsage(e: Expr, fn: (index: number) => void) {
	const sub = (...es: Expr[]) => {
		for (const e of es) forEachFreeVariableUsage(e, fn);
	};

	switch (e.head) {
		case 'variable':
			fn(e.index);
			break;
		case 'verb':
			sub(...e.args, e.event, e.world);
			break;
		case 'lambda': {
			const fnInner = (i: number) => fn(i - 1);
			forEachFreeVariableUsage(e.body, fnInner);
			if (e.restriction !== undefined)
				forEachFreeVariableUsage(e.restriction, fnInner);
			break;
		}
		case 'apply':
			sub(e.fn, e.argument);
			break;
		case 'presuppose':
			sub(e.body, e.presupposition);
			break;
		case 'infix':
			sub(e.left, e.right);
			break;
		case 'polarizer':
			sub(e.body);
			break;
		case 'quantifier': {
			const fnInner = (i: number) => fn(i - 1);
			forEachFreeVariableUsage(e.body, fnInner);
			if (e.restriction !== undefined)
				forEachFreeVariableUsage(e.restriction, fnInner);
			break;
		}
		case 'constant':
			sub();
			break;
	}
}

for (const sentence of sentences) {
	test(sentence, () => {
		const trees = parse(sentence);
		expect(trees.length).toBe(1);
		const [tree] = trees;

		// Make sure the denotation looks correct
		const { denotation } = denote(fix(tree));
		if (denotation === null) throw new Impossible('Null denotation');
		const denotationText = toPlainText(denotation);
		expect(denotationText).toMatchSnapshot();

		// Verify that no free variables are unused
		const freeVariablesUsed = denotation.context.map(() => false);
		forEachFreeVariableUsage(denotation, i => (freeVariablesUsed[i] = true));
		freeVariablesUsed.forEach((used, i) => {
			if (!used)
				throw new Error(
					`The free variable of type ${denotation.context[i]} at index ${i} in ${denotationText} is unused`,
				);
		});
	});
}
