import { type FC, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type Binding, type ExprType, bindingToString } from '../types';

enum Precedence {
	Prefix = 0,
	Fn = 1,
	Suffix = 2,
	Pair = 3,
	Bracket = 4,
	Atom = 5,
}

export type Siteleq = { precedence: Precedence } & (
	| { head: 'atom'; value: 'e' | 'v' | 'i' | 't' | 's' }
	| { head: 'fn'; domain: Siteleq; range: Siteleq }
	| { head: 'ref'; binding: Binding; body: Siteleq }
	| { head: 'bind'; binding: Binding; body: Siteleq | null }
	| { head: 'pair'; left: Siteleq; right: Siteleq }
	| { head: 'prefix'; prefix: 'indef' | 'dx'; body: Siteleq | null }
	| { head: 'suffix'; suffix: 'qn' | 'act'; body: Siteleq | null }
	| { head: 'bracket'; inner: Siteleq }
	| { head: 'int'; inner: Siteleq }
	| { head: 'cont'; inner: Siteleq | null }
	| { head: 'pl'; inner: Siteleq }
);

function maybeBracket<T extends Siteleq | null>(
	t: T,
	precedence: Precedence,
): Siteleq | T {
	return t === null ||
		t.precedence >= precedence ||
		('body' in t && t.body === null)
		? t
		: { head: 'bracket', inner: t, precedence: Precedence.Bracket };
}

function prefix(
	prefix: (Siteleq & { head: 'prefix' })['prefix'],
	inner: ExprType,
): Siteleq {
	const body = maybeBracket(typeToSiteleq(inner), Precedence.Prefix);
	return {
		head: 'prefix',
		prefix,
		body,
		precedence: Precedence.Prefix,
	};
}

function suffix(
	suffix: (Siteleq & { head: 'suffix' })['suffix'],
	inner: ExprType,
): Siteleq {
	const body = maybeBracket(typeToSiteleq(inner), Precedence.Suffix);
	return {
		head: 'suffix',
		suffix,
		body,
		precedence: Precedence.Suffix,
	};
}

function typeToSiteleq(t: ExprType): Siteleq | null {
	if (typeof t === 'string')
		return t === '()'
			? null
			: { head: 'atom', value: t, precedence: Precedence.Atom };
	switch (t.head) {
		case 'fn': {
			const domain = maybeBracket(typeToSiteleq(t.domain), Precedence.Fn + 1);
			const range = maybeBracket(typeToSiteleq(t.range), Precedence.Fn);
			return domain === null || range === null
				? range
				: { head: 'fn', domain, range, precedence: Precedence.Fn };
		}
		case 'ref': {
			const body = maybeBracket(typeToSiteleq(t.inner), Precedence.Prefix);
			return (
				body && {
					head: 'ref',
					binding: t.binding,
					body,
					precedence: Precedence.Prefix,
				}
			);
		}
		case 'indef':
		case 'dx':
			return prefix(t.head, t.inner);
		case 'qn':
		case 'act':
			return suffix(t.head, t.inner);
		case 'int': {
			const inner = typeToSiteleq(t.inner);
			return inner && { head: 'int', inner, precedence: Precedence.Bracket };
		}
		case 'cont':
			return {
				head: 'cont',
				inner: typeToSiteleq(t.inner),
				precedence: Precedence.Bracket,
			};
		case 'pl': {
			const inner = typeToSiteleq(t.inner);
			return inner === null
				? null
				: { head: 'pl', inner, precedence: Precedence.Bracket };
		}
		case 'pair': {
			const left = maybeBracket(typeToSiteleq(t.inner), Precedence.Pair);
			const right = maybeBracket(typeToSiteleq(t.supplement), Precedence.Pair);
			return left === null
				? right
				: right === null
					? left
					: { head: 'pair', left, right, precedence: Precedence.Pair };
		}
		case 'bind':
			return {
				head: 'bind',
				binding: t.binding,
				body: maybeBracket(typeToSiteleq(t.inner), Precedence.Prefix),
				precedence: Precedence.Prefix,
			};
	}
}

