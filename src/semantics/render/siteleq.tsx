import type { FC, ReactNode } from 'react';
import { bindingToString, type Binding, type ExprType } from '../types';

export type Siteleq =
	| { head: 'binding'; binding: Binding }
	| { head: 'atom'; value: 'e' | 'v' | 'i' | 't' | 's' }
	| { head: 'fn'; domain: Siteleq; range: Siteleq }
	| { head: 'tuple'; items: Siteleq[] }
	| {
			head: 'prefix';
			prefix: 'int' | 'indef' | 'qn' | 'nf' | 'dx' | 'act';
			body: Siteleq | null;
	  }
	| { head: 'bracket'; inner: Siteleq }
	| { head: 'cont'; inner: Siteleq | null }
	| { head: 'pl'; inner: Siteleq };

function addItems(t: ExprType, items: Siteleq[]) {
	if (typeof t !== 'string') {
		if (t.head === 'pair') {
			addItems(t.inner, items);
			addItems(t.supplement, items);
			return;
		}
		if (t.head === 'bind') {
			items.push({ head: 'binding', binding: t.binding });
			addItems(t.inner, items);
			return;
		}
	}

	const item = maybeBracket(typeToSiteleq(t));
	if (item !== null) items.push(item);
}

function maybeBracket<T extends Siteleq | null>(t: T): Siteleq | T {
	return t === null ||
		t.head === 'atom' ||
		t.head === 'bracket' ||
		t.head === 'prefix' ||
		t.head === 'cont' ||
		t.head === 'pl'
		? t
		: { head: 'bracket', inner: t };
}

function prefix(
	prefix: (Siteleq & { head: 'prefix' })['prefix'],
	inner: ExprType,
): Siteleq {
	const body = maybeBracket(typeToSiteleq(inner));
	return {
		head: 'prefix',
		prefix,
		body,
	};
}

function fn(t: ExprType, params: Siteleq[]): Siteleq | null {
	if (typeof t !== 'string') {
		if (t.head === 'fn') {
			addItems(t.domain, params);
			return fn(t.range, params);
		}
		if (t.head === 'ref') {
			params.push({ head: 'binding', binding: t.binding });
			return fn(t.inner, params);
		}
	}
	const range = maybeBracket(typeToSiteleq(t));
	if (params.length === 0 || range === null) return range;
	const domain: Siteleq | Binding =
		params.length === 1
			? params[0]
			: maybeBracket({ head: 'tuple', items: params });
	return range === null || params.length === 0
		? range
		: { head: 'fn', domain, range };
}

export function typeToSiteleq(t: ExprType): Siteleq | null {
	if (typeof t === 'string')
		return t === '()' ? null : { head: 'atom', value: t };
	switch (t.head) {
		case 'fn':
		case 'ref':
			return fn(t, []);
		case 'int':
		case 'indef':
		case 'qn':
		case 'nf':
		case 'dx':
		case 'act':
			return prefix(t.head, t.inner);
		case 'cont':
			return { head: 'cont', inner: typeToSiteleq(t.inner) };
		case 'pl': {
			const inner = typeToSiteleq(t.inner);
			return inner === null ? null : { head: 'pl', inner };
		}
		case 'pair':
		case 'bind': {
			const items: Siteleq[] = [];
			addItems(t, items);
			return items.length === 0
				? null
				: items.length === 1
					? items[0]
					: { head: 'tuple', items };
		}
	}
}

function makeSpacer(): ReactNode {
	return <span style={{ whiteSpace: 'pre' }}> </span>;
}

function prefixSymbol(
	prefix: (Siteleq & { head: 'prefix' })['prefix'],
): string {
	switch (prefix) {
		case 'int':
			return '~';
		case 'indef':
			return '+';
		case 'qn':
			return '?';
		case 'nf':
			return 'Nf'; // TODO: Remove Nf?
		case 'dx':
			return '☝\ufe0e';
		case 'act':
			return '!';
	}
}

export const SiteleqType: FC<{ t: Siteleq | null }> = ({ t }) => {
	if (t === null) return null;
	switch (t.head) {
		case 'binding':
			return bindingToString(t.binding);
		case 'atom':
			switch (t.value) {
				case 'e':
					return '○';
				case 'v':
					return '✲';
				case 'i':
					return '◷';
				case 't':
					return '◐';
				case 's':
					return 's';
				default:
					return t.value satisfies never;
			}
		case 'fn': {
			const spacer = makeSpacer();
			return (
				<>
					<SiteleqType t={t.domain} />
					{spacer}›{spacer}
					<SiteleqType t={t.range} />
				</>
			);
		}
		case 'tuple': {
			const spacer = makeSpacer();
			return t.items.flatMap((item, i) => [
				// biome-ignore lint/suspicious/noArrayIndexKey: Static tree
				<SiteleqType key={i} t={item} />,
				...(i === t.items.length - 1 ? [] : [spacer]),
			]);
		}
		case 'prefix': {
			const spacer = makeSpacer();
			return (
				<>
					{prefixSymbol(t.prefix)}
					{spacer}
					<SiteleqType t={t.body} />
				</>
			);
		}
		case 'bracket':
			return (
				<>
					(<SiteleqType t={t.inner} />)
				</>
			);
		case 'cont':
			return (
				<div
					style={{
						display: 'inline-block',
						paddingBlock: 2,
						paddingInline: 5,
						marginInline: 2,
						border: '1px solid',
						borderRadius: 4,
					}}
				>
					<SiteleqType t={t.inner} />
				</div>
			);
		case 'pl':
			return (
				<>
					[<SiteleqType t={t.inner} />]
				</>
			);
	}
};
