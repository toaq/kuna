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
	// TODO: This should really be "Kıaı tú poq, ꝡë bo hóa báq aqshe, ꝡë bua hóa báq dueq, áqshe rú dúeq."
	snapshot('Do tú poq, ꝡë bo bâq aqshe, ꝡë bua hóa báq dueq, hóa, áqshe dúeq.');
	snapshot('Shê, ꝡä Toaq há, nä bo hó sá toakue.');
	snapshot('Shê, ꝡä bo báq poq báq aqshe, nä kıaı póq áqshe.');
});

test('(c 0) serials', () => {
	snapshot('Tua poaq góchıq ké jegaq.');
});

test('adjuncts', () => {
	snapshot('Nuo súq dûo géodıo.');
	snapshot('Marao úmo gâq nhâna.');
	snapshot('Kueq áma fâ sóaq.');
});

test('reflexives and reciprocals', () => {
	snapshot('Jıa geq súho chéq ba.');
	snapshot('Tua de jí áq.');
	snapshot('Tua de nhána chéq.');
	snapshot('Kıaı úmo áq nhûq chéq.');
	snapshot('Kıaı nhûq chéq úmo áq.');
	snapshot('Kıaı nhûq chéq úmo áqna.');
	snapshot('Kueqtua áma áqna.');
	snapshot('Kueqtua áma áqna gâq chéq.');
	snapshot('Po póq káto pâı chéq.');
});