const Intension: FC<{ inner: Siteleq; container: HTMLElement }> = ({
	inner,
	container,
}) => {
	const mrowRef = useRef<MathMLElement | null>(null);
	const moRef = useRef<MathMLElement | null>(null);
	const divRef = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		const innerBounds = mrowRef.current!.getBoundingClientRect();
		const bounds = moRef.current!.getBoundingClientRect();
		const containerBounds = container.getBoundingClientRect();
		// Pad out the smallest of squiggles
		const padding = Math.max(0, 10 - innerBounds.width);
		divRef.current!.style.setProperty(
			'top',
			`${bounds.top - containerBounds.top}px`,
		);
		divRef.current!.style.setProperty(
			'left',
			`${innerBounds.left - containerBounds.left - padding / 2}px`,
		);
		divRef.current!.style.setProperty(
			'width',
			`${innerBounds.width + padding}px`,
		);
		divRef.current!.style.setProperty('height', '3px');
	});

	return (
		<munderover accent accentunder>
			<mrow ref={mrowRef}>
				<SiteleqTypePart t={inner} container={container} />
			</mrow>
			<mo className="kuna-squiggle" ref={moRef}>
				⎵
			</mo>
			<mo className="kuna-squiggle">⎴</mo>
			{createPortal(
				<div
					className="kuna-squiggle bg-neutral-900 dark:bg-slate-200"
					ref={divRef}
				/>,
				container,
			)}
		</munderover>
	);
};

const SiteleqTypePart: FC<{ t: Siteleq; container: HTMLElement }> = ({
	t,
	container,
}) => {
	switch (t.head) {
		case 'atom':
			switch (t.value) {
				case 'e':
					return <mi>○</mi>;
				case 'v':
					return <mi>✲</mi>;
				case 'i':
					return <mi>🕔</mi>;
				case 't':
					return <mi>◐</mi>;
				case 's':
					return <mi>~</mi>;
				default:
					return t.value satisfies never;
			}
		case 'fn':
			return (
				<>
					<SiteleqTypePart t={t.domain} container={container} />
					<mo>›</mo>
					<SiteleqTypePart t={t.range} container={container} />
				</>
			);
		case 'ref':
			return (
				<>
					<mi className="kuna-lexeme">{bindingToString(t.binding)}</mi>
					<mo lspace="0" rspace="0.4em">
						:
					</mo>
					<SiteleqTypePart t={t.body} container={container} />
				</>
			);
		case 'bind':
			return (
				<>
					<mi className="kuna-lexeme">{bindingToString(t.binding)}</mi>
					<mspace width={t.body === null ? undefined : '0.4em'} />
					{t.body && <SiteleqTypePart t={t.body} container={container} />}
				</>
			);
		case 'pair':
			return (
				<>
					<SiteleqTypePart t={t.left} container={container} />
					<mspace width="0.4em" />
					<SiteleqTypePart t={t.right} container={container} />
				</>
			);
		case 'prefix':
			return (
				<>
					<mo lspace="0" rspace="0.4em">
						{t.prefix === 'indef' ? '•' : '↪'}
					</mo>
					{t.body && <SiteleqTypePart t={t.body} container={container} />}
				</>
			);
		case 'suffix':
			return (
				<>
					{t.body && <SiteleqTypePart t={t.body} container={container} />}
					<mo lspace={t.body === null ? undefined : '0.2em'} rspace="0">
						{t.suffix === 'qn' ? '?' : '!'}
					</mo>
				</>
			);
		case 'bracket':
			return (
				<>
					<mo>(</mo>
					<SiteleqTypePart t={t.inner} container={container} />
					<mo>)</mo>
				</>
			);
		case 'int':
			return <Intension inner={t.inner} container={container} />;
		case 'cont':
			return (
				<>
					<mpadded className="kuna-cont">
						{t.inner && <SiteleqTypePart t={t.inner} container={container} />}
					</mpadded>
				</>
			);
		case 'pl':
			return (
				<>
					<mo>[</mo>
					<SiteleqTypePart t={t.inner} container={container} />
					<mo>]</mo>
				</>
			);
		default:
			t satisfies never;
	}
};

export const SiteleqType: FC<{
	t: ExprType;
}> = ({ t }) => {
	const siteleq = typeToSiteleq(t);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	return (
		siteleq && (
			<div ref={setContainer} className="kuna-math-container">
				<math>
					{container && (
						<mrow>
							<SiteleqTypePart t={siteleq} container={container} />
						</mrow>
					)}
				</math>
			</div>
		)
	);
};
