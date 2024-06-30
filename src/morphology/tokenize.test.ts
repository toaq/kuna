import { expect, test } from 'vitest';
import {
	ToaqTokenizer,
	bare,
	baseForm,
	clean,
	inTone,
	splitIntoRaku,
	splitPrefixes,
	tone,
} from './tokenize';
import { Tone } from './tone';

test('it cleans up Toaq words', () => {
	expect(clean('gi')).toEqual('gı');
	expect(clean('SIO')).toEqual('sıo');
	expect(clean('Kiei')).toEqual('kıeı');
	expect(clean('wä')).toEqual('ꝡä');
	expect(clean('VÄ')).toEqual('ꝡä');
	expect(clean('yä')).toEqual('ꝡä');
	expect(clean('vyä')).toEqual('ꝡä');
	expect(clean('O’aomo')).toEqual("o'aomo");
});

test('it strips Toaq words of tones', () => {
	expect(bare('háo')).toEqual('hao');
	expect(bare('ha\u0302o')).toEqual('hao');
	expect(bare('vyä')).toEqual('ꝡa');
	expect(bare('jí')).toEqual('jı');
});

test('it recovers dictionary forms of words', () => {
	expect(baseForm('háo')).toEqual('hao');
	expect(baseForm('é')).toEqual('ë');
	expect(baseForm('wä')).toEqual('ꝡä');
	expect(baseForm('dâ')).toEqual('dâ');
	expect(baseForm('dê')).toEqual('de');
});

test('it tone-conjugates words', () => {
	expect(inTone('de', Tone.T1)).toEqual('de');
	expect(inTone('de', Tone.T2)).toEqual('dé');
	expect(inTone('de', Tone.T3)).toEqual('dë');
	expect(inTone('de', Tone.T4)).toEqual('dê');

	expect(inTone('Suao', Tone.T1)).toEqual('Suao');
	expect(inTone('Suao', Tone.T2)).toEqual('Súao');
	expect(inTone('Suao', Tone.T3)).toEqual('Süao');
	expect(inTone('Suao', Tone.T4)).toEqual('Sûao');
});

test('it detects the tone of words', () => {
	expect(tone('Suao')).toEqual(Tone.T1);
	expect(tone('Súao')).toEqual(Tone.T2);
	expect(tone('Süao')).toEqual(Tone.T3);
	expect(tone('Sûao')).toEqual(Tone.T4);
});

test('it splits words into raku', () => {
	expect(splitIntoRaku('húaqtojemu')).toEqual(['hu\u0301aq', 'to', 'je', 'mu']);
	expect(splitIntoRaku('ramaı')).toEqual(['ra', 'maı']);
	expect(splitIntoRaku('rammaı')).toEqual(['ram', 'maı']);
	expect(splitIntoRaku("ram'aı")).toEqual(['ram', "'aı"]);
	expect(splitIntoRaku('foreign')).toEqual(['foreign']);
});

test('it splits prefixes off words', () => {
	expect(splitPrefixes('hachoaısao')).toEqual({
		prefixes: [],
		root: 'hachoaısao',
	});
	expect(splitPrefixes('hạchoaısao')).toEqual({
		prefixes: ['ha'],
		root: 'choaısao',
	});
	expect(splitPrefixes('ha-choaısao')).toEqual({
		prefixes: ['ha'],
		root: 'choaısao',
	});
	expect(splitPrefixes('hachòaısao')).toEqual({
		prefixes: ['ha'],
		root: 'choaısao',
	});
	expect(splitPrefixes('hạ́choaısao')).toEqual({
		prefixes: ['ha'],
		root: 'chóaısao',
	});
	expect(splitPrefixes('há-choaısao')).toEqual({
		prefixes: ['ha'],
		root: 'chóaısao',
	});
	expect(splitPrefixes('jıahạchoaısao')).toEqual({
		prefixes: ['jıa', 'ha'],
		root: 'choaısao',
	});
	expect(splitPrefixes('jıaha-choaısao')).toEqual({
		prefixes: ['jıa', 'ha'],
		root: 'choaısao',
	});
	expect(splitPrefixes('jıahachòaısao')).toEqual({
		prefixes: ['jıa', 'ha'],
		root: 'choaısao',
	});
	expect(splitPrefixes('jíahạchoaısao')).toEqual({
		prefixes: ['jıa', 'ha'],
		root: 'chóaısao',
	});
	expect(splitPrefixes('jíaha-choaısao')).toEqual({
		prefixes: ['jıa', 'ha'],
		root: 'chóaısao',
	});
	expect(splitPrefixes('jıahachóaısao')).toEqual({
		prefixes: ['jıa', 'ha'],
		root: 'chóaısao',
	});
});

