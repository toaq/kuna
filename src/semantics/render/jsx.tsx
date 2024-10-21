import { type ReactNode, useId } from 'react';
import { Tooltip } from 'react-tooltip';
import { typeToPlainText } from '.';
import { Impossible } from '../../core/error';
import { type Expr, assertFn } from '../model';
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

enum Precedence {
	Lambda = 0,
	Apply = 1,
	Bracket = 2,
}

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

export class Jsx extends Renderer<Expr, ReactNode> {
	private name(index: number, names: Names): string {
		const name = names.scope[index];
		const alphabet = alphabets[name.type];
		const letter = alphabet[name.id % alphabet.length];
		const ticks = "'".repeat(name.id / alphabet.length);
		return `${letter}${ticks}`;
	}

	private go(e: Expr, names: Names): Render<ReactNode> {
		switch (e.head) {
			case 'variable':
				return { ...token(this.name(e.index, names)), exprType: e.type };
			case 'lambda': {
				assertFn(e.type);
				const newNames = addName(e.type.domain, names);
				const lambda = join(Precedence.Lambda, 'any', [
					token(<>λ{this.name(0, newNames)}&nbsp;</>),
					this.go(e.body, newNames),
				]);
				return { ...lambda, exprType: e.type };
			}
			case 'apply': {
				const apply = join(Precedence.Apply, 'left', [
					this.go(e.fn, names),
					token(' '),
					this.go(e.arg, names),
				]);
				return { ...apply, exprType: e.type };
			}
			case 'lexeme':
				return { ...token(<b>{e.name}</b>), exprType: e.type };
			case 'quote':
				return { ...token(`"${e.text}"`), exprType: e.type };
			case 'constant':
				return { ...token(e.name), exprType: e.type };
		}
	}

	protected sub(e: Expr): Render<ReactNode> {
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
	render(input: Expr): ReactNode {
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
