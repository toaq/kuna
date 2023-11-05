import { Impossible, Ungrammatical, Unimplemented } from './error';
import { Branch, Label, Tree, makeNull } from './tree';

/**
 * Toaq serials are too complicated to parse directly in the context-free
 * grammar, so we parse something called a *𝘷P and fix that up in this file.
 *
 * A *𝘷P consists of a "verbal complex", internally called a *Serial, followed
 * by "terms" (adjuncts or arguments). This is a "PEG parser style" view of the
 * verbal complex and the post-field.
 *
 * A *Serial consists of a serial verb, followed by 0 or more serial adjectives.
 * For example, the refgram gives the example
 *
 *     du rua jaq de
 *     "very beautiful thing which seems to be a flower"
 *
 * which is the serial verb "du rua" followed by a serial adjective "jaq de".
 *
 * We call "du rua" and "jaq de" the "segments" of this *Serial.
 *
 * We know (c)-frame words like rua mark the end of segments, and kı- marks the
 * beginning of a segment. We use these rules to split the *Serial and interpret
 * each sub-serial.
 */

const arityPreservingVerbPrefixes: Label[] = ['buP', 'muP', 'buqP', 'geP'];

export const pro: Tree = { label: 'DP', word: { covert: true, value: 'PRO' } };

/**
 * Get a frame string like "c" or "c c 1j" for this verbal subtree.
 */
export function getFrame(verb: Tree): string {
	if ('word' in verb) {
		if (verb.word.covert) throw new Impossible('covert verb in a serial?');
		if (verb.word.entry?.type === 'predicate') {
			return verb.word.entry.frame;
		} else if (verb.word.entry?.type === 'adjective marker') {
			return 'kı';
		} else {
			throw new Impossible('weird verb');
		}
	} else if (verb.label === '&P' && 'left' in verb) {
		return getFrame(verb.left);
	} else if (verb.label === 'shuP' || verb.label === 'mıP') {
		return 'c';
	} else if (verb.label === 'VP') {
		// object incorporation... check that the verb is transitive?
		return 'c';
	} else if (verb.label === 'EvAP') {
		return 'c';
	} else if (verb.label === 'beP') {
		return 'c';
	} else if (arityPreservingVerbPrefixes.includes(verb.label)) {
		return getFrame((verb as Branch<Tree>).right);
	} else {
		throw new Unimplemented("Can't get frame of " + verb.label);
	}
}

/**
 * Given a *Serial and the arguments from a *𝘷P, make a proper 𝘷P. If there
 * aren't enough arguments this will pad with PRO.
 */
function serialTovP(verbs: Tree[], args: Tree[]): Tree {
	const firstFrame = getFrame(verbs[0]);
	if (verbs.length === 1) {
		const arity = firstFrame.split(' ').length;
		while (args.length < arity) {
			args.push(makeNull('DP'));
		}

		if (
			arity === 1 &&
			'word' in verbs[0] &&
			!verbs[0].word.covert &&
			verbs[0].word.entry?.type === 'predicate' &&
			verbs[0].word.entry.subject === 'agent'
		) {
			return {
				label: '𝘷P',
				left: args[0],
				right: {
					label: "𝘷'",
					left: { label: '𝘷', word: { covert: true, value: 'CAUSE' } },
					right: { label: 'VP', word: verbs[0].word },
				},
			};
		} else if (arity === 1) {
			return {
				label: '𝘷P',
				left: { label: '𝘷', word: { covert: true, value: 'BE' } },
				right: { label: 'VP', left: verbs[0], right: args[0] },
			};
		} else if (arity === 2) {
			return {
				label: '𝘷P',
				left: args[0],
				right: {
					label: "𝘷'",
					left: { label: '𝘷', word: { covert: true, value: 'CAUSE' } },
					right: { label: 'VP', left: verbs[0], right: args[1] },
				},
			};
		} else if (arity === 3) {
			return {
				label: '𝘷P',
				left: args[0],
				right: {
					label: "𝘷'",
					left: { label: '𝘷', word: { covert: true, value: 'CAUSE' } },
					right: {
						label: 'VP',
						left: args[1],
						right: { label: "V'", left: verbs[0], right: args[2] },
					},
				},
			};
		} else {
			throw new Impossible('bad arity');
		}
	} else {
		const frame = firstFrame.replace(/a/g, 'c').split(' ');
		for (let i = 0; i < frame.length - 1; i++) {
			if (frame[i] !== 'c') {
				throw new Ungrammatical("frame can't serialize: " + firstFrame);
			}
		}
		if (frame[frame.length - 1] === 'c') {
			throw new Ungrammatical("frame can't serialize: " + firstFrame);
		}
		const cCount = frame.length - 1;
		const jaCount = Number(frame[frame.length - 1][0]);
		// TODO pro coindexation
		const pros: Tree[] = new Array(jaCount).fill(pro);
		// if (args.length < cCount) {
		// 	throw new Ungrammatical('not enough arguments');
		// }
		while (args.length < cCount) {
			args.push(makeNull('DP'));
		}
		const innerArgs: Tree[] = [...pros, ...args.slice(cCount)];
		const inner = serialTovP(verbs.slice(1), innerArgs);
		const arity = frame.length;
		if (
			arity === 1 &&
			'word' in verbs[0] &&
			!verbs[0].word.covert &&
			verbs[0].word.entry?.type === 'predicate' &&
			verbs[0].word.entry.subject === 'agent'
		) {
			return {
				label: '𝘷P',
				left: args[0],
				right: {
					label: "𝘷'",
					left: { label: '𝘷', word: { covert: true, value: 'CAUSE' } },
					right: inner,
				},
			};
		} else if (arity === 1) {
			return {
				label: '𝘷P',
				left: { label: '𝘷', word: { covert: true, value: 'BE' } },
				right: { label: 'VP', left: verbs[0], right: inner },
			};
		} else if (arity === 2) {
			return {
				label: '𝘷P',
				left: args[0],
				right: {
					label: "𝘷'",
					left: { label: '𝘷', word: { covert: true, value: 'CAUSE' } },
					right: { label: 'VP', left: verbs[0], right: inner },
				},
			};
		} else if (arity === 3) {
			return {
				label: '𝘷P',
				left: args[0],
				right: {
					label: "𝘷'",
					left: { label: '𝘷', word: { covert: true, value: 'CAUSE' } },
					right: {
						label: 'VP',
						left: args[1],
						right: { label: "V'", left: verbs[0], right: inner },
					},
				},
			};
		} else {
			throw new Impossible('bad arity ' + arity);
		}
	}
}

