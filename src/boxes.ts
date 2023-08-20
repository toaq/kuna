import { Tree } from './tree';

interface PostField {
	earlyAdjuncts: string[];
	arguments: string[];
	lateAdjuncts: string[];
}

interface Clause {
	/// If empty, means covert "ꝡa"
	complementizer: string;
	topic?: string;
	verbalComplex: string;
	postField?: PostField;
}

interface Sentence {
	clause: Clause;
	/// If empty, means covert "da"
	speechAct: string;
}

function skipFree(tree: Tree): Tree {
	if (tree.label === 'InterjectionP' && 'left' in tree) {
		return tree.left.label === 'Interjection' ? tree.right : tree.left;
	}
	return tree;
}

function words(tree: Tree): string {
	if ('word' in tree) {
		if (tree.word === 'covert' || tree.word === 'functional') {
			return '';
		} else {
			return tree.word.text;
		}
	} else if ('left' in tree) {
		return (words(tree.left) + ' ' + words(tree.right)).trim();
	} else {
		return tree.children.map(words).join(' ').trim();
	}
}

function boxifyPostField(trees: Tree[]): PostField {
	let sawArgument = false;
	let earlyAdjuncts: string[] = [];
	let arguments_: string[] = [];
	let lateAdjuncts: string[] = [];
	for (const tree of trees) {
		if (tree.label === 'DP') {
			arguments_.push(words(tree));
			sawArgument = true;
		} else if (sawArgument) {
			lateAdjuncts.push(words(tree));
		} else {
			earlyAdjuncts.push(words(tree));
		}
	}

	return {
		earlyAdjuncts,
		arguments: arguments_,
		lateAdjuncts,
	};
}

function boxifyClause(tree: Tree): Clause {
	let complementizer = '';
	let topic: string | undefined = undefined;
	let verbalComplexWords = [];
	let postField: PostField | undefined = undefined;
	const cp = skipFree(tree);
	if (!('left' in cp)) throw new Error('bad CP?');
	const c = cp.left;
	if (!('word' in c)) throw new Error('C without word?');
	if (c.word !== 'covert' && c.word !== 'functional') {
		complementizer = c.word.text;
	}
	for (let node = cp.right; ; ) {
		if ('children' in node) {
			if (node.label !== '*𝘷P') throw new Error('non-*𝘷P Rose');
			const serial = node.children[0];
			verbalComplexWords.push(words(serial));
			postField = boxifyPostField(node.children.slice(1));
			break;
		} else if ('left' in node) {
			switch (node.label) {
				case 'TopicP':
					topic = words(node.left);
					node = node.right;
					break;
				case "Topic'":
					topic += ' ' + words(node.left);
					node = node.right;
					break;
				case 'ΣP':
				case 'ModalP':
				case 'TP':
				case 'AspP':
					const w = words(node.left);
					w && verbalComplexWords.push(w);
					node = node.right;
					break;
				default:
					throw new Error('unimplemented: ' + node.label);
			}
		} else {
			throw new Error('unexpected leaf in clause');
		}
	}
	const verbalComplex = verbalComplexWords.join(' ').trim();
	return { complementizer, topic, verbalComplex, postField };
}

export function boxify(tree: Tree): Sentence {
	let speechAct: string = '';
	tree = skipFree(tree);
	if (tree.label !== 'SAP') throw new Error('Cannot boxify non-sentence');
	if (!('left' in tree)) throw new Error('bad SAP?');
	const sa = tree.right;
	if (sa.label !== 'SA') throw new Error('SAP without SA?');
	if (!('word' in sa)) throw new Error('SA without word?');
	if (sa.word !== 'covert' && sa.word !== 'functional') {
		speechAct = sa.word.text;
	}
	const cp = tree.left;
	const clause = boxifyClause(cp);
	return { clause, speechAct };
}
