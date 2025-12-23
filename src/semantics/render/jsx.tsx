import classNames from 'classnames';
import {
	type CSSProperties,
	type ClassAttributes,
	type DOMAttributes,
	type FC,
	type ReactNode,
	useId,
} from 'react';
import { Tooltip } from 'react-tooltip';
import { Impossible } from '../../core/error';
import { dictionary } from '../../morphology/dictionary';
import { bare, clean } from '../../morphology/tokenize';
import { Tone, inTone } from '../../morphology/tone';
import {
	type AnimacyClass,
	type Binding,
	type ExprType,
	bindingToString,
} from '../types';
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
	wrap,
} from './format';
import type { RichExpr } from './model';
import { SiteleqType } from './siteleq';

// @types/react does not yet support MathML. The following type declarations are
// borrowed from https://github.com/DefinitelyTyped/DefinitelyTyped/pull/71187.

interface MathMLElement extends Element {}
interface MathMLMActionElement extends MathMLElement {}
interface MathMLMathElement extends MathMLElement {}
interface MathMLMerrorElement extends MathMLElement {}
interface MathMLMfracElement extends MathMLElement {}
interface MathMLMiElement extends MathMLElement {}
interface MathMLMmultiscriptsElement extends MathMLElement {}
interface MathMLMnElement extends MathMLElement {}
interface MathMLMoElement extends MathMLElement {}
interface MathMLMoverElement extends MathMLElement {}
interface MathMLMpaddedElement extends MathMLElement {}
interface MathMLMphantomElement extends MathMLElement {}
interface MathMLMprescriptsElement extends MathMLElement {}
interface MathMLMrootElement extends MathMLElement {}
interface MathMLMrowElement extends MathMLElement {}
interface MathMLMsElement extends MathMLElement {}
interface MathMLMspaceElement extends MathMLElement {}
interface MathMLMsqrtElement extends MathMLElement {}
interface MathMLMstyleElement extends MathMLElement {}
interface MathMLMsubElement extends MathMLElement {}
interface MathMLMsubsupElement extends MathMLElement {}
interface MathMLMsupElement extends MathMLElement {}
interface MathMLMtableElement extends MathMLElement {}
interface MathMLMtdElement extends MathMLElement {}
interface MathMLMtextElement extends MathMLElement {}
interface MathMLMtrElement extends MathMLElement {}
interface MathMLMunderElement extends MathMLElement {}
interface MathMLMunderoverElement extends MathMLElement {}
interface MathMLSemanticsElement extends MathMLElement {}

interface MathMLAnnotationElement extends MathMLElement {}
interface MathMLAnnotationXmlElement extends MathMLElement {}

type MathMLProps<E extends MathMLAttributes<T>, T> = ClassAttributes<T> & E;

// https://www.w3.org/TR/mathml-core/#global-attributes
interface MathMLAttributes<T> extends DOMAttributes<T> {
	className?: string | undefined;
	dir?: 'ltr' | 'rtl' | undefined;
	displaystyle?: boolean | undefined;
	href?: string | undefined;
	id?: string | undefined;
	nonce?: string | undefined;
	scriptlevel?: string | undefined;
	style?: CSSProperties | undefined;
	tabindex?: number | undefined;
	// This attributes are considered legacy but still described in the specification:
	//
	// https://www.w3.org/TR/mathml-core/#legacy-mathml-style-attributes
	//
	mathbackground?: string | undefined;
	mathcolor?: string | undefined;
	mathsize?: string | undefined;
}

// MathML elements and attributes are described here:
//
// https://www.w3.org/TR/mathml-core/#mathml-elements-and-attributes
//
interface MathMLMActionAttributes
	extends MathMLAttributes<MathMLMActionElement> {
	actiontype?: string | undefined;
	selection?: string | undefined;
}
interface MathMLMathAttributes extends MathMLAttributes<MathMLMathElement> {
	display?: 'block' | 'inline' | undefined;
}
interface MathMLMerrorAttributes
	extends MathMLAttributes<MathMLMerrorElement> {}
