import { Impossible, Ungrammatical, Unimplemented } from '../core/error';
import { splitNonEmpty } from '../core/misc';
import { Tone } from '../morphology/tone';
import {
	type Branch,
	type Label,
	type Leaf,
	type Tree,
	assertBranch,
	assertLeaf,
	catSource,
	effectiveLabel,
	makeNull,
} from '../tree';
import { moveUp } from '../tree/movement';

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

const intransitiveVerbPrefixes: Label[] = ['beP', 'suP', 'teP', 'nhaP', 'haoP'];
const arityPreservingVerbPrefixes: Label[] = [
	'buP',
	'FocusP',
	'muP',
	'buqP',
	'geP',
	'TelicityP',
];

export function pro(): Leaf {
	return { label: 'DP', word: { covert: true, value: 'PRO' }, source: '' };
}

/**
 * Get a frame string like "c" or "c c 1j" for this verbal subtree.
 *
 * Returns "kı" when passed kı- (this helps split serials).
 */
export function getFrame(verb: Tree): string {
	if ('word' in verb) {
		if (verb.word.covert) {
			// Must be the covert "raı" after a "sá".
			return 'c';
		}
		if (verb.word.entry?.type === 'predicate') {
			return verb.word.entry.frame;
		} else if (verb.word.entry?.type === 'predicatizer') {
			return `${verb.word.entry.frame} c`;
		} else if (verb.word.entry?.type === 'adjective marker') {
			return 'kı';
		} else {
			throw new Impossible('weird verb');
		}
	} else if (verb.label === '&P' && 'left' in verb) {
		return getFrame(verb.left);
	} else if (
		verb.label === 'shuP' ||
		verb.label === 'mıP' ||
		verb.label === 'teoP'
	) {
		return 'c';
	} else if (verb.label === 'VP') {
		// object incorporation... check that the verb is transitive?
		return 'c';
	} else if (verb.label === 'EvAP') {
		return 'c';
	} else if (verb.label === 'haP') {
		return 'c c';
	} else if (verb.label === 'boP') {
		return 'c c';
	} else if (intransitiveVerbPrefixes.includes(verb.label)) {
		return 'c';
	} else if (arityPreservingVerbPrefixes.includes(verb.label)) {
		return getFrame((verb as Branch<Tree>).right);
	} else {
		throw new Unimplemented("Can't get frame of " + verb.label);
	}
}

function makevP(verb: Tree, args: Tree[]): Tree {
	const agent =
		'word' in verb &&
		!verb.word.covert &&
		verb.word.entry?.type === 'predicate' &&
		verb.word.entry.subject === 'agent';

	const v: Leaf = {
		label: '𝘷',
		word: { covert: true, value: agent ? 'CAUSE' : 'BE' },
		source: '',
	};

	if ('word' in verb) {
		moveUp(verb, v);
	} else {
		// TODO: non-leaf movement? (object incorporation)
	}

	switch (args.length) {
		case 0: {
			if (!('word' in verb)) throw new Impossible('Weird nullary verb');
			return {
				label: '𝘷P',
				left: v,
				right: { ...verb, label: 'VP' },
				source: verb.source,
			};
		}
		case 1: {
			const [subject] = args;
			if (agent) {
				if (!('word' in verb))
					throw new Impossible("Serial tails can't be agents");
				return {
					label: '𝘷P',
					left: subject,
					right: {
						label: "𝘷'",
						left: v,
						right: { ...verb, label: 'VP' },
						source: verb.source,
					},
					source: verb.source + ' ' + subject.source,
				};
			} else {
				const source = verb.source + ' ' + subject.source;
				return {
					label: '𝘷P',
					left: v,
					right: { label: 'VP', left: verb, right: subject, source },
					source,
				};
			}
		}
		case 2: {
			const [subject, directObject] = args;
			const voSource = verb.source + ' … ' + directObject.source;
			const vsoSource =
				verb.source + ' ' + subject.source + ' ' + directObject.source;

			return {
				label: '𝘷P',
				left: subject,
				right: {
					label: "𝘷'",
					left: v,
					right: {
						label: 'VP',
						left: verb,
						right: directObject,
						source: voSource,
					},
					source: voSource,
				},
				source: vsoSource,
			};
		}
		case 3: {
			const [subject, indirectObject, directObject] = args;
			const voSource = verb.source + ' … ' + directObject.source;
			const vooSource =
				verb.source + ' … ' + indirectObject.source + ' ' + directObject.source;
			const vsooSource =
				verb.source +
				' ' +
				subject.source +
				' ' +
				indirectObject.source +
				' ' +
				directObject.source;
			return {
				label: '𝘷P',
				left: subject,
				right: {
					label: "𝘷'",
					left: v,
					right: {
						label: 'VP',
						left: indirectObject,
						right: {
							label: "V'",
							left: verb,
							right: directObject,
							source: voSource,
						},
						source: vooSource,
					},
					source: vooSource,
				},
				source: vsooSource,
			};
		}
		default:
			throw new Impossible(`Bad arity ${args.length}`);
	}
}

/**
 * Given a *Serial and the arguments from a *𝘷P, make a proper 𝘷P. If there
 * aren't enough arguments this will pad with PRO.
 */
