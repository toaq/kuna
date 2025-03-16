import { Impossible } from '../../core/error';
import { bare, inTone } from '../../morphology/tokenize';
import { Tone } from '../../morphology/tone';
import {
	type AnimacyClass,
	type Binding,
	type ExprType,
	assertFn,
} from '../model';
import {
	type Names,
	type Render,
	Renderer,
	addName,
	alphabets,
	join,
	noNames,
	token,
} from './format';
import type { RichExpr } from './model';

enum TypePrecedence {
	Function = 1,
	Apply = 2,
	Pair = 3,
	Bracket = 4,
}

function mo(inner: string): string {
	return `<mo>${inner}</mo>`;
}

function mi(inner: string, className = ''): string {
	return className === ''
		? `<mi>${inner}</mi>`
		: `<mi class="${className}">${inner}</mi>`;
}

export class MathmlType extends Renderer<ExprType, string> {
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
				return mi('hóa');
			case 'covert resumptive':
				return mi('PRO');
			case 'verb':
				return mi(inTone(b.verb, Tone.T2));
			case 'animacy':
				return mi(this.animacy(b.class));
			case 'head':
				return mi(`hụ́${bare(b.head)}`);
		}
	}

	protected sub(t: ExprType): Render<string> {
		if (typeof t === 'string') return token(t);
		switch (t.head) {
			case 'fn':
				return join(TypePrecedence.Function, 'right', [
					this.sub(t.domain),
					token(mo('→')),
					this.sub(t.range),
				]);
			case 'int':
				return this.app(token(mi('Int')), this.sub(t.inner));
			case 'cont':
				return this.app(token(mi('Cont')), this.sub(t.inner));
			case 'pl':
				return this.app(token(mi('Pl')), this.sub(t.inner));
			case 'gen':
				return this.app(token(mi('Gen')), this.sub(t.inner));
			case 'qn':
				return this.app(token(mi('Qn')), this.sub(t.inner));
			case 'pair':
				return join(TypePrecedence.Pair, 'none', [
					token(mo('(')),
					this.sub(t.inner),
					token(mo(', ')),
					this.sub(t.supplement),
					token(mo(')')),
				]);
			case 'bind':
				return this.app(
					this.app(token(mi('Bind')), token(this.binding(t.binding))),
					this.sub(t.inner),
				);
			case 'ref':
				return this.app(
					this.app(token(mi('Ref')), token(this.binding(t.binding))),
					this.sub(t.inner),
				);
			case 'dx':
				return this.app(token(mi('Dx')), this.sub(t.inner));
			case 'act':
				return this.app(token(mi('Act')), this.sub(t.inner));
		}
	}

	protected bracket(r: Render<string>) {
		return join(TypePrecedence.Bracket, 'none', [
			token(mo('(')),
			r,
			token(mo(')')),
		]);
	}

	protected join(tokens: string[]) {
		return tokens.join('');
	}
}

enum Precedence {
	Lambda = 0,
	Apply = 1,
	Subscript = 2,
	Bracket = 3,
}

export class Mathml extends Renderer<RichExpr, string> {
	private name(index: number, names: Names): string {
		const name = names.scope[index];
		const alphabet = alphabets[name.type];
		const letter = alphabet[name.id % alphabet.length];
		if (name.id / alphabet.length === 0) return mi(letter);
		const ticks = '′'.repeat(name.id / alphabet.length);
		return `<msup>${mi(letter)}<mo>${ticks}</mo></msup>`;
	}

	private go(e: RichExpr, names: Names): Render<string> {
		switch (e.head) {
			case 'variable':
				return token(this.name(e.index, names));
			case 'lambda': {
				assertFn(e.type);
				const newNames = addName(e.type.domain, names);
				return join(Precedence.Lambda, 'any', [
					token(
						`<mi>λ</mi>${this.name(0, newNames)}<mo lspace="0" rspace="0">&nbsp;</mo>`,
					),
					this.go(e.body, newNames),
				]);
			}
			case 'apply':
				return join(Precedence.Apply, 'left', [
					this.go(e.fn, names),
					token('<mo lspace="0" rspace="0">&nbsp;</mo>'),
					this.go(e.arg, names),
				]);
			case 'lexeme':
				return token(mi(`${e.name}`, 'kuna-lexeme'));
			case 'quote':
				return token(mi(`"${e.text}"`, 'kuna-quote'));
			case 'constant':
				return token(mi(e.name, 'kuna-constant'));
			case 'subscript':
				return join(Precedence.Subscript, 'left', [
					token('<msub><mrow>'),
					this.go(e.base, names),
					token('</mrow><mrow>'),
					this.go(e.sub, names),
					token('</mrow></msub>'),
				]);
		}
	}

	protected sub(e: RichExpr): Render<string> {
		if (e.scope.length > 0) throw new Impossible('Not a closed expression');
		return this.go(e, noNames);
	}

	protected bracket(r: Render<string>): Render<string> {
		return join(Precedence.Bracket, 'none', [
			token(mo('(')),
			r,
			token(mo(')')),
		]);
	}

	protected join(tokens: string[]): string {
		return tokens.join('');
	}
}