interface MathMLMfracAttributes extends MathMLAttributes<MathMLMfracElement> {
	linethickness?: string | undefined;
}
interface MathMLMiAttributes extends MathMLAttributes<MathMLMiElement> {
	mathvariant?: 'normal' | undefined;
}
interface MathMLMmultiscriptsAttributes
	extends MathMLAttributes<MathMLMmultiscriptsElement> {}
interface MathMLMnAttributes extends MathMLAttributes<MathMLMnElement> {}
interface MathMLMoAttributes extends MathMLAttributes<MathMLMoElement> {
	/* This attribute is non-standard. */
	accent?: boolean | undefined;
	fence?: boolean | undefined;
	largeop?: boolean | undefined;
	lspace?: string | undefined;
	maxsize?: string | undefined;
	minsize?: string | undefined;
	movablelimits?: boolean | undefined;
	rspace?: string | undefined;
	separator?: boolean | undefined;
	stretchy?: string | undefined;
	symmetric?: boolean | undefined;
}
interface MathMLMoverAttributes extends MathMLAttributes<MathMLMoverElement> {
	accent?: boolean | undefined;
}
interface MathMLMpaddedAttributes
	extends MathMLAttributes<MathMLMpaddedElement> {
	depth?: string | undefined;
	height?: string | undefined;
	lspace?: string | undefined;
	voffset?: string | undefined;
	width?: string | undefined;
}
interface MathMLMphantomAttributes
	extends MathMLAttributes<MathMLMphantomElement> {}
// Described in relation to <mmultiscripts /> here:
//
// https://www.w3.org/TR/mathml-core/#prescripts-and-tensor-indices-mmultiscripts
//
interface MathMLMprescriptsAttributes
	extends MathMLAttributes<MathMLMprescriptsElement> {}
interface MathMLMrootAttributes extends MathMLAttributes<MathMLMrootElement> {}
interface MathMLMrowAttributes extends MathMLAttributes<MathMLMrowElement> {}
interface MathMLMsAttributes extends MathMLAttributes<MathMLMrowElement> {
	lquote?: string | undefined;
	rquote?: string | undefined;
}
interface MathMLMspaceAttributes extends MathMLAttributes<MathMLMspaceElement> {
	depth?: string | undefined;
	height?: string | undefined;
	width?: string | undefined;
}
interface MathMLMsqrtAttributes extends MathMLAttributes<MathMLMsqrtElement> {}
interface MathMLMstyleAttributes
	extends MathMLAttributes<MathMLMstyleElement> {}
interface MathMLMsubAttributes extends MathMLAttributes<MathMLMsubElement> {}
interface MathMLMsubsupAttributes
	extends MathMLAttributes<MathMLMsubsupElement> {}
interface MathMLMsupAttributes extends MathMLAttributes<MathMLMsupElement> {}
interface MathMLMtableAttributes extends MathMLAttributes<MathMLMtableElement> {
	/* This attribute is non-standard. */
	align?: string | undefined;
	/* This attribute is non-standard. */
	columnalign?: string | undefined;
	/* This attribute is non-standard. */
	columnlines?: string | undefined;
	/* This attribute is non-standard. */
	columnspacing?: string | undefined;
	/* This attribute is non-standard. */
	frame?: 'none' | 'solid' | 'dashed' | undefined;
	/* This attribute is non-standard. */
	framespacing?: string | undefined;
	/* This attribute is non-standard. */
	rowalign?: string | undefined;
	/* This attribute is non-standard. */
	rowlines?: string | undefined;
	/* This attribute is non-standard. */
	rowspacing?: string | undefined;
	/* This attribute is non-standard. */
	width?: string | undefined;
}
interface MathMLMtdAttributes extends MathMLAttributes<MathMLMtdElement> {
	/* This attribute is non-standard. */
	columnalign?: 'left' | 'center' | 'right' | undefined;
	columnspan?: number | string | undefined;
	/* This attribute is non-standard. */
	rowalign?: 'axis' | 'baseline' | 'bottom' | 'center' | 'top' | undefined;
	rowspan?: number | string | undefined;
}
interface MathMLMtextAttributes extends MathMLAttributes<MathMLMtextElement> {}
interface MathMLMtrAttributes extends MathMLAttributes<MathMLMtrElement> {
	/* This attribute is non-standard. */
	columnalign?: 'left' | 'center' | 'right' | undefined;
	/* This attribute is non-standard. */
	rowalign?: 'axis' | 'baseline' | 'bottom' | 'center' | 'top' | undefined;
}
interface MathMLMunderAttributes extends MathMLAttributes<MathMLMunderElement> {
	accentunder?: boolean | undefined;
}
interface MathMLMunderoverAttributes extends MathMLAttributes<MathMLElement> {
	accent?: boolean | undefined;
	accentunder?: boolean | undefined;
}
/**
 * @see https://w3c.github.io/mathml-core/#semantics-and-presentation
 */
