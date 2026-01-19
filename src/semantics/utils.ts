import { Impossible, Ungrammatical } from '../core/error';
import { typeToPlainText, typesToPlainText } from './render';
import type { Binding, DETree, ETree, ExprType } from './types';

/**
 * Determines whether two bindings are equal.
 */
export function bindingsEqual(b1: Binding, b2: Binding): boolean {
	switch (b1.type) {
		case 'resumptive':
			return b2.type === 'resumptive';
		case 'covert resumptive':
			return b2.type === 'covert resumptive';
		case 'gap':
			return b2.type === 'gap';
		case 'subject':
			return b2.type === 'subject';
		case 'reflexive':
			return b2.type === 'reflexive';
		case 'name':
			return b2.type === 'name' && b1.verb === b2.verb;
		case 'animacy':
			return b2.type === 'animacy' && b1.class === b2.class;
		case 'head':
			return b2.type === 'head' && b1.head === b2.head;
	}
}

/**
 * Determines whether the outermost effects in two types are equal.
 */
export function effectsEqual(left: ExprType, right: ExprType): boolean {
	return (
		typeof left !== 'string' &&
		typeof right !== 'string' &&
		left.head === right.head &&
		(left.head === 'int' ||
			left.head === 'cont' ||
			left.head === 'pl' ||
			left.head === 'indef' ||
			left.head === 'qn' ||
			(left.head === 'pair' &&
				typesEqual(
					left.supplement,
					(right as ExprType & object & { head: 'pair' }).supplement,
				)) ||
			(left.head === 'bind' &&
				bindingsEqual(
					left.binding,
					(right as ExprType & object & { head: 'bind' }).binding,
				)) ||
			(left.head === 'ref' &&
				bindingsEqual(
					left.binding,
					(right as ExprType & object & { head: 'ref' }).binding,
				)) ||
			left.head === 'dx' ||
			left.head === 'act')
	);
}

/**
 * Determines whether the first type is a subtype of the second.
 */
export function subtype(t1: ExprType, t2: ExprType): boolean {
	if (typeof t1 === 'string' || typeof t2 === 'string') {
		return t1 === t2 || (t1 === 'v' && t2 === 'e');
	}
	if (t1 === t2) return true;
	switch (t1.head) {
		case 'fn':
			return (
				t2.head === 'fn' &&
				subtype(t2.domain, t1.domain) &&
				subtype(t1.range, t2.range)
			);
		case 'int':
			return t2.head === 'int' && subtype(t1.inner, t2.inner);
		case 'cont':
			return t2.head === 'cont' && subtype(t1.inner, t2.inner);
		case 'pl':
			return t2.head === 'pl' && subtype(t1.inner, t2.inner);
		case 'indef':
			return (
				t2.head === 'indef' &&
				subtype(t2.domain, t1.domain) &&
				subtype(t1.inner, t2.inner)
			);
		case 'qn':
			return (
				t2.head === 'qn' &&
				subtype(t2.domain, t1.domain) &&
				subtype(t1.inner, t2.inner)
			);
		case 'pair':
			return (
				t2.head === 'pair' &&
				subtype(t1.inner, t2.inner) &&
				subtype(t1.supplement, t2.supplement)
			);
		case 'bind':
			return (
				t2.head === 'bind' &&
				bindingsEqual(t1.binding, t2.binding) &&
				subtype(t1.inner, t2.inner)
			);
		case 'ref':
			return (
				t2.head === 'ref' &&
				bindingsEqual(t1.binding, t2.binding) &&
				subtype(t1.inner, t2.inner)
			);
		case 'dx':
			return t2.head === 'dx' && subtype(t1.inner, t2.inner);
		case 'act':
			return t2.head === 'act' && subtype(t1.inner, t2.inner);
	}
}

export function assertSubtype(t1: ExprType, t2: ExprType): void {
	if (!subtype(t1, t2))
		throw new Impossible(
			`Type ${typeToPlainText(t1)} is not assignable to type ${typeToPlainText(
				t2,
			)}`,
		);
}

/**
 * Determines whether two types are equal.
 */
