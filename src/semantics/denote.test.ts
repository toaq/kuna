import { expect, test } from 'vitest';
import { parse } from '../modes/parse';
import { recover } from '../syntax/recover';
import { denote } from './denote';
import { toPlainText } from './render';

function snapshot(toaq: string) {
	const parses = parse(toaq);
	if (parses.length > 1)
		throw new Error(`"${toaq}" is syntactically ambiguous`);
	let denotation: string;
	try {
		denotation = toPlainText(denote(recover(parses[0])).denotation);
	} catch (e) {
		throw new Error(`Could not denote "${toaq}"`, { cause: e });
	}
	expect(denotation).toMatchSnapshot(toaq);
}

test('predicatizers', () => {
	snapshot('Mea íme nháo.');
	// TODO: pó should invoke a salient predicate
	snapshot('Kuaı jí pó nánı hea bâq nam.');
});

test('object incorporation', () => {
	snapshot('Rụınua hôq jí nháo.');
	snapshot('Sạtao súq ba.');
	snapshot('Họqdua sía poq.');
});

test('name verbs', () => {
	snapshot('Mı Kuna jí.');
	snapshot('Mıru Kuna jí.');
});

test('quotations', () => {
	snapshot('Shuıtoa shú «madurudura».');
	snapshot('Shu «madurudura» shúıtoa.');
	snapshot('Kuq nháo mó «Ꝡoaq ní hao» teo.');
	snapshot('Mo «Ꝡoaq ní hao» teo ní kaıse.');
	// TODO: mım(o)
});

test('donkey anaphora', () => {
	snapshot('Kıaı tú poq, ꝡë bo hóa báq aqshe, áqshe.');
	// TODO: Kıaı tú poq, ꝡë bo hóa báq aqshe, ꝡë bua hóa báq dueq, áqshe rú dúeq.
	// (not yet fully reduced)
	snapshot('Shê, ꝡä Toaq há, nä bo hó sá toakue.');
	// TODO: Shê, ꝡä bo báq poq báq aqshe, nä kıaı póq áqshe.
	// (not yet fully reduced)
});

test('(c 0) serials', () => {
	snapshot('Tua poaq góchıq ké jegaq.');
});
