import { rep, Token, TokenPosition } from 'typescript-parsec';

import {
	buildLexer,
	expectEOF,
	expectSingleResult,
	rule,
} from 'typescript-parsec';
import { alt, apply, kmid, lrec_sc, seq, str, tok } from 'typescript-parsec';
import { rapply, Result } from './combinators';
import { dictionary, Entry, WordType } from './dictionary';
import { Tone } from './types';
enum TokenKind {
	Word,
	Space,
}

export function bare(word: string): string {
	return word
		.toLowerCase()
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/i/gu, 'ı')
		.replace(/vy?|wy?|y/gu, 'ꝡ');
}

export function tone(word: string): Tone {
	const norm = word.normalize('NFKD');
	if (norm.indexOf('\u0301') > -1) {
		return Tone.T2;
	} else if (norm.indexOf('\u0308') > -1) {
		return Tone.T3;
	} else if (norm.indexOf('\u0302') > -1) {
		return Tone.T4;
	}
	return Tone.T1;
}

export function preprocess(token: Token<TokenKind>): Token<WordType> {
	const lemmaForm = token.text.toLowerCase().normalize();
	const bareWord = bare(token.text);
	const exactEntry = dictionary.get(lemmaForm);
	if (exactEntry) {
		return {
			kind: exactEntry.type,
			text: token.text,
			pos: token.pos,
			next: token.next ? preprocess(token.next) : undefined,
		};
	}
	const bareEntry = dictionary.get(bareWord);
	if (bareEntry) {
		const wordTone = tone(token.text);
		return {
			kind: wordTone === Tone.T2 ? 'determiner' : 'preposition',
			text: wordTone === Tone.T2 ? '◌́' : '◌̂',
			pos: token.pos,
			next: {
				kind: bareEntry.type,
				text: token.text,
				pos: token.pos,
				next: token.next ? preprocess(token.next) : undefined,
			},
		};
	}
	return {
		kind: 'predicate',
		text: token.text,
		pos: token.pos,
		next: token.next ? preprocess(token.next) : undefined,
	};
}

export const lexer = buildLexer([
	[true, /^[\p{L}\p{N}\p{Diacritic}]+-?/gu, TokenKind.Word],
	[false, /^[\s\p{P}]+/gu, TokenKind.Space],
]);
