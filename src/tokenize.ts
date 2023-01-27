import { buildLexer, Token } from 'typescript-parsec';
import { dictionary, WordType } from './dictionary';
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
	const norm = word.normalize('NFKD').match(/[\u0301\u0308\u0302]/);
	if (!norm) {
		return Tone.T1;
	}
	return {
		'\u0301': Tone.T2,
		'\u0308': Tone.T3,
		'\u0302': Tone.T4,
	}[norm[0]]!;
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
