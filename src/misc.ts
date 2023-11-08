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

export function* reverse<A>(as: A[]): Generator<A, void, unknown> {
	for (let i = as.length - 1; i >= 0; i--) yield as[i];
}