export function typesEqual(t1: ExprType, t2: ExprType): boolean {
	if (typeof t1 === 'string' || typeof t2 === 'string') return t1 === t2;
	if (t1 === t2) return true;
	switch (t1.head) {
		case 'fn':
			return (
				t2.head === 'fn' &&
				typesEqual(t2.domain, t1.domain) &&
				typesEqual(t1.range, t2.range)
			);
		case 'int':
			return t2.head === 'int' && typesEqual(t1.inner, t2.inner);
		case 'cont':
			return t2.head === 'cont' && typesEqual(t1.inner, t2.inner);
		case 'pl':
			return t2.head === 'pl' && typesEqual(t1.inner, t2.inner);
		case 'indef':
			return t2.head === 'indef' && typesEqual(t1.inner, t2.inner);
		case 'qn':
			return t2.head === 'qn' && typesEqual(t1.inner, t2.inner);
		case 'pair':
			return (
				t2.head === 'pair' &&
				typesEqual(t1.inner, t2.inner) &&
				typesEqual(t1.supplement, t2.supplement)
			);
		case 'bind':
			return (
				t2.head === 'bind' &&
				bindingsEqual(t1.binding, t2.binding) &&
				typesEqual(t1.inner, t2.inner)
			);
		case 'ref':
			return (
				t2.head === 'ref' &&
				bindingsEqual(t1.binding, t2.binding) &&
				typesEqual(t1.inner, t2.inner)
			);
		case 'dx':
			return t2.head === 'dx' && typesEqual(t1.inner, t2.inner);
		case 'act':
			return t2.head === 'act' && typesEqual(t1.inner, t2.inner);
	}
}

/**
 * Determines whether two types are compatible (one is assignable to the other).
 */
export function typesCompatible(t1: ExprType, t2: ExprType): boolean {
	return subtype(t1, t2) || subtype(t2, t1);
}

export function assertTypesCompatible(t1: ExprType, t2: ExprType): void {
	if (!typesCompatible(t1, t2))
		throw new Impossible(
			`Types ${typeToPlainText(t1)} and ${typeToPlainText(
				t2,
			)} are not compatible`,
		);
}

export function scopesEqual(s1: ExprType[], s2: ExprType[]): boolean {
	return (
		s1 === s2 ||
		(s1.length === s2.length && s1.every((t, i) => subtype(t, s2[i])))
	);
}

export function assertScopesEqual(s1: ExprType[], s2: ExprType[]): void {
	if (!scopesEqual(s1, s2))
		throw new Impossible(
			`Scopes ${typesToPlainText(s1)} and ${typesToPlainText(
				s2,
			)} are not equal`,
		);
}

export function unifyScopes(
	s1: (ExprType | undefined)[],
	s2: (ExprType | undefined)[],
): (ExprType | undefined)[] {
	if (s1.length === 0) return s2;
	if (s2.length === 0) return s1;

	const length = Math.max(s1.length, s2.length);
	const result = new Array<ExprType | undefined>(length);

	for (let i = 0; i < length; i++) {
		const t1 = s1[i];
		const t2 = s2[i];
		if (t1 === undefined) {
			if (t2 !== undefined) result[i] = t2;
		} else if (t2 === undefined) result[i] = t1;
		else if (subtype(t1, t2)) result[i] = t2;
		else if (subtype(t2, t1)) result[i] = t1;
		else
			throw new Impossible(
				`Scopes ${typesToPlainText(s1)} and ${typesToPlainText(s2)} are not compatible`,
			);
	}

	return result;
}

/**
 * Given a type and a type constructor to search for, find the type given by
 * unwrapping every effect above the matching type constructor.
 */
export function findEffect(
	inType: ExprType,
	like: ExprType,
): (ExprType & object) | null {
	if (typeof inType === 'string' || typeof like === 'string') return null;
	if (effectsEqual(inType, like)) return inType;
	return 'inner' in inType ? findEffect(inType.inner, like) : null;
}

export function unwrapEffects(type: ExprType): ExprType {
	return typeof type === 'object' && 'inner' in type
		? unwrapEffects(type.inner)
		: type;
}

export function getErrors(tree: DETree): ETree[] {
	if ('error' in tree) return [tree];
	if ('errors' in tree) return tree.errors;
	return [];
}

export function isUngrammatical(tree: DETree): boolean {
	return getErrors(tree).some(e => e instanceof Ungrammatical);
}
