import { Impossible, Ungrammatical, Unimplemented } from '../core/error';
import { splitNonEmpty } from '../core/misc';
import {
	type Branch,
	type Label,
	type Tree,
	assertBranch,
} from '../tree/types';

export interface SerialSlot {
	verbIndex: number;
	slotIndex: number;
}

export interface SerialDescription {
	slots: SerialSlot[][];
	didSerialize: boolean;
}

const intransitiveVerbPrefixes: Label[] = ['beP', 'suP', 'teP', 'nhaP', 'haoP'];
const arityPreservingVerbPrefixes: Label[] = [
	'buP',
	'FocusP',
	'muP',
	'buqP',
	'geP',
	'TelicityP',
];

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
		}
		if (verb.word.entry?.type === 'predicatizer') {
			return `${verb.word.entry.frame} c`;
		}
		if (verb.word.entry?.type === 'adjective marker') {
			return 'kı';
		}
		throw new Impossible('weird verb');
	}
	if (verb.label === '&P' && 'left' in verb) {
		return getFrame(verb.left);
	}
	if (verb.label === 'shuP' || verb.label === 'mıP' || verb.label === 'teoP') {
		return 'c';
	}
	if (verb.label === 'V') {
		// Object incorporation: delete the object place from the V's frame
		assertBranch(verb);
		// DP could be on either side of the branch (sạtao / tao sâ)
		const v = verb.left.label === 'DP' ? verb.right : verb.left;
		const frame = getFrame(v);
		const lastSpace = frame.lastIndexOf(' ');
		if (lastSpace === -1) throw new Ungrammatical('Verb is not transitive');
		return frame.slice(0, lastSpace);
	}
	if (verb.label === 'haP') {
		return 'c c';
	}
	if (verb.label === 'boP') {
		return 'c c';
	}
	if (intransitiveVerbPrefixes.includes(verb.label)) {
		return 'c';
	}
	if (arityPreservingVerbPrefixes.includes(verb.label)) {
		return getFrame((verb as Branch<Tree>).right);
	}
	throw new Unimplemented(`Can't get frame of ${verb.label}`);
}

/**
 * Turn a list of verbs into a description of the serial's effective slot structure.
 *
 * For example, [nue, do] is turned into
 *
 *     {
 *       slots: [
 *         [ { verbIndex: 0, slotIndex: 0 },    // nue's subject
 *           { verbIndex: 1, slotIndex: 0 } ],  // = do's subject
 *         [ { verbIndex: 0, slotIndex: 1 } ],  // nue's indirect object
 *         [ { verbIndex: 1, slotIndex: 1 } ],  // do's indirect object
 *         [ { verbIndex: 1, slotIndex: 2 } ],  // do's direct object
 *       ],
 *       didSerialize: true,
 *     }
 *
 * where slots.length indicates that the effective arity of this serial is 3.
 *
 * If the serial cannot be analyzed (due to a missing frame), `undefined` is returned.
 */
export function describeSerial(
	children: Tree[],
): SerialDescription | undefined {
	const n = children.length;
	const frames = children.map(getFrame);
	if (frames.includes('?')) return undefined;
	const frame = splitNonEmpty(frames[n - 1], ' ');
	let slots = frame.map((_, j) => [{ verbIndex: n - 1, slotIndex: j }]);
	let didSerialize = false;
	for (let i = n - 2; i >= 0; i--) {
		const frame = splitNonEmpty(frames[i], ' ');
		const last = frame.at(-1)!;
		if (/c/.test(last)) {
			// Wipe the whole description, it was just an adjective:
			slots = frame.map((_, j) => [{ verbIndex: i, slotIndex: j }]);
		} else {
			// Introduce some new slots and merge away some old slots:
			didSerialize = true;
			const newSlots = frame
				.slice(0, -1)
				.map((_, j) => [{ verbIndex: i, slotIndex: j }]);
			for (let x = 1; x < last.length; x++) {
				if (last[x] === 'i') newSlots[0].push(...slots[x - 1]);
				if (last[x] === 'j') newSlots[1].push(...slots[x - 1]);
			}
			slots = [...newSlots, ...slots.slice(Number(last[0]))];
		}
	}
	return { slots, didSerialize };
}
