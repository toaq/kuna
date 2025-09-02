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
	snapshot('Kuaı jí pó nánı hea bâq nam.');
});

test('object incorporation', () => {
	snapshot('Rụınua hôq jí nháo.');
	snapshot('Sạtao súq râq tú raı ba.');
	snapshot('Họqdua sía poq.');
	snapshot('Tao sâ raı tú poq râq ráı.');
});

test('relative clauses', () => {
	snapshot('Tao sá poq, ꝡë doı tú Toaq hóa, sá raı.');
});

test('possessives', () => {
	snapshot('Maı póq tú cheqbo.');
	snapshot('Paı jí báq poq da. Hobo ní chea.');
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
	// TODO: báq poq, ꝡë gı báq pao hôa
	snapshot('Kueq túq poq, ꝡë bo hóa báq taqchao. Ꝡa puı máq.');
});

test('serials', () => {
	snapshot('Tua poaq góchıq ké jegaq.');
	snapshot('Du kuqnu gı ráı.');
});

test('adjuncts', () => {
	snapshot('Nuo súq dûo géodıo.');
	snapshot('Marao úmo gâq nhána.');
	snapshot('Kueq áma fâ sóaq.');
	// TODO: Scope islands as found in "môı sîa raı"
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
	snapshot('Zao túq poq chéq.');
});

test('conjunctions', () => {
	snapshot('Maı jí róı súq chéq.');
	snapshot('Kueq jí róı súq.');
	snapshot('Marao jí rú súq.');
	snapshot('Tua sı jí súq rá nháo hụ́ra.');
	snapshot('Ao jea súq shíukune rí góso?');
	snapshot('Aona tú Toaqpoq kéo sía Lojıbaqpoq sáose.');
	snapshot('Jara kúne rú koı jí.');
	snapshot('Kıa ro kuo máq.');
	snapshot('Kueq nhána bûı túq jıo kéo gûq sía hoe.');
	snapshot('Marao báq poq, rú de póq.');
	// TODO: ꝡë gı hóa rú ꝡë huı hóa / mêoq rú fôı (needs predicate modification)
	// TODO: sá kıa ro kuo
});

test('cleft verb', () => {
	snapshot('Ní shatı nä loı jí hóa.');
	snapshot('Sá rua nä maı tú apı rúa.');
});

test('topics', () => {
	snapshot('Níchaq bï za ruqshua.');
	snapshot('Ké patı bï marao hú shı.');
	snapshot('Níchaq bï tao ké poq, ꝡë bo hóa báq taqchao, ké maqbo.');
	snapshot('Níchaq bï tao jí ké zuo hôq nha.');
	snapshot('Níchaq bï tao nánı poq ké zuo hôq nha.');
});
