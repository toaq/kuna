import { expect, test } from 'vitest';
import { Glosser } from './gloss';

test('it glosses Toaq words', () => {
	const glosser = new Glosser(false);
	expect(glosser.glossWord('kato')).toEqual('cat');
	expect(glosser.glossWord('jío')).toEqual('the\\building');
	expect(glosser.glossWord('tâocıa')).toEqual('A\\accidental');
	expect(glosser.glossWord('sâ')).toEqual('of.some');

	// From Toadua:
	expect(glosser.glossWord('sáıku')).toEqual('the\\Discord.server');

	// Break down a compound:
	expect(glosser.glossWord("kâto'aı")).toEqual('A\\cat.has.the.nature.of');
	expect(glosser.glossWord('sáıkujuo')).toEqual('the\\Discord.server.letter');
});

test('it supports technical and easy glosses', () => {
	const technical = new Glosser(false);
	const easy = new Glosser(true);

	expect(technical.glossWord('súq')).toEqual('2S');
	expect(easy.glossWord('súq')).toEqual('you');

	expect(technical.glossWord('ꝡä')).toEqual('COMP');
	expect(easy.glossWord('ꝡä')).toEqual('that');

	expect(technical.glossWord('hoaı')).toEqual('SPRF');
	expect(easy.glossWord('hoaı')).toEqual('still');
});

test('it can gloss a sentence', () => {
	expect(new Glosser(true).glossSentence('Cho jí ní da!')).toEqual([
		{ toaq: 'Cho', english: 'like' },
		{ toaq: 'jí', english: 'me' },
		{ toaq: 'ní', english: 'this' },
		{ toaq: 'da!', english: 'I.claim' },
	]);
});
