/**
 * Zips two arrays together, returning an array as long as the longest input.
 */
export function zip<A, B>(
	as: A[],
	bs: B[],
): ([A, B] | [A, B | undefined] | [A | undefined, B])[] {
	const result = new Array<[A, B] | [A, B | undefined] | [A | undefined, B]>(
		Math.max(as.length, bs.length),
	);
	for (let i = 0; i < result.length; i++) result[i] = [as[i], bs[i]];
	return result;
}

/**
 * Iterates over an array in reverse.
 */
export function* reverse<A>(as: A[]): Generator<A, void, unknown> {
	for (let i = as.length - 1; i >= 0; i--)
		if (as.hasOwnProperty(i)) yield as[i];
}

/**
 * Splits a string at the given separator, without counting any empty parts.
 */
export function splitNonEmpty(s: string, separator: string | RegExp): string[] {
	return s.split(separator).filter(part => part !== '');
}

/**
 * Finds the first item in a collection that satisfies the given predicate.
 */
export function find<A>(
	as: Iterable<A>,
	predicate: (a: A) => boolean,
): A | undefined {
	for (const a of as) if (predicate(a)) return a;
	return undefined;
}

/**
 * Determines whether some item in a collection satisfies the given predicate.
 */
export function some<A>(
	as: Iterable<A>,
	predicate: (a: A) => boolean,
): boolean {
	for (const a of as) if (predicate(a)) return true;
	return false;
}

/**
 * Pairs items in a collection with indices representing their order of
 * appearance.
 */
export function* enumerate<A>(
	as: Iterable<A>,
): Generator<[A, number], void, unknown> {
	let i = 0;
	for (const a of as) {
		yield [a, i];
		i++;
	}
}
