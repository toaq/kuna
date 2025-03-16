import { type ReactNode, useId } from 'react';
import { Tooltip } from 'react-tooltip';
import { typeToPlainText } from '.';
import { Impossible } from '../../core/error';
import {
	type Associativity,
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

enum Precedence {
	Quantify = 0,
	And = 1,
	Implies = 2,
	Equals = 3,
	Element = 4,
	Apply = 5,
	Bracket = 6,
}

const quantifiers: Record<(RichExpr & { head: 'quantify' })['q'], string> = {
	lambda: 'λ',
	some: '∃',
	every: '∀',
};

interface Infix {
	symbol: string;
	precedence: Precedence;
	associativity: Associativity;
}

const infixes: Record<(RichExpr & { head: 'infix' })['op'], Infix> = {
	element: {
		symbol: '∈',
		precedence: Precedence.Element,
		associativity: 'none',
	},
	and: { symbol: '∧', precedence: Precedence.And, associativity: 'any' },
	implies: {
		symbol: '→',
		precedence: Precedence.Implies,
		associativity: 'none',
	},
	equals: { symbol: '=', precedence: Precedence.Equals, associativity: 'none' },
};

function TypeHover(props: {
	tooltipId: string;
	render: Render<ReactNode>;
}): ReactNode {
	const { tooltipId, render } = props;
	const inner: ReactNode =
		render.type === 'token' ? (
			render.content
		) : (
			<span>
				{render.parts.map((part, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: rendering static tree
					<TypeHover tooltipId={tooltipId} render={part} key={i} />
				))}
			</span>
		);
	return render.exprType ? (
		<span
			className="type-hover"
			data-tooltip-id={tooltipId}
			data-tooltip-content={typeToPlainText(render.exprType)}
		>
			{inner}
		</span>
	) : (
		inner
	);
}

export class Jsx extends Renderer<RichExpr, ReactNode> {
	private name(index: number, names: Names): string {
		const name = names.scope[index];
		const alphabet = alphabets[name.type];
		const letter = alphabet[name.id % alphabet.length];
		const ticks = "'".repeat(name.id / alphabet.length);
		return `${letter}${ticks}`;
	}

	private go_(e: RichExpr, names: Names): Render<ReactNode> {
		switch (e.head) {
			case 'variable':
				return token(this.name(e.index, names));
			case 'quantify': {
				const newNames = addName(e.body.scope[0], names);
				return join(Precedence.Quantify, 'any', [
					token(
						<>
							{quantifiers[e.q]}
							{this.name(0, newNames)}&nbsp;
						</>,
					),
					this.go(e.body, newNames),
				]);
			}
			case 'apply':
				return join(Precedence.Apply, 'left', [
					this.go(e.fn, names),
					token(' '),
					this.go(e.arg, names),
				]);
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
			case 'lexeme':
				return token(<b>{e.name}</b>);
			case 'quote':
				return token(`"${e.text}"`);
			case 'constant':
				return token(e.name);
		}
	}

	private go(e: RichExpr, names: Names): Render<ReactNode> {
		return { ...this.go_(e, names), exprType: e.type };
	}

	protected sub(e: RichExpr): Render<ReactNode> {
		if (e.scope.length > 0) throw new Impossible('Not a closed expression');
		return this.go(e, noNames);
	}

	protected bracket(r: Render<ReactNode>): Render<ReactNode> {
		return {
			...join(Precedence.Bracket, 'none', [token('('), r, token(')')]),
			exprType: r.exprType,
		};
	}

	protected join(tokens: ReactNode[]): ReactNode {
		return <>{tokens}</>;
	}

	/**
	 * Renders an expression.
	 */
	render(input: RichExpr): ReactNode {
		const raw = this.sub(input);
		const bracketed = this.bracketAll(raw);
		const id = useId();
		return (
			<span>
				<Tooltip
					id={id}
					opacity={1}
					style={{
						textAlign: 'center',
						transition: 'none',
						color: 'white',
						background: 'black',
						zIndex: 2,
					}}
				/>
				<TypeHover tooltipId={id} render={bracketed} />
			</span>
		);
	}
}
