import { Impossible, Unimplemented } from '../core/error';
import {
	type Label,
	type Tree,
	assertBranch,
	catSource,
	effectiveLabel,
	skipFree,
	treeChildren,
	treeText,
} from '../tree';

export interface PostField {
	earlyAdjuncts: Tree[];
	arguments: Tree[];
	lateAdjuncts: Tree[];
}

export interface AndClause {
	word: Tree;
	clause: BoxClause;
}

export interface BoxFragment {
	fragment: Tree;
}

export interface BoxClause {
	/// If empty, means covert "ꝡa"
	complementizer: Tree;
	topic?: Tree;
	fronted?: Tree;
	frontedLabel: string;
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
	if (
		'right' in tree &&
		(tree.label === 'FocusP' || tree.label === '&P' || tree.label === "&'")
	)
		return isArgument(tree.right);
	return tree.label === 'DP' || tree.label === 'CP';
}

interface SplitBoxes {
	main: BoxSentence | BoxFragment;
	subclauses: BoxClause[];
	cpIndices: Map<Tree, number>;
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
			tree.label === 'CP' &&
			'left' in tree &&
			'word' in tree.left &&
			(!tree.left.word.covert || tree.left.word.value === '∅')
		);
	}

	private harvestCps(tree: Tree) {
		if (this.isOvertCp(tree)) {
			this.cpIndices.set(tree, this.cps.length);
			this.cps.push(tree);
		}
		for (const child of treeChildren(tree)) {
			this.harvestCps(child);
		}
	}

	private boxifyPostField(trees: Tree[]): PostField {
		let sawArgument = false;
		const earlyAdjuncts: Tree[] = [];
		const arguments_: Tree[] = [];
		const lateAdjuncts: Tree[] = [];
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
		let fronted: Tree | undefined = undefined;
		let frontedLabel = 'Subject';
		const verbalComplexWords = [];
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
			}
			if ('left' in node) {
				switch (node.label) {
					case 'TopicP':
						topic = node.left;
						node = node.right;
						break;
					case "Topic'":
						// Not really a legit TopicP...
						topic = {
							label: 'TopicP',
							left: topic!,
							right: node.left,
							source: topic!.source,
						};
						node = node.right;
						break;
					case '𝘷P': {
						if ('left' in node.right && this.words(node.right.left) === 'nä') {
							fronted = node.left;
							const label = effectiveLabel(fronted);
							frontedLabel =
								label === 'AdjunctP' ? 'Fronted adjunct' : 'Subject';
							node = node.right;
							break;
						}
						const w = node.left;
						if (this.words(w)) {
							verbalComplexWords.push(w);
						}
						node = node.right;
						break;
					}
					case 'ΣP':
					case 'TP':
					case 'AspP':
					case 'CP':
					case "𝘷'": {
						const w = node.left;
						if (this.words(w)) {
							verbalComplexWords.push(w);
						}
						node = node.right;
						break;
					}
					case 'QP': {
						assertBranch(node.right);
						// Not really a legit CondP...
						fronted = {
							label: 'CondP',
							left: node.left,
							right: node.right.left,
							source: catSource(node.left.source, node.right.left.source),
						};
						node = node.right.right;
						break;
					}
					case '&P':
						assertBranch(node.right);
						conjunction = {
							word: node.right.left,
							clause: this.boxifyClause(node.right.right),
						};
						node = node.left;
						break;
					default:
						throw new Unimplemented(`in boxifyClause: ${node.label}`);
				}
			} else {
				throw new Impossible('hit leaf in boxifyClause');
			}
		}
		const verbalComplex: Tree = {
			label: 'VerbalComplex' as Label,
			children: verbalComplexWords,
			source: catSource(...verbalComplexWords),
		};
		return {
			complementizer,
			topic,
			fronted,
			frontedLabel,
			verbalComplex,
			postField,
			conjunction,
		};
	}

	public boxifySentence(tree: Tree): SplitBoxes {
		const sap = skipFree(tree);
		if (sap.label !== 'SAP')
			throw new Impossible('boxifySentence of non-sentence');
		if (!('left' in sap)) throw new Impossible('bad SAP?');
		const sa = sap.right;
		if (sa.label !== 'SA') throw new Impossible('SAP without SA?');
		if (!('word' in sa)) throw new Impossible('SA without word?');
		const speechAct = sa;
		const cp = skipFree(sap.left);
		for (const child of treeChildren(cp)) this.harvestCps(child);
		const clause = this.boxifyClause(cp);
		return {
			main: { clause, speechAct },
			subclauses: this.cps.map(x => this.boxifyClause(x)),
			cpIndices: this.cpIndices,
		};
	}

	public boxifyFragment(tree: Tree): SplitBoxes {
		this.harvestCps(tree);
		return {
			main: { fragment: tree },
			subclauses: this.cps.map(x => this.boxifyClause(x)),
			cpIndices: this.cpIndices,
		};
	}

	public boxify(tree: Tree): SplitBoxes[] {
		const saps = skipFree(tree);
		if (saps.label === 'SAP') {
			return [this.boxifySentence(saps)];
		}
		if ('left' in saps && saps.label === 'Discourse') {
			return [this.boxifySentence(saps.left), ...this.boxify(saps.right)];
		}
		return [this.boxifyFragment(saps)];
	}
}

export function boxify(tree: Tree): SplitBoxes[] {
	return new Boxifier().boxify(tree);
}
