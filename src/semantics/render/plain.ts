import { Impossible, Unimplemented } from '../../core/error';
import { type Expr, type ExprType, bindingToString } from '../types';
import {
	type Associativity,
	type Names,
	type Render,
	Renderer,
	addNames,
	alphabets,
	join,
	noNames,
	token,
} from './format';
import { type RichExpr, enrich } from './model';

enum TypePrecedence {
	Pair = 0,
	Function = 1,
	Apply = 2,
	Bracket = 3,
}

export class PlainTextType extends Renderer<ExprType, string> {
	private app(fn: Render<string>, arg: Render<string>): Render<string> {
		// Note: it's okay for type constructor application to get an associativity of
		// 'any' because only one grouping will ever make sense. For example we know
		// that Qn Pl e is Qn (Pl e) and not (Qn Pl) e, because (Qn Pl) is illegal.
		return join(TypePrecedence.Apply, 'any', [fn, token(' '), arg]);
	}

	protected sub(t: ExprType): Render<string> {
		if (typeof t === 'string') return token(t);
		switch (t.head) {
			case 'fn':
				return join(TypePrecedence.Function, 'right', [
					this.sub(t.domain),
					token(' → '),
					this.sub(t.range),
				]);
			case 'int':
				return this.app(token('Int'), this.sub(t.inner));
			case 'cont':
				return this.app(token('Cont'), this.sub(t.inner));
			case 'pl':
				return this.app(token('Pl'), this.sub(t.inner));
			case 'gen':
				return this.app(token('Gen'), this.sub(t.inner));
			case 'qn':
				return this.app(token('Qn'), this.sub(t.inner));
			case 'pair':
				return join(TypePrecedence.Pair, 'any', [
					this.sub(t.inner),
					token(', '),
					this.sub(t.supplement),
				]);
			case 'bind':
				return this.app(
					this.app(token('Bind'), token(bindingToString(t.binding))),
					this.sub(t.inner),
				);
			case 'ref':
				return this.app(
					this.app(token('Ref'), token(bindingToString(t.binding))),
					this.sub(t.inner),
				);
			case 'nf':
				return this.app(
					this.app(token('Nf'), this.sub(t.domain)),
					this.sub(t.inner),
				);
			case 'dx':
				return this.app(token('Dx'), this.sub(t.inner));
			case 'act':
				return this.app(token('Act'), this.sub(t.inner));
		}
	}

	protected bracket(r: Render<string>) {
		return join(TypePrecedence.Bracket, 'none', [token('('), r, token(')')]);
	}

	protected join(tokens: string[]) {
		return tokens.join('');
	}
}

enum Precedence {
	Do = 0,
	Assign = 1,
	Pair = 2,
	Quantify = 3,
	Implies = 4,
	Or = 5,
	And = 6,
	Equals = 7,
	Among = 8,
	Apply = 9,
	Prefix = 10,
	Bracket = 11,
}

const quantifiers: Record<(RichExpr & { head: 'quantify' })['q'], string> = {
	lambda: 'λ',
	some: '∃',
	every: '∀',
};

const prefixes: Record<(RichExpr & { head: 'prefix' })['op'], string> = {
	not: '¬',
};

interface Infix {
	symbol: string;
	precedence: Precedence;
	associativity: Associativity;
}

const infixes: Record<(RichExpr & { head: 'infix' })['op'], Infix> = {
	among: {
		symbol: '≺',
		precedence: Precedence.Among,
		associativity: 'none',
	},
	or: { symbol: '∨', precedence: Precedence.Or, associativity: 'any' },
	and: { symbol: '∧', precedence: Precedence.And, associativity: 'any' },
	implies: {
		symbol: '→',
		precedence: Precedence.Implies,
		associativity: 'none',
	},
	equals: { symbol: '=', precedence: Precedence.Equals, associativity: 'none' },
};

export class PlainText extends Renderer<RichExpr, string> {
	private name(index: number, names: Names): string {
		const name = names.scope[index];
		const alphabet = alphabets[name.type];
		const letter = alphabet[name.id % alphabet.length];
		const ticks = "'".repeat(name.id / alphabet.length);
		return `${letter}${ticks}`;
	}

	private go(e: RichExpr, names: Names): Render<string> {
		switch (e.head) {
			case 'variable':
				return token(this.name(e.index, names));
			case 'quantify': {
				const newNames = addNames(e.param.scope, names);
				return join(Precedence.Quantify, 'any', [
					token(quantifiers[e.q]),
					this.go(e.param, newNames),
					token(' '),
					this.go(e.body, newNames),
				]);
			}
			case 'apply':
				return join(Precedence.Apply, 'left', [
					this.go(e.fn, names),
					token(' '),
					this.go(e.arg, names),
				]);
			case 'prefix': {
				const prefix = prefixes[e.op];
				return join(Precedence.Prefix, 'right', [
					token(prefix),
					this.go(e.body, names),
				]);
			}
			case 'infix': {
				const infix = infixes[e.op];
				return join(infix.precedence, infix.associativity, [
					this.go(e.left, names),
					token(` ${infix.symbol} `),
					this.go(e.right, names),
				]);
			}
			case 'subscript':
				return join(Precedence.Apply, 'left', [
					this.go(e.base, names),
					token(' '),
					this.go(e.sub, names),
				]);
			case 'pair':
				return join(Precedence.Pair, 'any', [
					this.go(e.left, names),
					token(', '),
					this.go(e.right, names),
				]);
			// biome-ignore lint/suspicious/noFallthroughSwitchClause: false positive
			case 'do':
				switch (e.op) {
					case 'get': {
						const newNames = addNames(e.left.scope, names);
						return join(Precedence.Do, 'right', [
							join(Precedence.Assign, 'none', [
								this.go(e.left, newNames),
								token(' ⇐ '),
								'scope' in e.right
									? this.go(e.right, names)
									: token(bindingToString(e.right)),
							]),
							token(e.pure ? '; ' : ', '),
							this.go(e.result, newNames),
						]);
					}
					case 'set':
						return join(Precedence.Do, 'right', [
							join(Precedence.Assign, 'none', [
								this.go(e.left, names),
								token(` ⇒ ${bindingToString(e.right)}`),
							]),
							token(e.pure ? '; ' : ', '),
							this.go(e.result, names),
						]);
					case 'run':
						return join(Precedence.Do, 'right', [
							this.go(e.right, names),
							token(e.pure ? '; ' : ', '),
							this.go(e.result, names),
						]);
				}
			case 'lexeme':
				return token(`⟦${e.name}⟧`);
			case 'quote':
				return token(`"${e.text}"`);
			case 'constant':
				return token(e.name);
		}
	}

	protected sub(e: RichExpr): Render<string> {
		if (e.scope.length > 0) throw new Impossible('Not a closed expression');
		return this.go(e, noNames);
	}

	protected bracket(r: Render<string>): Render<string> {
		return join(Precedence.Bracket, 'none', [token('('), r, token(')')]);
	}

	protected join(tokens: string[]): string {
		return tokens.join('');
	}
}

export function toPlainText(e: Expr, compact?: boolean): string {
	if (compact) throw new Unimplemented();
	return new PlainText().render(enrich(e));
}

export function typeToPlainText(t: ExprType): string {
	return new PlainTextType().render(t);
}

export function typesToPlainText(ts: ExprType[]): string {
	return ts.map(typeToPlainText).join(', ');
}
