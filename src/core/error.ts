/**
 * Thrown when the input is detected to be ungrammatical during the fix or
 * denote step.
 */
export class Ungrammatical extends Error {
	constructor(message?: string) {
		super(message);
		this.name = 'Ungrammatical';
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/**
 * Thrown when Kuna doesn't know what a word means, and can't continue denoting
 * the sentence.
 */
export class Unrecognized extends Error {
	constructor(message?: string) {
		super(message);
		this.name = 'Unrecognized';
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/**
 * Thrown in code paths that aren't expected to be reached by any input sentence
 * (so if this gets thrown, there's a bug in Kuna).
 */
export class Impossible extends Error {
	constructor(message?: string) {
		super(message);
		this.name = 'Impossible';
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/**
 * Thrown in code paths that aren't handled yet.
 */
export class Unimplemented extends Error {
	constructor(message?: string) {
		super(message);
		this.name = 'Unimplemented';
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