interface MathMLSemanticsAttributes
	extends MathMLAttributes<MathMLSemanticsElement> {}
/**
 * @see https://w3c.github.io/mathml-core/#semantics-and-presentation
 */
interface MathMLAnnotationAttributes
	extends MathMLAttributes<MathMLAnnotationElement> {
	encoding?: string | undefined;
}
/**
 * @see https://w3c.github.io/mathml-core/#semantics-and-presentation
 */
interface MathMLAnnotationXmlAttributes
	extends MathMLAttributes<MathMLAnnotationXmlElement> {
	encoding?: string | undefined;
}

declare global {
	namespace JSX {
		interface IntrinsicElements {
			maction: MathMLProps<MathMLMActionAttributes, MathMLMActionElement>;
			math: MathMLProps<MathMLMathAttributes, MathMLMathElement>;
			merror: MathMLProps<MathMLMerrorAttributes, MathMLMerrorElement>;
			mfrac: MathMLProps<MathMLMfracAttributes, MathMLMfracElement>;
			mi: MathMLProps<MathMLMiAttributes, MathMLMiElement>;
			mmultiscripts: MathMLProps<
				MathMLMmultiscriptsAttributes,
				MathMLMmultiscriptsElement
			>;
			mn: MathMLProps<MathMLMnAttributes, MathMLMnElement>;
			mo: MathMLProps<MathMLMoAttributes, MathMLMoElement>;
			mover: MathMLProps<MathMLMoverAttributes, MathMLMoverElement>;
			mpadded: MathMLProps<MathMLMpaddedAttributes, MathMLMpaddedElement>;
			mphantom: MathMLProps<MathMLMphantomAttributes, MathMLMphantomElement>;
			mprescripts: MathMLProps<
				MathMLMprescriptsAttributes,
				MathMLMprescriptsElement
			>;
			mroot: MathMLProps<MathMLMrootAttributes, MathMLMrootElement>;
			mrow: MathMLProps<MathMLMrowAttributes, MathMLMrowElement>;
			ms: MathMLProps<MathMLMsAttributes, MathMLMsElement>;
			mspace: MathMLProps<MathMLMspaceAttributes, MathMLMspaceElement>;
			msqrt: MathMLProps<MathMLMsqrtAttributes, MathMLMsqrtElement>;
			mstyle: MathMLProps<MathMLMstyleAttributes, MathMLMstyleElement>;
			msub: MathMLProps<MathMLMsubAttributes, MathMLMsubElement>;
			msubsup: MathMLProps<MathMLMsubsupAttributes, MathMLMsubsupElement>;
			msup: MathMLProps<MathMLMsupAttributes, MathMLMsupElement>;
			mtable: MathMLProps<MathMLMtableAttributes, MathMLMtableElement>;
			mtd: MathMLProps<MathMLMtdAttributes, MathMLMtdElement>;
			mtext: MathMLProps<MathMLMtextAttributes, MathMLMtextElement>;
			mtr: MathMLProps<MathMLMtrAttributes, MathMLMtrElement>;
			munder: MathMLProps<MathMLMunderAttributes, MathMLMunderElement>;
			munderover: MathMLProps<
				MathMLMunderoverAttributes,
				MathMLMunderoverElement
			>;
			semantics: MathMLProps<MathMLSemanticsAttributes, MathMLSemanticsElement>;
			// MathML semantic annotations
			annotation: MathMLProps<
				MathMLAnnotationAttributes,
				MathMLAnnotationElement
			>;
			'annotation-xml': MathMLProps<
				MathMLAnnotationXmlAttributes,
				MathMLAnnotationXmlElement
			>;
		}
	}
}

