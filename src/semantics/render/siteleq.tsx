import type { FC } from 'react';
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

const SiteleqTypePart: FC<{ t: Siteleq }> = ({ t }) => {
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
					<SiteleqTypePart t={t.domain} />
					<mo>›</mo>
					<SiteleqTypePart t={t.range} />
				</>
			);
		case 'ref':
			return (
				<>
					<mi className="kuna-lexeme">{bindingToString(t.binding)}</mi>
					<mo lspace="0" rspace="0.4em">
						:
					</mo>
					<SiteleqTypePart t={t.body} />
				</>
			);
		case 'bind':
			return (
				<>
					<mi className="kuna-lexeme">{bindingToString(t.binding)}</mi>
					<mspace width={t.body === null ? undefined : '0.4em'} />
					{t.body && <SiteleqTypePart t={t.body} />}
				</>
			);
		case 'pair':
			return (
				<>
					<SiteleqTypePart t={t.left} />
					<mspace width="0.4em" />
					<SiteleqTypePart t={t.right} />
				</>
			);
		case 'prefix':
			return (
				<>
					<mo lspace="0" rspace="0.4em">
						{t.prefix === 'indef' ? '•' : '↪'}
					</mo>
					{t.body && <SiteleqTypePart t={t.body} />}
				</>
			);
		case 'suffix':
			return (
				<>
					{t.body && <SiteleqTypePart t={t.body} />}
					<mo lspace={t.body === null ? undefined : '0.2em'} rspace="0">
						{t.suffix === 'qn' ? '?' : '!'}
					</mo>
				</>
			);
		case 'bracket':
			return (
				<>
					<mo>(</mo>
					<SiteleqTypePart t={t.inner} />
					<mo>)</mo>
				</>
			);
		case 'int':
			return (
				<munderover accent accentunder>
					<mrow>
						<SiteleqTypePart t={t.inner} />
					</mrow>
					<mo className="kuna-squiggle bg-neutral-900 dark:bg-gray-200">⎵</mo>
					<mo className="kuna-squiggle">⎴</mo>
				</munderover>
			);
		case 'cont':
			return (
				<>
					<mpadded className="kuna-cont">
						{t.inner && <SiteleqTypePart t={t.inner} />}
					</mpadded>
				</>
			);
		case 'pl':
			return (
				<>
					<mo>[</mo>
					<SiteleqTypePart t={t.inner} />
					<mo>]</mo>
				</>
			);
		default:
			t satisfies never;
	}
};

export const SiteleqType: FC<{ t: ExprType }> = ({ t }) => {
	const siteleq = typeToSiteleq(t);
	return (
		siteleq && (
			<math>
				<mrow>
					<SiteleqTypePart t={siteleq} />
				</mrow>
			</math>
		)
	);
};
