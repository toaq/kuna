import { bare, inTone } from '../../morphology/tokenize';
import { Tone } from '../../morphology/tone';
import type { AnimacyClass, Binding, ExprType } from '../model';
import { type Render, Renderer, join, token } from './format';

enum TypePrecedence {
	Function = 1,
	Apply = 2,
	Pair = 3,
	Bracket = 4,
}

export class PlainTextType extends Renderer<ExprType, string> {
	private app(fn: Render<string>, arg: Render<string>): Render<string> {
		// Note: it's okay for type constructor application to get an associativity of
		// 'any' because only one grouping will ever make sense. For example we know
		// that Qn Pl e is Qn (Pl e) and not (Qn Pl) e, because (Qn Pl) is illegal.
		return join(TypePrecedence.Apply, 'any', [fn, token(' '), arg]);
	}

	private animacy(a: AnimacyClass): string {
		switch (a) {
			case 'animate':
				return 'hó';
			case 'inanimate':
				return 'máq';
			case 'abstract':
				return 'hóq';
			case 'descriptive':
				return 'tá';
		}
	}

	private binding(b: Binding): string {
		switch (b.type) {
			case 'resumptive':
				return 'hóa';
			case 'verb':
				return inTone(b.verb, Tone.T2);
			case 'animacy':
				return this.animacy(b.class);
			case 'head':
				return `hụ́${bare(b.head)}`;
		}
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
			case 'cont':
				return this.app(token('Cont'), this.sub(t.inner));
			case 'pl':
				return this.app(token('Pl'), this.sub(t.inner));
			case 'gen':
				return this.app(token('Gen'), this.sub(t.inner));
			case 'qn':
				return this.app(token('Qn'), this.sub(t.inner));
			case 'pair':
				return join(TypePrecedence.Pair, 'none', [
					token('('),
					this.sub(t.inner),
					token(', '),
					this.sub(t.supplement),
					token(')'),
				]);
			case 'bind':
				return this.app(
					this.app(token('Bind'), token(this.binding(t.binding))),
					this.sub(t.inner),
				);
			case 'ref':
				return this.app(
					this.app(token('Ref'), token(this.binding(t.binding))),
					this.sub(t.inner),
				);
		}
	}

	protected bracket(r: Render<string>) {
		return join(TypePrecedence.Bracket, 'none', [token('('), r, token(')')]);
	}

	protected join(tokens: string[]) {
		return tokens.join('');
	}
}