function serialTovP(
	verbs: Tree[],
	args: Tree[],
	newCoindex: () => string,
): Tree {
	const firstFrame = getFrame(verbs[0]);
	if (verbs.length === 1) {
		const arity = splitNonEmpty(firstFrame, ' ').length;
		while (args.length < arity) {
			args.push(makeNull('DP'));
		}

		return makevP(verbs[0], args);
	} else {
		const frame = splitNonEmpty(firstFrame.replace(/a/g, 'c'), ' ');
		for (let i = 0; i < frame.length - 1; i++) {
			if (frame[i] !== 'c') {
				throw new Ungrammatical("frame can't serialize: " + firstFrame);
			}
		}
		if (frame[frame.length - 1] === 'c') {
			throw new Ungrammatical("frame can't serialize: " + firstFrame);
		}
		const cCount = frame.length - 1;
		const lastSlot = frame[frame.length - 1];
		const jaCount = Number(lastSlot[0]);
		const pros: Leaf[] = new Array(jaCount).fill(undefined).map(pro);
		for (let i = 0; i < jaCount; i++) {
			switch (lastSlot[i + 1]) {
				case 'i':
					if (args.length > 0) {
						args[0].coindex ??= newCoindex();
						pros[i].coindex = args[0].coindex;
					}
					break;
				case 'j':
					if (args.length > 1) {
						args[1].coindex ??= newCoindex();
						pros[i].coindex = args[1].coindex;
					}
					break;
			}
		}
		// if (args.length < cCount) {
		// 	throw new Ungrammatical('not enough arguments');
		// }
		while (args.length < cCount) {
			args.push(makeNull('DP'));
		}
		const innerArgs: Tree[] = [...pros, ...args.slice(cCount)];
		const v0 = verbs[0];
		assertLeaf(v0);
		const vP = serialTovP(verbs.slice(1), innerArgs, newCoindex);
		assertBranch(vP);
		const v = vP.left.label === '𝘷' ? vP.left : (vP.right as Branch<Tree>).left;
		assertLeaf(v);
		moveUp(v, v0);
		const outerArgs: Tree[] = [...args.slice(0, cCount), vP];
		return makevP(v0, outerArgs);
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
function segmentToKivP(
	segment: Tree[],
	args: Tree[],
	newCoindex: () => string,
): KivP {
	if (segment[0].label === '𝘢') {
		return {
			ki: segment[0],
			vP: serialTovP(segment.slice(1), args, newCoindex),
		};
	} else {
		return { vP: serialTovP(segment, args, newCoindex) };
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
						source: vP.source,
					},
					source: vP.source,
				},
				source: vP.source,
			},
			source: catSource(ki, vP),
		},
		source: catSource(VP, ki, vP),
	};
}

/**
 * Determines whether an argument is an incorporated object.
 */
function isArgIncorp(dp: Tree): boolean {
	let head: Leaf;
	if ('word' in dp) {
		head = dp;
	} else {
		assertBranch(dp);
		assertLeaf(dp.left);
		if (dp.left.word.covert) {
			const cp = dp.right;
			assertBranch(cp);
			assertLeaf(cp.left);
			head = cp.left;
		} else {
			head = dp.left;
		}
	}

	return !head.word.covert && head.word.tone === Tone.T4;
}

/**
 * Determines whether a *Serial is a predicatizer.
 */
function isPredicatizer(serial: Tree[]): boolean {
	const last = serial[serial.length - 1];
	return (
		'word' in last &&
		'entry' in last.word &&
		last.word.entry?.type === 'predicatizer'
	);
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
export function fixSerial(
	tree: Tree,
	terms: Tree[],
	newCoindex: () => string,
): Tree {
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

	const segments = [];
	let end = children.length;
	for (let i = children.length - 2; i >= 0; i--) {
		if (frames[i] === 'kı') {
			segments.unshift(children.slice(i, end));
			end = i;
			continue;
		}
		const frame = splitNonEmpty(frames[i], ' ');
		const last = frame.at(-1)!;
		if (last === 'c' && i + 1 !== end) {
			// So everything to the right is an adjective.
			segments.unshift(children.slice(i + 1, end));
			end = i + 1;
		}
	}
	if (0 !== end) segments.unshift(children.slice(0, end));

	const earlyAdjuncts: Tree[] = [];
	const args: Tree[] = [];
	let argIncorp: Tree | null | undefined = undefined;
	const lateAdjuncts: Tree[] = [];
	for (const term of terms) {
		if (
			argIncorp === undefined &&
			term.label === 'DP' &&
			(isArgIncorp(term) || isPredicatizer(children))
		) {
			argIncorp = term;
		} else {
			argIncorp ??= null;
			const label = effectiveLabel(term);
			if (label === 'DP') args.push(term);
			else if (args.length) lateAdjuncts.push(term);
			else earlyAdjuncts.push(term);
		}
	}
	if (argIncorp != null) args.push(argIncorp);

	// Now the first segment is the serial verb and everything after it is serial adjectives.
	let { ki, vP } = segmentToKivP(segments[0], args, newCoindex);
	if (ki) {
		throw new Ungrammatical("Serial can't start with kı-");
	}

	// Attach adjectives to VP
	let ptr = vP as Branch<Tree>;
	while (ptr.right.label !== 'VP') {
		ptr = ptr.right as Branch<Tree>;
	}
	for (let i = 1; i < segments.length; i++) {
		ptr.right = attachAdjective(
			ptr.right,
			segmentToKivP(segments[i], [pro()], newCoindex),
		);
	}

	// Attach AdjunctPs to 𝘷P
	for (const a of lateAdjuncts) {
		vP = { label: '𝘷P', left: vP, right: a, source: catSource(vP, a) };
	}
	for (const a of earlyAdjuncts.reverse()) {
		vP = { label: '𝘷P', left: a, right: vP, source: catSource(a, vP) };
	}

	return vP;
}