function animacy(a: AnimacyClass): ReactNode {
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

function binding(b: Binding): ReactNode {
	switch (b.type) {
		case 'resumptive':
			return <mi>hóa</mi>;
		case 'covert resumptive':
			return <mi>PRO</mi>;
		case 'gap':
			return <mi>já</mi>;
		case 'subject':
			return <mi>áqna</mi>;
		case 'reflexive':
			return <mi>áq</mi>;
		case 'name':
			return <mi>{inTone(b.verb, Tone.T2)}</mi>;
		case 'animacy':
			return <mi>{animacy(b.class)}</mi>;
		case 'head':
			return <mi>hụ́{bare(b.head)}</mi>;
	}
}

function richExprToNameHint(e: RichExpr): string | undefined {
	switch (e.head) {
		case 'subscript':
			return richExprToNameHint(e.base);
		case 'lexeme':
			return e.name;
		case 'quote':
			return e.text;
		case 'constant':
			return e.name;
		default:
			return undefined;
	}
}

enum TypePrecedence {
	Pair = 0,
	Function = 1,
	Apply = 2,
	Bracket = 3,
}

export class JsxType extends Renderer<ExprType, ReactNode> {
	private app(
		fn: Render<ReactNode>,
		arg: Render<ReactNode>,
	): Render<ReactNode> {
		// Note: it's okay for type constructor application to get an associativity of
		// 'any' because only one grouping will ever make sense. For example we know
		// that Qn Pl e is Qn (Pl e) and not (Qn Pl) e, because (Qn Pl) is illegal.
		return join(TypePrecedence.Apply, 'any', [fn, token(' '), arg]);
	}

	protected sub(t: ExprType): Render<ReactNode> {
		if (typeof t === 'string') return token(t);
		switch (t.head) {
			case 'fn':
				return join(TypePrecedence.Function, 'right', [
					this.sub(t.domain),
					token(<mo>→</mo>),
					this.sub(t.range),
				]);
			case 'int':
				return this.app(token(<mi>Int</mi>), this.sub(t.inner));
			case 'cont':
				return this.app(token(<mi>Cont</mi>), this.sub(t.inner));
			case 'pl':
				return this.app(token(<mi>Pl</mi>), this.sub(t.inner));
			case 'indef':
				return this.app(token(<mi>Indef</mi>), this.sub(t.inner));
			case 'qn':
				return this.app(token(<mi>Qn</mi>), this.sub(t.inner));
			case 'pair':
				return join(TypePrecedence.Pair, 'any', [
					this.sub(t.inner),
					token(<mo lspace="0">,</mo>),
					this.sub(t.supplement),
				]);
			case 'bind':
				return this.app(
					this.app(token(<mi>Bind</mi>), token(binding(t.binding))),
					this.sub(t.inner),
				);
			case 'ref':
				return this.app(
					this.app(token(<mi>Ref</mi>), token(binding(t.binding))),
					this.sub(t.inner),
				);
			case 'dx':
				return this.app(token(<mi>Dx</mi>), this.sub(t.inner));
			case 'act':
				return this.app(token(<mi>Act</mi>), this.sub(t.inner));
		}
	}

	protected bracket(r: Render<ReactNode>) {
		return join(TypePrecedence.Bracket, 'none', [
			token(<mo>(</mo>),
			r,
			token(<mo>)</mo>),
		]);
	}

	protected join(tokens: ReactNode[]) {
		return tokens;
	}
}

enum Precedence {
	Do = 0,
	Assign = 1,
	Pair = 2,
	Quantify = 3,
	Implies = 4,
	Or = 5,
	Xor = 6,
	And = 7,
	Equals = 8,
	Among = 9,
	Union = 10,
	Sum = 11,
	Subinterval = 12,
	Apply = 13,
	Prefix = 14,
	Subscript = 15,
	Bracket = 16,
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
	xor: { symbol: '⊕', precedence: Precedence.Xor, associativity: 'any' },
	and: { symbol: '∧', precedence: Precedence.And, associativity: 'any' },
	implies: {
		symbol: '→',
		precedence: Precedence.Implies,
		associativity: 'none',
	},
	equals: { symbol: '=', precedence: Precedence.Equals, associativity: 'none' },
	not_equals: {
		symbol: '≠',
		precedence: Precedence.Equals,
		associativity: 'none',
	},
	union: {
		symbol: '∪',
		precedence: Precedence.Union,
		associativity: 'any',
	},
	sum: {
		symbol: '⊔',
		precedence: Precedence.Sum,
		associativity: 'any',
	},
	subinterval: {
		symbol: '⊆',
		precedence: Precedence.Subinterval,
		associativity: 'none',
	},
};

const constants: Partial<
	Record<(RichExpr & { head: 'constant' })['name'], string>
> = {
	trace: 'τ',
};

const TypeHover: FC<{
	tooltipId: string;
	tooltipMap: { [id: string]: RichExpr };
	render: Render<ReactNode>;
}> = ({ tooltipId, tooltipMap, render }) => {
	let inner: ReactNode;
	switch (render.type) {
		case 'token':
			inner = render.content;
			break;
		case 'join':
			inner = render.parts.map((part, i) => (
				<TypeHover
					tooltipId={tooltipId}
					tooltipMap={tooltipMap}
					render={part}
					// biome-ignore lint/suspicious/noArrayIndexKey: rendering static tree
					key={i}
				/>
			));
			break;
		case 'wrap':
			inner = render.wrapper(
				<TypeHover
					tooltipId={tooltipId}
					tooltipMap={tooltipMap}
					render={render.inner}
				/>,
			);
			break;
	}

	const id = useId();
	if (render.expr !== undefined) tooltipMap[id] = render.expr;

	return render.expr ? (
		<mrow
			className="type-hover"
			data-tooltip-id={tooltipId}
			data-tooltip-content={id}
		>
			{inner}
		</mrow>
	) : (
		inner
	);
};

function lexemeDescription(name: string): string | undefined {
	const entry = dictionary.get(clean(name)) ?? dictionary.get(bare(name));
	if (entry === undefined) return undefined;
	return `${entry.type}: ${entry.english}`;
}

const ExprRender: FC<{
	r: Render<ReactNode>;
	tooltipMap: { [id: string]: RichExpr };
}> = ({ r, tooltipMap }) => {
	const id = useId();
	return (
		<>
			<Tooltip
				id={id}
				opacity={1}
				className="dark-mode"
				style={{
					textAlign: 'left',
					transition: 'none',
					zIndex: 2,
					backgroundColor: 'var(--color-gray-800)',
				}}
				render={({ content: id }) => {
					if (id === null) return undefined;
					const expr: RichExpr | undefined = tooltipMap[id];
					if (expr === undefined) return undefined;
					const siteleq = <SiteleqType t={expr.type} />;
					const name =
						expr.head === 'constant'
							? expr.name
							: expr.head === 'lexeme'
								? expr.name
								: undefined;
					const description =
						expr.head === 'constant'
							? expr.description
							: expr.head === 'lexeme'
								? lexemeDescription(expr.name)
								: undefined;
					return (
						<div className="flex flex-col gap-2">
							{name ? (
								<span className="text-sm">
									<span className="kuna-constant">{name}</span>{' '}
									<span className="text-gray-400">:</span> {siteleq}
								</span>
							) : (
								siteleq
							)}
							{description && (
								<span className="text-xs text-gray-400 max-w-xs">
									{description}
								</span>
							)}
						</div>
					);
				}}
			/>
			<math>
				<TypeHover tooltipId={id} tooltipMap={tooltipMap} render={r} />
			</math>
		</>
	);
};

function precedence(r: Render<ReactNode>): number | null {
	switch (r.type) {
		case 'token':
			return null;
		case 'join':
			return r.precedence;
		case 'wrap':
			return r.precedence ?? precedence(r.inner);
	}
}

export class Jsx extends Renderer<RichExpr, ReactNode> {
	private name(index: number, names: Names): ReactNode {
		const name = names.scope[index];
		const alphabet = alphabets[name.type];
		const letter = alphabet[name.id % alphabet.length];
		if (name.id < alphabet.length) return <mi>{letter}</mi>;
		const ticks = Math.ceil(name.id / alphabet.length);
		// Putting the ticks in a superscript is what Firefox and the spec expect
		return (
			<msup>
				<mi>{letter}</mi>
				<mo>{ticks}</mo>
			</msup>
		);
	}

	private do(pure: boolean, contents: Render<ReactNode>): Render<ReactNode> {
		return wrap(
			null,
			inner => (
				<mtable className={classNames('kuna-do', { 'kuna-pure': pure })}>
					{inner}
				</mtable>
			),
			contents,
		);
	}

	private doRow(contents: Render<ReactNode>): Render<ReactNode> {
		return wrap(
			null,
			inner => (
				<mtr>
					{' '}
					<mtd>{inner}</mtd>{' '}
				</mtr>
			),
			contents,
		);
	}

	private go_(e: RichExpr, names: Names): Render<ReactNode> {
		switch (e.head) {
			case 'variable':
				return token(this.name(e.index, names));
			case 'quantify': {
				const word = richExprToNameHint(e);
				const newNames = addNames(e.param.scope as ExprType[], names, word);
				if (
					e.body.head === 'infix' &&
					((e.q === 'every' && e.body.op === 'implies') ||
						(e.q === 'some' && e.body.op === 'and')) &&
					!(e.body.left.head === 'infix' && e.body.left.op === 'subinterval')
				) {
					const infix = infixes[e.body.op];
					return wrap(
						null,
						inner => (
							<mtable className="kuna-do kuna-do-quantify">{inner}</mtable>
						),
						join(Precedence.Do, 'any', [
							this.doRow(
								join(Precedence.Quantify, 'any', [
									token(
										<mo lspace="0" rspace="0">
											{quantifiers[e.q]}
										</mo>,
									),
									this.go(e.param, newNames),
									token(
										<mo lspace="0" rspace="0">
											&nbsp;
										</mo>,
									),
									join(infix.precedence, infix.associativity, [
										this.go(e.body.left, newNames),
										token(<mo>{infix.symbol}</mo>),
									]),
								]),
							),
							this.doRow(this.go(e.body.right, newNames)),
						]),
					);
				}
				return join(Precedence.Quantify, 'any', [
					token(
						<mo lspace="0" rspace="0">
							{quantifiers[e.q]}
						</mo>,
					),
					this.go(e.param, newNames),
					token(
						<mo lspace="0" rspace="0">
							&nbsp;
						</mo>,
					),
					this.go(e.body, newNames),
				]);
			}
			case 'apply':
				return join(Precedence.Apply, 'left', [
					this.go(e.fn, names),
					token(
						<mo lspace="0" rspace="0">
							&nbsp;
						</mo>,
					),
					this.go(e.arg, names),
				]);
			case 'prefix': {
				const prefix = prefixes[e.op];
				return join(Precedence.Prefix, 'right', [
					token(<mo rspace="0">{prefix}</mo>),
					this.go(e.body, names),
				]);
			}
			case 'infix': {
				const infix = infixes[e.op];
				return join(infix.precedence, infix.associativity, [
					this.go(e.left, names),
					token(<mo>{infix.symbol}</mo>),
					this.go(e.right, names),
				]);
			}
			case 'subscript':
				return wrap(
					null,
					inner => <msub>{inner}</msub>,
					join(Precedence.Subscript, 'right', [
						wrap(null, inner => <mrow>{inner}</mrow>, this.go(e.base, names)),
						wrap(null, inner => <mrow>{inner}</mrow>, this.go(e.sub, names)),
					]),
				);
			case 'pair':
				return join(Precedence.Pair, 'any', [
					this.go(e.left, names),
					token(<mo lspace="0">,</mo>),
					this.go(e.right, names),
				]);
			// biome-ignore lint/suspicious/noFallthroughSwitchClause: false positive
			case 'do':
				switch (e.op.op) {
					case 'get': {
						const word =
							'scope' in e.op.right
								? richExprToNameHint(e.op.right)
								: bindingToString(e.op.right);
						const newNames = addNames(
							e.op.left.scope as ExprType[],
							names,
							word,
						);
						return this.do(
							e.pure,
							join(Precedence.Do, 'right', [
								this.doRow(
									join(Precedence.Assign, 'none', [
										this.go(e.op.left, newNames),
										token(<mo>⇐</mo>),
										'scope' in e.op.right
											? this.go(e.op.right, names)
											: token(
													<mi className="kuna-lexeme">
														{binding(e.op.right)}
													</mi>,
												),
									]),
								),
								this.doRow(this.go(e.result, newNames)),
							]),
						);
					}
					case 'set':
						return this.do(
							e.pure,
							join(Precedence.Do, 'right', [
								this.doRow(
									join(Precedence.Assign, 'none', [
										this.go(e.op.left, names),
										token(
											<>
												<mo>⇒</mo>
												<mi className="kuna-lexeme">{binding(e.op.right)}</mi>
											</>,
										),
									]),
								),
								this.doRow(this.go(e.result, names)),
							]),
						);
					case 'run':
						return this.do(
							e.pure,
							join(Precedence.Do, 'right', [
								this.doRow(this.go(e.op.right, names)),
								this.doRow(this.go(e.result, names)),
							]),
						);
				}
			case 'build': {
				let newNames = names;
				const predicates: Render<ReactNode>[] = [];
				for (const pred of e.predicates) {
					if ('head' in pred) {
						predicates.push(this.go(pred, newNames));
					} else {
						const prevNames = newNames;
						newNames = addNames(pred.left.scope as ExprType[], newNames);
						predicates.push(
							join(Precedence.Assign, 'none', [
								this.go(pred.left, newNames),
								token(<mo>⇐</mo>),
								'scope' in pred.right
									? this.go(pred.right, prevNames)
									: token(
											<mi className="kuna-lexeme">{binding(pred.right)}</mi>,
										),
							]),
						);
					}
				}
				return wrap(
					Precedence.Bracket,
					inner => (
						<mrow
							className={
								predicates.length > 0 ? 'kuna-big-brackets' : undefined
							}
						>
							{inner}
						</mrow>
					),
					join(Precedence.Bracket, 'none', [
						token(<mo>{'['}</mo>),
						this.go(e.body, newNames),
						...(predicates.length === 0
							? []
							: [
									token(<mo stretchy="true">{'|'}</mo>),
									this.do(
										false,
										join(
											Precedence.Do,
											'any',
											predicates.map(pred => this.doRow(pred)),
										),
									),
								]),
						token(<mo>{']'}</mo>),
					]),
				);
			}
			case 'lexeme':
				return token(<mi className="kuna-lexeme">{e.name}</mi>);
			case 'quote':
				return token(<mi className="kuna-quote">{e.text}</mi>);
			case 'constant':
				return token(
					<mi className="kuna-constant">{constants[e.name] ?? e.name}</mi>,
				);
		}
	}

	private go(e: RichExpr, names: Names): Render<ReactNode> {
		return {
			...this.go_(e, names),
			expr: e,
		};
	}

	protected sub(e: RichExpr): Render<ReactNode> {
		if (e.scope.length > 0) throw new Impossible('Not a closed expression');
		return this.go(e, noNames);
	}

	protected bracket(r: Render<ReactNode>): Render<ReactNode> {
		const big = precedence(r) === Precedence.Do;
		return {
			...wrap(
				Precedence.Bracket,
				inner => (
					<mrow className={big ? 'kuna-big-brackets' : undefined}>
						<mo>{'('}</mo>
						{inner}
						<mo>{')'}</mo>
					</mrow>
				),
				r,
			),
			expr: r.expr,
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
		return <ExprRender r={bracketed} tooltipMap={{}} />;
	}
}