/**
 * This is a "proper" 𝘷P, with an optional kı node to fill the 𝘢 in an 𝘢P.
 */
interface KivP {
	ki?: Tree;
	vP: Tree;
}

/**
 * Given a *Serial with possible kı-, and the arguments from a *𝘷P, make a
 * proper 𝘷P tagged with possible kı-.
 */
function segmentToKivP(segment: Tree[], args: Tree[]): KivP {
	if (segment[0].label === '𝘢') {
		return { ki: segment[0], vP: serialTovP(segment.slice(1), args) };
	} else {
		return { vP: serialTovP(segment, args) };
	}
}

/**
 * Attach `kivP`, as an 𝘢P (created by pulling out the kı to make 𝘢), to `VP`.
 */
function attachAdjective(VP: Tree, kivP: KivP): Tree {
	const { ki, vP } = kivP;
	return {
		label: 'VP',
		left: VP,
		right: {
			label: '𝘢P',
			left: ki ?? makeNull('𝘢'),
			right: {
				// TODO: oh god, adjectives can have T and Asp?
				// needs rework in nearley grammar
				label: 'CPrel',
				left: makeNull('C'),
				right: {
					label: 'TP',
					left: makeNull('T'),
					right: {
						label: 'AspP',
						left: makeNull('Asp'),
						right: vP,
					},
				},
			},
		},
	};
}

/**
 * Turn the given *Serial and terms into a proper 𝘷P, by:
 *
 * - splitting the *Serial into segments,
 * - separating adjuncts from arguments,
 * - expanding the serial verb using the arguments,
 * - expanding the serial adjectives with a PRO argument,
 * - attaching all the adjectives, and
 * - attaching the adjuncts.
 */
export function fixSerial(tree: Tree, terms: Tree[]): Tree {
	if (tree.label !== '*Serial') {
		throw new Impossible('not a serial');
	}
	if (!('children' in tree)) {
		throw new Impossible('no children');
	}
	const children = tree.children;
	if (children.length === 0) {
		throw new Impossible('zero children');
	}

	const frames = children.map(getFrame);

	let segments = [];
	let end = children.length;
	for (let i = children.length - 2; i >= 0; i--) {
		if (frames[i] === 'kı') {
			segments.unshift(children.slice(i, end));
			end = i;
			continue;
		}
		const frame = frames[i].split(' ');
		const last = frame.at(-1)!;
		if (last === 'c' && i + 1 !== end) {
			// So everything to the right is an adjective.
			segments.unshift(children.slice(i + 1, end));
			end = i + 1;
		}
	}
	if (0 !== end) segments.unshift(children.slice(0, end));

	let earlyAdjuncts = [];
	let args = [];
	let lateAdjuncts = [];
	for (const term of terms) {
		if (term.label === 'DP' || term.label === 'CP') {
			args.push(term);
		} else if (args.length) {
			lateAdjuncts.push(term);
		} else {
			earlyAdjuncts.push(term);
		}
	}

	// Now the first segment is the serial verb and everything after it is serial adjectives.
	let { ki, vP } = segmentToKivP(segments[0], args);
	if (ki) {
		throw new Ungrammatical("Serial can't start with kı-");
	}

	// Attach adjectives to VP
	let ptr = vP as Branch<Tree>;
	while (ptr.right.label !== 'VP') {
		ptr = ptr.right as Branch<Tree>;
	}
	for (let i = 1; i < segments.length; i++) {
		ptr.right = attachAdjective(ptr.right, segmentToKivP(segments[i], [pro]));
	}

	// Attach AdjunctPs to 𝘷P
	for (const a of lateAdjuncts) {
		vP = { label: '𝘷P', left: vP, right: a };
	}
	for (const a of earlyAdjuncts.reverse()) {
		vP = { label: '𝘷P', left: a, right: vP };
	}

	return vP;
}
