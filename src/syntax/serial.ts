import {
	Impossible,
	Ungrammatical,
	Unimplemented,
	Unrecognized,
} from '../core/error';
import { splitNonEmpty } from '../core/misc';
import {
	type Branch,
	type Leaf,
	type Tree,
	assertBranch,
	assertLeaf,
	catSource,
	effectiveLabel,
	makeNull,
} from '../tree';
import { moveUp } from '../tree/movement';
import { getFrame } from './frame';

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

export function pro(): Leaf {
	return { label: 'DP', word: { covert: true, value: 'PRO' }, source: '' };
}

export function getDistribution(verb: Tree): string {
	if ('word' in verb) {
		if (verb.word.covert) {
			// Must be the covert "raı" after a "sá".
			return 'd';
		}
		if (verb.word.entry?.type === 'predicate') {
			return verb.word.entry.distribution;
		}
		if (verb.word.entry?.type === 'predicatizer') {
			return `${verb.word.entry.distribution} n`;
		}
		throw new Impossible('weird verb');
	}
	if (verb.label === 'mıP') {
		return 'n';
	}
	if (verb.label === 'shuP' || verb.label === 'teoP') {
		return 'd';
	}
	if (verb.label === 'EvAP') {
		return 'd';
	}
	if (verb.label === 'haP' || verb.label === 'suP') {
		const distribution = getDistribution((verb as Branch<Tree>).right);
		return `${distribution} ${distribution}`;
	}
	if (verb.label === 'boP' || verb.label === 'teP') {
		const distribution = getDistribution((verb as Branch<Tree>).right);
		const firstSpace = distribution.indexOf(' ');
		if (firstSpace === -1) throw new Ungrammatical('Verb is not transitive');
		return distribution.slice(firstSpace + 1);
	}
	throw new Unimplemented(`Can't get distribution of ${verb.label}`);
}

function agentive(verb: Tree): boolean {
	if ('word' in verb)
		return (
			!verb.word.covert &&
			verb.word.entry?.type === 'predicate' &&
			verb.word.entry.subject === 'agent'
		);
	if (
		'right' in verb &&
		(verb.label === 'buP' ||
			verb.label === 'muP' ||
			verb.label === 'geP' ||
			verb.label === 'buqP' ||
			verb.label === 'TelicityP')
	)
		return agentive(verb.right);
	throw new Unrecognized('verb shape');
}

function makevP(verb: Tree, args: Tree[]): Tree {
	const agent = agentive(verb);
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
					source: `${verb.source} ${subject.source}`,
				};
			}
			const source = `${verb.source} ${subject.source}`;
			return {
				label: '𝘷P',
				left: v,
				right: { label: 'VP', left: verb, right: subject, source },
				source,
			};
		}
		case 2: {
			const [subject, directObject] = args;
			const voSource = `${verb.source} … ${directObject.source}`;
			const vsoSource = `${verb.source} ${subject.source} ${directObject.source}`;

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
			const voSource = `${verb.source} … ${directObject.source}`;
			const vooSource = `${verb.source} … ${indirectObject.source} ${directObject.source}`;
			const vsooSource = `${verb.source} ${subject.source} ${indirectObject.source} ${directObject.source}`;
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

		// Extract the object from an object-incorporated verb
		return verbs[0].label === 'V' &&
			'left' in verbs[0] &&
			verbs[0].left.label === 'V'
			? makevP(verbs[0].left, [...args, verbs[0].right])
			: makevP(verbs[0], args);
	}
	const frame = splitNonEmpty(firstFrame.replace(/a/g, 'c'), ' ');
	for (let i = 0; i < frame.length - 1; i++) {
		if (frame[i] !== 'c') {
			throw new Ungrammatical(`frame can't serialize: ${firstFrame}`);
		}
	}
	if (frame[frame.length - 1] === 'c') {
		throw new Ungrammatical(`frame can't serialize: ${firstFrame}`);
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
	}
	return { vP: serialTovP(segment, args, newCoindex) };
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
 * Turn the children of a *Serial into a list of segments.
 */
export function segmentSerial(children: Tree[]): Tree[][] {
	const frames = children.map(getFrame);
	const segments: Tree[][] = [];
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
	return segments;
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

	const segments = segmentSerial(children);

	const earlyAdjuncts: Tree[] = [];
	const args: Tree[] = [];
	const lateAdjuncts: Tree[] = [];
	for (const term of terms) {
		const label = effectiveLabel(term);
		if (label === 'DP' || label === '𝘯P') args.push(term);
		else if (args.length) lateAdjuncts.push(term);
		else earlyAdjuncts.push(term);
	}

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
