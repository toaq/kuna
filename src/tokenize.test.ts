import { test, expect } from 'vitest';
import {
	clean,
	bare,
	baseForm,
	inTone,
	tone,
	splitIntoRaku,
	splitPrefixes,
	ToaqTokenizer,
} from './tokenize';
import { Tone } from './types';

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

test('it tokenizes a sentence', () => {
	const tokenizer = new ToaqTokenizer();
	tokenizer.reset('Ꝡa bụqgı é sho tı súq nírıaq da!');
	expect(tokenizer.tokens).toEqual([
		{ type: 'complementizer', value: 'Ꝡa', index: 0 },
		{ type: 'prefix', value: 'buq-', index: 3 },
		{ type: 'predicate', value: 'gı', index: 3 },
		{ type: 'determiner', value: '◌́', index: 9 },
		{ type: 'event_accessor', value: 'ë', index: 9 },
		{ type: 'predicate', value: 'sho', index: 11 },
		{ type: 'predicate', value: 'tı', index: 15 },
		{ type: 'pronoun', value: 'súq', index: 18 },
		{ type: 'determiner', value: '◌́', index: 22 },
		{ type: 'predicate', value: 'nırıaq', index: 22 },
		{ type: 'illocution', value: 'da', index: 29 },
	]);
	expect(tokenizer.next()!.value).toEqual('Ꝡa');
	expect(tokenizer.next()!.value).toEqual('buq-');
});
