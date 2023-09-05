import { Branch, Label, Tree } from './tree';

const arityPreservingVerbPrefixes: Label[] = ['buP', 'muP', 'buqP', 'geP'];

const pro: Tree = { label: 'DP', word: 'covert', value: 'PRO' };

export function getFrame(verb: Tree): string {
	if ('word' in verb) {
		if (verb.word === 'covert') throw new Error('covert verb?');
		if (verb.word.entry?.type === 'predicate') {
			return verb.word.entry.frame;
		} else {
			throw new Error('weird verb');
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
		throw new Error('weird nonverb: ' + verb.label);
	}
}

function serialTovP(verbs: Tree[], args: Tree[]): Tree {
	const firstFrame = getFrame(verbs[0]);
	if (verbs.length === 1) {
		const arity = firstFrame.split(' ').length;
		if (args.length < arity) {
			throw new Error('not enough arguments');
		}

		if (arity === 1) {
			return {
				label: '𝘷P',
				left: { label: '𝘷', word: 'covert', value: 'BE' },
				right: { label: 'VP', left: verbs[0], right: args[0] },
			};
		} else if (arity === 2) {
			return {
				label: '𝘷P',
				left: args[0],
				right: {
					label: "𝘷'",
					left: { label: '𝘷', word: 'covert', value: 'CAUSE' },
					right: { label: 'VP', left: verbs[0], right: args[1] },
				},
			};
		} else if (arity === 3) {
			return {
				label: '𝘷P',
				left: args[0],
				right: {
					label: "𝘷'",
					left: { label: '𝘷', word: 'covert', value: 'CAUSE' },
					right: {
						label: 'VP',
						left: args[1],
						right: { label: "V'", left: verbs[0], right: args[2] },
					},
				},
			};
		} else {
			throw new Error('bad arity');
		}
	} else {
		const frame = firstFrame.replace(/a/g, 'c').split(' ');
		for (let i = 0; i < frame.length - 1; i++) {
			if (frame[i] !== 'c') {
				throw new Error('too many numbers to serialize: ' + firstFrame);
			}
		}
		if (frame[frame.length - 1] === 'c') {
			throw new Error('no slot to serialize: ' + firstFrame);
		}
		const cCount = frame.length - 1;
		const jaCount = Number(frame[frame.length - 1][0]);
		// TODO pro coindexation
		const pros: Tree[] = new Array(jaCount).fill(pro);
		if (args.length < cCount) {
			throw new Error('not enough arguments');
		}
		const innerArgs: Tree[] = [...pros, ...args.slice(cCount)];
		const inner = serialTovP(verbs.slice(1), innerArgs);
		const arity = frame.length;
		if (arity === 1) {
			return {
				label: '𝘷P',
				left: { label: '𝘷', word: 'covert', value: 'BE' },
				right: { label: 'VP', left: verbs[0], right: inner },
			};
		} else if (arity === 2) {
			return {
				label: '𝘷P',
				left: args[0],
				right: {
					label: "𝘷'",
					left: { label: '𝘷', word: 'covert', value: 'CAUSE' },
					right: { label: 'VP', left: verbs[0], right: inner },
				},
			};
		} else if (arity === 3) {
			return {
				label: '𝘷P',
				left: args[0],
				right: {
					label: "𝘷'",
					left: { label: '𝘷', word: 'covert', value: 'CAUSE' },
					right: {
						label: 'VP',
						left: args[1],
						right: { label: "V'", left: verbs[0], right: inner },
					},
				},
			};
		} else {
			throw new Error('bad arity ' + arity);
		}
	}
}

function attachAdjective(VP: Tree, vP: Tree): Tree {
	return {
		label: 'VP',
		left: VP,
		right: {
			label: 'aP',
			left: {
				label: 'a',
				word: 'covert', // TODO ki
				value: '∅',
			},
			right: {
				// TODO: oh god, adjectives can have T and Asp?
				// needs rework in nearley grammar
				label: 'CPrel',
				left: { label: 'C', word: 'covert', value: '∅' },
				right: {
					label: 'TP',
					left: { label: 'T', word: 'covert', value: '∅' },
					right: {
						label: 'AspP',
						left: { label: 'Asp', word: 'covert', value: '∅' },
						right: vP,
					},
				},
			},
		},
	};
}

export function analyzeSerial(tree: Tree, args: Tree[]): Tree {
	if (tree.label !== '*Serial') {
		throw new Error('not a serial');
	}
	if (!('children' in tree)) {
		throw new Error('no children');
	}
	const children = tree.children;
	if (children.length === 0) {
		throw new Error('zero children');
	}

	const frames = children.map(getFrame);

	let segments = [];
	let end = children.length;
	for (let i = children.length - 2; i >= 0; i--) {
		const frame = frames[i].split(' ');
		const last = frame.at(-1)![0];
		if (last === 'c') {
			// So everything to the right is an adjective.
			segments.unshift(children.slice(i + 1, end));
			end = i + 1;
		}
	}
	segments.unshift(children.slice(0, end));

	// Now the first segment is the serial verb and everything after it is serial adjectives.
	let vP = serialTovP(segments[0], args);

	// Attach adjectives to VP
	let ptr = vP as Branch<Tree>;
	while (ptr.right.label !== 'VP') {
		ptr = ptr.right as Branch<Tree>;
	}
	for (let i = 1; i < segments.length; i++) {
		ptr.right = attachAdjective(ptr.right, serialTovP(segments[i], [pro]));
	}
	return vP;
}
