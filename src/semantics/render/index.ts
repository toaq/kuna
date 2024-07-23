import { Unimplemented } from '../../core/error';
import type { Expr, ExprType } from '../model';
import { PlainTextType } from './plain';

export function toPlainText(_e: Expr, _compact?: boolean): string {
	throw new Unimplemented();
}

export function toLatex(_e: Expr, _compact?: boolean): string {
	throw new Unimplemented();
}

export function toMathml(_e: Expr, _compact?: boolean): string {
	throw new Unimplemented();
}

export function toJson(_e: Expr, _compact?: boolean): unknown {
	throw new Unimplemented();
}

// A replacement for JSON.stringify that uses less linebreaks, à la Haskell coding style.
export function jsonStringifyCompact(expr: any): string {
	if (!(typeof expr === 'object')) return JSON.stringify(expr);

	const isArray = Array.isArray(expr);
	const [opening, closing] = ['{}', '[]'][+isArray];

	const entries = Object.entries(expr);
	if (!entries.length) return `${opening} ${closing}`;

	return entries
		.map(([key, value], index, { length }) => {
			const maybeKey = isArray ? '' : `${JSON.stringify(key)}: `;
			const valueStringified = jsonStringifyCompact(value)
				.split('\n')
				.join(`\n${' '.repeat(isArray ? 4 : 2 + maybeKey.length)}`);
			const maybeOpening = index === 0 ? `${opening} ` : '';
			const commaOrClosing = index === length - 1 ? ` ${closing}` : ',';
			return maybeOpening + maybeKey + valueStringified + commaOrClosing;
		})
		.join('\n');
}

export function typeToPlainText(t: ExprType): string {
	return new PlainTextType().render(t);
}

export function typeToLatex(_t: ExprType): string {
	throw new Unimplemented();
}

export function typesToPlainText(ts: ExprType[]): string {
	return ts.map(typeToPlainText).join(', ');
}
