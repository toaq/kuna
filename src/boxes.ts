import { inTone } from './tokenize';
import { Tree, assertBranch } from './tree';
import { Tone } from './types';
import { Impossible, Ungrammatical, Unimplemented } from './error';

export interface PostField {
	earlyAdjuncts: string[];
	arguments: string[];
	lateAdjuncts: string[];
}

export interface AndClause {
	word: string;
	clause: BoxClause;
}

export interface BoxClause {
	/// If empty, means covert "ꝡa"
	complementizer: string;
	topic?: string;
	subject?: string;
	verbalComplex: string;
	postField: PostField;
	conjunction?: AndClause;
}

export interface BoxSentence {
	clause: BoxClause;
	/// If empty, means covert "da"
	speechAct: string;
}

function repairTones(text: string): string {
	return text.replace(/◌(.) (\S+)/g, (m, diacritic, word) => {
		const tone = diacritic.charCodeAt() === 0x301 ? Tone.T2 : Tone.T4;
		return inTone(word, tone).normalize();
	});
}

function skipFree(tree: Tree): Tree {
	if (tree.label === 'InterjectionP' && 'left' in tree) {
		return tree.left.label === 'Interjection' ? tree.right : tree.left;
	}
	return tree;
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
}

export function circled(i: number): string {
	return i < 10 ? '⓪①②③④⑤⑥⑦⑧⑨'[i] : `(${i})`;
}

class Boxifier {
	cpBoxClauses: BoxClause[] = [];
	cpIndices: Map<Tree, number> = new Map();
	cps: Tree[] = [];

	private words(tree: Tree): string {
		if ('word' in tree) {
			if (tree.word.covert) {
				return '';
			} else {
				return tree.word.text;
			}
		} else if ('left' in tree) {
			const cpIndex = this.cpIndices.get(tree);
			if (cpIndex !== undefined) {
				return circled(cpIndex);
			}

			return repairTones(
				(this.words(tree.left) + ' ' + this.words(tree.right)).trim(),
			);
		} else {
			return repairTones(
				tree.children
					.map(x => this.words(x))
					.join(' ')
					.trim(),
			);
		}
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
		let earlyAdjuncts: string[] = [];
		let arguments_: string[] = [];
		let lateAdjuncts: string[] = [];
		for (const tree of trees) {
			if (isArgument(tree)) {
				arguments_.push(this.words(tree));
				sawArgument = true;
			} else if (sawArgument) {
				lateAdjuncts.push(this.words(tree));
			} else {
				earlyAdjuncts.push(this.words(tree));
			}
		}

		return {
			earlyAdjuncts,
			arguments: arguments_,
			lateAdjuncts,
		};
	}

	private boxifyClause(cp: Tree): BoxClause {
		let complementizer = '';
		let topic: string | undefined = undefined;
		let subject: string | undefined = undefined;
		let verbalComplexWords = [];
		let postField: PostField | undefined = undefined;
		let conjunction: AndClause | undefined = undefined;
		if (!('left' in cp)) throw new Impossible('bad CP?');
		const c = cp.left;
		if (!('word' in c)) throw new Impossible('C without word?');
		if (!c.word.covert) {
			complementizer = c.word.text;
		}
		for (let node = cp.right; ; ) {
			if ('children' in node) {
				if (node.label !== '*𝘷P') throw new Impossible('non-*𝘷P Rose');
				const serial = node.children[0];
				verbalComplexWords.push(this.words(serial));
				postField = this.boxifyPostField(node.children.slice(1));
				break;
			} else if ('left' in node) {
				switch (node.label) {
					case 'TopicP':
						topic = this.words(node.left);
						node = node.right;
						break;
					case "Topic'":
						topic += ' ' + this.words(node.left);
						node = node.right;
						break;
					case '𝘷P':
						if ('left' in node.right && this.words(node.right.left) === 'nä') {
							subject = this.words(node.left);
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
						const w = this.words(node.left);
						w && verbalComplexWords.push(w);
						node = node.right;
						break;
					case '&P':
						assertBranch(node.right);
						conjunction = {
							word: this.words(node.right.left),
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
		const verbalComplex = verbalComplexWords.join(' ').trim();
		return {
			complementizer,
			topic,
			subject,
			verbalComplex,
			postField,
			conjunction,
		};
	}

	public boxify(tree: Tree): SplitBoxes {
		let speechAct: string = '';
		tree = skipFree(tree);
		if (tree.label !== 'SAP')
			throw new Ungrammatical('Cannot boxify non-sentence');
		if (!('left' in tree)) throw new Impossible('bad SAP?');
		const sa = tree.right;
		if (sa.label !== 'SA') throw new Impossible('SAP without SA?');
		if (!('word' in sa)) throw new Impossible('SA without word?');
		if (!sa.word.covert) {
			speechAct = sa.word.text;
		}
		const cp = skipFree(tree.left);
		this.harvestCps(cp);
		const clause = this.boxifyClause(cp);
		return {
			main: { clause, speechAct },
			subclauses: this.cps.slice(1).map(x => this.boxifyClause(x)),
		};
	}
}

export function boxify(tree: Tree): SplitBoxes {
	return new Boxifier().boxify(tree);
}