test('it tokenizes sentences', () => {
	const tokenizer = new ToaqTokenizer();
	tokenizer.reset('Ꝡa bụqgı é sho tı súq nírıaq da!');
	expect(tokenizer.tokens).toEqual([
		{ type: 'complementizer', value: 'Ꝡa', position: { line: 0, column: 0 } },
		{ type: 'prefix', value: 'buq-', position: { line: 0, column: 3 } },
		{ type: 'predicate', value: 'gı', position: { line: 0, column: 3 } },
		{ type: 'determiner', value: '◌́', position: { line: 0, column: 9 } },
		{ type: 'event_accessor', value: 'ë', position: { line: 0, column: 9 } },
		{ type: 'predicate', value: 'sho', position: { line: 0, column: 11 } },
		{ type: 'predicate', value: 'tı', position: { line: 0, column: 15 } },
		{ type: 'pronoun', value: 'súq', position: { line: 0, column: 18 } },
		{ type: 'determiner', value: '◌́', position: { line: 0, column: 22 } },
		{ type: 'predicate', value: 'nırıaq', position: { line: 0, column: 22 } },
		{ type: 'illocution', value: 'da', position: { line: 0, column: 29 } },
	]);
	expect(tokenizer.next()!.value).toEqual('Ꝡa');
	expect(tokenizer.next()!.value).toEqual('buq-');

	tokenizer.reset('Âo ꝡä zudeq jí Tóaqzu, nä jaı jí.');
	expect(tokenizer.next()!.type).toEqual('modality_with_complement');

	tokenizer.reset('Mụcho jí zạ́faq.');
	expect(tokenizer.tokens).toEqual([
		{ type: 'prefix', value: 'mu-', position: { line: 0, column: 0 } },
		{ type: 'predicate', value: 'cho', position: { line: 0, column: 0 } },
		{ type: 'pronoun', value: 'jí', position: { line: 0, column: 6 } },
		{ type: 'determiner', value: '◌́', position: { line: 0, column: 9 } },
		{ type: 'prefix_aspect', value: 'za-', position: { line: 0, column: 9 } },
		{ type: 'predicate', value: 'faq', position: { line: 0, column: 9 } },
	]);

	tokenizer.reset('Kuq mí Mô mó «Shu teo hú mo «azazo» teo» teo');
	expect(tokenizer.tokens).toEqual([
		{ type: 'predicate', value: 'Kuq', position: { line: 0, column: 0 } },
		{ type: 'determiner', value: '◌́', position: { line: 0, column: 4 } },
		{ type: 'name_verb', value: 'mı', position: { line: 0, column: 4 } },
		{ type: 'word', value: 'Mô', position: { line: 0, column: 7 } },
		{ type: 'determiner', value: '◌́', position: { line: 0, column: 10 } },
		{ type: 'text_quote', value: 'mo', position: { line: 0, column: 10 } },
		{
			type: 'text',
			value: 'Shu teo hú mo «azazo» teo',
			position: { line: 0, column: 14 },
		},
		{ type: 'end_quote', value: 'teo', position: { line: 0, column: 41 } },
	]);
});

test('it keeps capitalization', () => {
	const tokenizer = new ToaqTokenizer();
	tokenizer.reset('Gı Tóaqzu');
	expect(tokenizer.tokens).toEqual([
		{ type: 'predicate', value: 'Gı', position: { line: 0, column: 0 } },
		{ type: 'determiner', value: '◌́', position: { line: 0, column: 3 } },
		{ type: 'predicate', value: 'Toaqzu', position: { line: 0, column: 3 } },
	]);
});
