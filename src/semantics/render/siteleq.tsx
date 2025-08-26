import type { FC, ReactNode } from 'react';
import { bindingToString, type Binding, type ExprType } from '../types';

export type Siteleq =
	| { head: 'binding'; binding: Binding }
	| { head: 'atom'; value: 'e' | 'v' | 'i' | 't' | 's' }
	| { head: 'fn'; domain: Siteleq; range: Siteleq }
	| { head: 'tuple'; items: Siteleq[] }
	| {
			head: 'prefix';
			prefix: 'indef' | 'qn' | 'nf' | 'dx' | 'act';
			body: Siteleq | null;
	  }
	| { head: 'bracket'; inner: Siteleq }
	| { head: 'int'; inner: Siteleq | null }
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
		t.head === 'int' ||
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
		case 'indef':
		case 'qn':
		case 'nf':
		case 'dx':
		case 'act':
			return prefix(t.head, t.inner);
		case 'int':
			return { head: 'int', inner: typeToSiteleq(t.inner) };
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
		case 'indef':
			return '+';
		case 'qn':
			return '?';
		case 'nf':
			return 'Nf'; // TODO: Remove Nf?
		case 'dx':
			return '^';
		case 'act':
			return '!';
	}
}

export const SiteleqTypePart: FC<{ t: Siteleq | null }> = ({ t }) => {
	if (t === null) return null;
	switch (t.head) {
		case 'binding':
			return bindingToString(t.binding);
		case 'atom':
			switch (t.value) {
				case 'e':
					return 'o';
				case 'v':
					return 'v';
				case 'i':
					return 't';
				case 't':
					return '■';
				case 's':
					return 's';
				default:
					return t.value satisfies never;
			}
		case 'fn': {
			const spacer = makeSpacer();
			return (
				<>
					<SiteleqTypePart t={t.domain} />
					{spacer}›{spacer}
					<SiteleqTypePart t={t.range} />
				</>
			);
		}
		case 'tuple': {
			const spacer = makeSpacer();
			return t.items.flatMap((item, i) => [
				// biome-ignore lint/suspicious/noArrayIndexKey: Static tree
				<SiteleqTypePart key={i} t={item} />,
				...(i === t.items.length - 1 ? [] : [spacer]),
			]);
		}
		case 'prefix': {
			const spacer = makeSpacer();
			return (
				<>
					{prefixSymbol(t.prefix)}
					{spacer}
					<SiteleqTypePart t={t.body} />
				</>
			);
		}
		case 'bracket':
			return (
				<>
					(<SiteleqTypePart t={t.inner} />)
				</>
			);

		case 'int':
			return (
				<div className="inline-flex border-b mb-1 items-baseline">
					<SiteleqTypePart t={t.inner} />
				</div>
			);
		case 'cont':
			return (
				<div className="inline-flex border-t border-r border-l px-1 mx-1 my-0.5 items-baseline">
					<SiteleqTypePart t={t.inner} />
				</div>
			);
		case 'pl':
			return (
				<>
					[<SiteleqTypePart t={t.inner} />]
				</>
			);
	}
};

export const SiteleqType: FC<{ t: Siteleq | null }> = ({ t }) => {
	return (
		<div className="inline-flex items-baseline">
			<SiteleqTypePart t={t} />
		</div>
	);
};
