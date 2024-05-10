import { inTone } from '../morphology/tokenize';
import { Tree, assertBranch, skipFree, treeText } from '../tree';
import { Tone } from '../core/types';
import { Impossible, Ungrammatical, Unimplemented } from '../core/error';

export interface PostField {
	earlyAdjuncts: Tree[];
	arguments: Tree[];
	lateAdjuncts: Tree[];
}

export interface AndClause {
	word: Tree;
	clause: BoxClause;
}

export interface BoxClause {
	/// If empty, means covert "ꝡa"
	complementizer: Tree;
	topic?: Tree;
	subject?: Tree;
	verbalComplex: Tree;
	postField: PostField;
	conjunction?: AndClause;
}

export interface BoxSentence {
	clause: BoxClause;
	/// If empty, means covert "da"
	speechAct: Tree;
}

function isArgument(tree: Tree): boolean {
	while (
		'right' in tree &&
		(tree.label === 'FocusP' || tree.label === '&P' || tree.label === "&'")
	) {
		tree = tree.right;
	}
	return tree.label === 'DP' || tree.label === 'CP';
}

interface SplitBoxes {
	main: BoxSentence;
	subclauses: BoxClause[];
	cpIndices: Map<Tree, number>;
}

export function circled(i: number): string {
	return i < 10 ? '⓪①②③④⑤⑥⑦⑧⑨'[i] : `(${i})`;
}

class Boxifier {
	cpBoxClauses: BoxClause[] = [];
	cpIndices: Map<Tree, number> = new Map();
	cps: Tree[] = [];

	private words(tree: Tree): string {
		return treeText(tree, this.cpIndices);
	}

	private isOvertCp(tree: Tree) {
		return (
			tree.label === 'CP' ||
			(tree.label === 'CPrel' &&
				'left' in tree &&
				'word' in tree.left &&
				!tree.left.word.covert)
		);
	}

	private harvestCps(tree: Tree) {
		if (this.isOvertCp(tree)) {
			this.cpIndices.set(tree, this.cps.length);
			this.cps.push(tree);
		}
		if ('left' in tree) {
			this.harvestCps(tree.left);
			this.harvestCps(tree.right);
		} else if ('children' in tree) {
			for (const c of tree.children) {
				this.harvestCps(c);
			}
		}
	}

	private boxifyPostField(trees: Tree[]): PostField {
		let sawArgument = false;
		let earlyAdjuncts: Tree[] = [];
		let arguments_: Tree[] = [];
		let lateAdjuncts: Tree[] = [];
		for (const tree of trees) {
			if (isArgument(tree)) {
				arguments_.push(tree);
				sawArgument = true;
			} else if (sawArgument) {
				lateAdjuncts.push(tree);
			} else {
				earlyAdjuncts.push(tree);
			}
		}

		return {
			earlyAdjuncts,
			arguments: arguments_,
			lateAdjuncts,
		};
	}

	private boxifyClause(cp: Tree): BoxClause {
		let topic: Tree | undefined = undefined;
		let subject: Tree | undefined = undefined;
		let verbalComplexWords = [];
		let postField: PostField | undefined = undefined;
		let conjunction: AndClause | undefined = undefined;
		if (!('left' in cp)) throw new Impossible('bad CP?');
		const c = cp.left;
		if (!('word' in c)) throw new Impossible('C without word?');
		const complementizer = c;
		for (let node = cp.right; ; ) {
			if ('children' in node) {
				if (node.label !== '*𝘷P') throw new Impossible('non-*𝘷P Rose');
				const serial = node.children[0];
				verbalComplexWords.push(serial);
				postField = this.boxifyPostField(node.children.slice(1));
				break;
			} else if ('left' in node) {
				switch (node.label) {
					case 'TopicP':
						topic = node.left;
						node = node.right;
						break;
					case "Topic'":
						// Not really a legit TopicP...
						topic = { label: 'TopicP', left: topic!, right: node.left };
						node = node.right;
						break;
					case '𝘷P':
						if ('left' in node.right && this.words(node.right.left) === 'nä') {
							subject = node.left;
							node = node.right;
							break;
						}
					// fall through
					case 'ΣP':
					case 'ModalP':
					case 'TP':
					case 'AspP':
					case 'CPrel':
					case "𝘷'":
						const w = node.left;
						if (this.words(w)) {
							verbalComplexWords.push(w);
						}
						node = node.right;
						break;
					case '&P':
						assertBranch(node.right);
						conjunction = {
							word: node.right.left,
							clause: this.boxifyClause(node.right.right),
						};
						node = node.left;
						break;
					default:
						console.log(node);
						throw new Unimplemented('in boxifyClause: ' + node.label);
				}
			} else {
				throw new Impossible('hit leaf in boxifyClause');
			}
		}
		const verbalComplex: Tree = {
			label: '*Serial',
			children: verbalComplexWords,
		};
		return {
			complementizer,
			topic,
			subject,
			verbalComplex,
			postField,
			conjunction,
		};
	}

	public boxifySentence(tree: Tree): SplitBoxes {
		tree = skipFree(tree);
		if (tree.label !== 'SAP')
			throw new Impossible('boxifySentence of non-sentence');
		if (!('left' in tree)) throw new Impossible('bad SAP?');
		const sa = tree.right;
		if (sa.label !== 'SA') throw new Impossible('SAP without SA?');
		if (!('word' in sa)) throw new Impossible('SA without word?');
		const speechAct = sa;
		const cp = skipFree(tree.left);
		this.harvestCps(cp);
		const clause = this.boxifyClause(cp);
		return {
			main: { clause, speechAct },
			subclauses: this.cps.slice(1).map(x => this.boxifyClause(x)),
			cpIndices: this.cpIndices,
		};
	}

	public boxify(tree: Tree): SplitBoxes[] {
		tree = skipFree(tree);
		if (tree.label === 'SAP') {
			return [this.boxifySentence(tree)];
		} else if ('left' in tree && tree.label === 'Discourse') {
			return [this.boxifySentence(tree.left), ...this.boxify(tree.right)];
		} else {
			throw new Ungrammatical("Can't boxify " + tree.label);
		}
	}
}

export function boxify(tree: Tree): SplitBoxes[] {
	tree = skipFree(tree);
	if (tree.label === 'SAP') {
		return [new Boxifier().boxifySentence(tree)];
	} else if ('left' in tree && tree.label === 'Discourse') {
		return [new Boxifier().boxifySentence(tree.left), ...boxify(tree.right)];
	} else {
		throw new Ungrammatical("Can't boxify " + tree.label);
	}
}
