import type { ToaqToken } from '../morphology/tokenize';

export class ParseError extends Error {
	constructor(
		token: ToaqToken | undefined,
		baseMessage?: string,
		line?: string,
	) {
		let message = baseMessage;
		if (token) {
			message = `on line ${token.position.line + 1} column ${token.position.column + 1}: ${message}`;
			if (line) {
				message += `\n\n    ${line}`;
				const spaces = ' '.repeat(token.position.column);
				const carets = '^'.repeat(token.value.length);
				message += `\n    ${spaces}${carets}`;
			}
		} else {
			message += ' (at EOF)';
		}
		super(message);
		this.name = 'ParseError';
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
