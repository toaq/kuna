import { Glosser } from './gloss';
import { parse } from './parse';
import { bare, clean } from './tokenize';
import { Branch, Label, Leaf, Tree, isQuestion } from './tree';

function leafText(tree: Tree): string {
	if (!('word' in tree)) {
		throw new Error('Unexpected non-leaf ' + tree.label);
	}
	if (tree.word === 'covert') return '';
	if (tree.word === 'functional') return '';
	return tree.word.text;
}

function assertBranch(tree: Tree): asserts tree is Branch<Tree> {
	if ('left' in tree) return;
	throw new Error('Unexpected non-branch ' + tree.label);
}

function leafToEnglish(leaf: Tree): string {
	return new Glosser(true).glossWord(leafText(leaf));
}

function serialToEnglish(serial: Tree): string {
	if (serial.label !== '*Serial') throw new Error('non-*Serial serial');
	if (!('children' in serial)) throw new Error('non-Rose serial');
	return serial.children.map(x => leafToEnglish(x)).join('-');
}

class ClauseTranslator {
	toaqTense: string = 'naı';
	toaqComplementizer?: string;
	toaqSpeechAct?: string;
	verb?: string = undefined;
	topics: string[] = [];
	toaqAspect: string = 'tam';
	negative: boolean = false;
	subject?: string = undefined;
	objects: string[] = [];
	constructor(toaqSpeechAct?: string) {
		this.toaqSpeechAct = toaqSpeechAct;
	}

	/// Process a CP.
	public processCP(tree: Tree): void {
		assertBranch(tree);
		const c = clean(leafText(tree.left as Leaf));
		this.toaqComplementizer = c;
		this.processClause(tree.right);
	}

	/// Process a CPrel from a DP.

	public processClause(tree: Tree): void {
		for (let node = tree; ; ) {
			if ('children' in node) {
				if (node.label !== '*𝘷P') throw new Error('non-*𝘷P Rose');
				this.verb = serialToEnglish(node.children[0]);
				if (node.children[1]) {
					this.subject = treeToEnglish(node.children[1]);
				}
				for (let i = 2; i < node.children.length; i++) {
					this.objects.push(treeToEnglish(node.children[i]));
				}
				break;
			} else if ('left' in node) {
				switch (node.label) {
					case 'TopicP':
						this.topics.push(treeToEnglish(node.left));
						node = node.right;
						break;
					case "Topic'":
						node = node.right;
						break;
					case 'ΣP':
						if (clean(leafText(node.left)) === 'bu') {
							this.negative = !this.negative;
						}
						node = node.right;
						break;
					case 'ModalP':
						// ugh! todo
						node = node.right;
						break;
					case 'TP':
						this.toaqTense = clean(leafText(node.left));
						node = node.right;
						break;
					case 'AspP':
						this.toaqAspect = clean(leafText(node.left));
						node = node.right;
						break;
					case '𝘷P':
					case "𝘷'":
						node = node.right;
						break;
					default:
						console.log(node);
						throw new Error('unimplemented: ' + node.label);
				}
			} else {
				throw new Error('unexpected leaf in clause');
			}
		}
	}

	public emit(mode?: 'DP'): string {
		if (mode !== 'DP') {
			this.subject ||= 'it';
		}
		if (this.subject === 'me') {
			this.subject = 'I';
		}
		let complementizer: string = '';
		switch (this.toaqComplementizer) {
			case 'ꝡä':
				complementizer = 'that';
				break;
			case 'mä':
				complementizer = 'if';
				break;
		}
		let tense: string = '';
		switch (this.toaqTense) {
			case 'pu':
				tense = 'did';
				break;
		}
		let aspect: string = '';
		switch (this.toaqAspect) {
			case 'luı':
				aspect = 'has';
				this.verb += '-en';
				break;
		}

		let order: string[];

		if (this.toaqComplementizer === 'ma') {
			order = [
				tense,
				aspect,
				'do',
				this.subject ?? '',
				this.verb ?? '',
				...this.objects,
			];
		} else {
			order = [
				complementizer,
				this.subject ?? '',
				tense,
				aspect,
				this.verb ?? '',
				...this.objects,
			];
		}

		return order.join(' ').trim().replace(/\s+/g, ' ');
	}
}

function branchToEnglish(tree: Branch<Tree>): string {
	if (tree.label === 'SAP') {
		const sa = clean(leafText(tree.right as Leaf));
		const cp = tree.left;
		const translator = new ClauseTranslator(sa);
		translator.processCP(cp);
		const englishClause = translator.emit();
		const punctuation = isQuestion(cp) ? '?' : '.';
		return englishClause.replace(/[a-z]/i, x => x.toUpperCase()) + punctuation;
	}
	if (tree.label === 'CP') {
		const translator = new ClauseTranslator();
		translator.processCP(tree);
		return translator.emit();
	}
	if (tree.label === 'DP') {
		if ('word' in tree) {
			return leafToEnglish(tree);
		} else {
			const d = tree.left;
			const nP = tree.right as Branch<Tree>;
			const translator = new ClauseTranslator();
			translator.processCP(nP.right);
			const noun = translator.emit('DP');
			if (clean(leafText(d)) === 'báq') {
				return noun + 's';
			} else {
				return leafToEnglish(d) + ' ' + noun;
			}
		}
	}
	if (tree.label === 'AdjunctP') {
		if (tree.right.label === 'VP') {
			assertBranch(tree.right);
			const serial = tree.right.left;
			const object = tree.right.right;
			return serialToEnglish(serial) + ' ' + treeToEnglish(object);
		} else {
			const serial = tree.right;
			return serialToEnglish(serial) + 'ly';
		}
	}
	throw new Error('unimplemented in branchToEnglish: ' + tree.label);
}

function treeToEnglish(tree: Tree): string {
	if ('word' in tree) {
		return leafToEnglish(tree);
	} else if ('left' in tree) {
		return branchToEnglish(tree);
	} else {
		throw new Error('unexpected Rose in treeToEnglish: ' + tree.label);
	}
}

export function toEnglish(text: string) {
	const trees = parse(text);
	if (trees.length === 0) return 'No parse';
	if (trees.length > 1) return 'Ambiguous parse';
	const tree = trees[0];
	return treeToEnglish(tree);
}
