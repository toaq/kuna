import * as assert from 'assert';
import { rep, Token, TokenPosition } from 'typescript-parsec';

import {
	buildLexer,
	expectEOF,
	expectSingleResult,
	rule,
} from 'typescript-parsec';
import { alt, apply, kmid, lrec_sc, seq, str, tok } from 'typescript-parsec';

enum TokenKind {
	Word,
	Space,
}

enum Tone {
	T1 = 1,
	T2,
	T3,
	T4,
}

function bare(word: string): string {
	return word
		.toLowerCase()
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/i/gu, 'ı')
		.replace(/vy?|wy?|y/gu, 'ꝡ');
}

function tone(word: string): Tone {
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

interface Word {
	pos: TokenPosition;
	text: string;
	bare: string;
	tone: Tone;
}

function makeWord(token: Token<TokenKind>): Word {
	return {
		pos: token.pos,
		text: token.text,
		bare: bare(token.text),
		tone: tone(token.text),
	};
}

const lexer = buildLexer([
	[true, /^[\p{L}\p{N}\p{Diacritic}]+/gu, TokenKind.Word],
	[false, /^[\s\p{P}]+/gu, TokenKind.Space],
]);

const SENTENCE = rule<TokenKind, any>();

/*
TERM
  = NUMBER
  = ('+' | '-') TERM
  = '(' EXP ')'
*/
SENTENCE.setPattern(rep(apply(tok(TokenKind.Word), makeWord)));

// function evaluate(expr: string): number {
// 	return expectSingleResult(expectEOF(SENTENCE.parse(lexer.parse(expr))));
// }

console.dir(
	expectSingleResult(expectEOF(SENTENCE.parse(lexer.parse('Hıo jí súq ka.')))),
	null,
);
