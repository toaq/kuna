import {
	ParseError,
	Parser,
	ParseResult,
	ParserOutput,
	Token,
} from 'typescript-parsec';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function rapply<TKind, TFrom, TTo>(
	p: Parser<TKind, TFrom>,
	callback: (
		value: TFrom,
		tokenRange: [Token<TKind> | undefined, Token<TKind> | undefined],
	) => Result<TTo, string>,
): Parser<TKind, TTo> {
	return {
		parse(token: Token<TKind> | undefined): ParserOutput<TKind, TTo> {
			const output = p.parse(token);
			if (output.successful) {
				let candidates: ParseResult<TKind, TTo>[] = [];
				let error: ParseError = {
					kind: 'Error',
					pos: token?.pos,
					message: 'No candidates',
				};
				for (const value of output.candidates) {
					const result = callback(value.result, [token, value.nextToken]);
					if (result.ok) {
						candidates.push({
							firstToken: token,
							nextToken: value.nextToken,
							result: result.value,
						});
					} else {
						error = { kind: 'Error', pos: token?.pos, message: result.error };
					}
				}
				if (candidates.length > 0) {
					return {
						candidates,
						successful: true,
						error: output.error,
					};
				} else {
					return { successful: false, error };
				}
			} else {
				return output;
			}
		},
	};
}
