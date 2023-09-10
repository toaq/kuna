import { Glosser } from './gloss';
import { parse } from './parse';
import { bare, clean } from './tokenize';
import { Branch, Label, Leaf, Tree, assertBranch, isQuestion } from './tree';
import {
	VerbForm,
	conjugate,
	mergeConstructions,
	negateAuxiliary,
	realizeAspect,
	realizeTense,
	verbFormFor,
} from './english-conjugation';
import { Impossible, Unimplemented } from './error';
import { fix } from './fix';

interface Constituent {
	text: string;
	person?: VerbForm;
}

function leafText(tree: Tree): string {
	if (!('word' in tree)) {
		throw new Impossible('Unexpected non-leaf ' + tree.label);
	}
	if (tree.word.covert) return '';
	return tree.word.text;
}

function leafTextToEnglish(text: string): string {
	if (text === '◌́') {
		return 'the';
	}
	return new Glosser(true).glossWord(text);
}

function leafToEnglish(tree: Leaf): Constituent {
	const text = leafTextToEnglish(leafText(tree));
	return {
		text,
		person: verbFormFor(text),
	};
}

function verbToEnglish(tree: Tree): string {
	if ('word' in tree) {
		return leafTextToEnglish(leafText(tree));
	} else if ('left' in tree) {
		if (tree.label === 'EvAP') {
			let k = new ClauseTranslator();
			k.processClause(tree.right);
			return 'event of ' + k.emit();
		}
		const right = verbToEnglish(tree.right);
		if (tree.label === 'mıP') {
			return right.replace(/\b\w/, m => m.toUpperCase());
		}
		const left = verbToEnglish(tree.left);
		const sep = left.endsWith('-') ? '' : ' ';
		return left + sep + right;
	} else {
		throw new Impossible('weird verb ' + tree.label);
	}
}

function serialToEnglish(serial: Tree): string {
	if ('word' in serial && serial.word.covert) return '';
	if (serial.label !== '*Serial') throw new Impossible('non-*Serial serial');
	if (!('children' in serial)) throw new Impossible('non-Rose serial');
	return serial.children.map(x => verbToEnglish(x)).join('-');
}

class ClauseTranslator {
	toaqTense: string = 'naı';
	toaqComplementizer?: string;
	toaqSpeechAct?: string;
	verb?: string = undefined;
	topics: string[] = [];
	toaqAspect: string = 'tam';
	negative: boolean = false;
	subject?: Constituent = undefined;
	earlyAdjuncts: string[] = [];
	objects: Constituent[] = [];
	lateAdjuncts: string[] = [];
	modals: string[] = [];
	conjunct?: string = undefined;
	constructor(toaqSpeechAct?: string) {
		this.toaqSpeechAct = toaqSpeechAct;
	}

	public processCP(tree: Tree): void {
		assertBranch(tree);
		const c = clean(leafText(tree.left as Leaf));
		this.toaqComplementizer = c;
		this.processClause(tree.right);
	}

	public processClause(tree: Tree): void {
		for (let node = tree; ; ) {
			if ('children' in node) {
				if (node.label !== '*𝘷P') throw new Impossible('non-*𝘷P Rose');
				this.verb = serialToEnglish(node.children[0]);
				let late = false;
				for (let i = 1; i < node.children.length; i++) {
					const child = node.children[i];
					const english = treeToEnglish(child);
					if (child.label === 'AdjunctP') {
						if (late) {
							this.lateAdjuncts.push(english.text);
						} else {
							this.earlyAdjuncts.push(english.text);
						}
					} else {
						if (this.subject) {
							this.objects.push(english);
						} else {
							this.subject = english;
						}
						late = true;
					}
				}
				break;
			} else if ('word' in node) {
				throw new Impossible('hit leaf in clause');
			}
			switch (node.label) {
				case 'TopicP':
					this.topics.push(treeToEnglish(node.left).text);
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
				case 'TP':
					this.toaqTense = clean(leafText(node.left));
					node = node.right;
					break;
				case 'AspP':
					this.toaqAspect = clean(leafText(node.left));
					node = node.right;
					break;
				case '𝘷P':
					if (node.left.label === 'ModalP') {
						this.modals.push(treeToEnglish(node.left).text);
					}
					node = node.right;
					break;
				case "𝘷'":
					node = node.right;
					break;
				case '&P':
					this.conjunct = treeToEnglish(node.right).text;
					node = node.left;
					break;
				default:
					console.log(node);
					throw new Unimplemented('in processClause: ' + node.label);
			}
		}
	}

	public emit(mode?: 'DP'): string {
		if (mode !== 'DP') {
			this.subject ||= { text: 'it' };
		}
		if (this.subject?.text === 'me') {
			this.subject.text = 'I';
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

		const subjectVerbForm = this.subject?.person ?? VerbForm.Third;
		let verbForm = subjectVerbForm;
		let auxiliary: string = '';
		if (this.negative || this.toaqComplementizer === 'ma') {
			auxiliary = 'do';
			verbForm = VerbForm.Infinitive;
		}
		const tenseConstruction = realizeTense(this.toaqTense);
		const aspectConstruction = realizeAspect(this.toaqAspect);
		const merged = mergeConstructions(tenseConstruction, aspectConstruction);
		const past = merged.past ?? false;
		if (merged.auxiliary) auxiliary = merged.auxiliary;
		const auxiliary2 = merged.auxiliary2 ?? '';
		const preVerb = merged.preVerb ?? '';

		if (auxiliary) {
			auxiliary = conjugate(auxiliary, subjectVerbForm, past);
			if (this.negative) auxiliary = negateAuxiliary(auxiliary);
		}
		const verb = this.verb
			? mode === 'DP'
				? this.verb
				: conjugate(this.verb, verbForm, auxiliary ? false : past)
			: '';

		const earlyAdjuncts = this.earlyAdjuncts.map(x => x + ',');
		const subject = this.subject?.text ?? '';
		const objects = this.objects.map(x => x.text);
		let order: string[];
		if (this.toaqComplementizer === 'ma') {
			order = [
				auxiliary,
				...earlyAdjuncts,
				subject,
				auxiliary2,
				preVerb,
				verb,
				...objects,
				...this.lateAdjuncts,
				this.conjunct ?? '',
			];
		} else {
			order = [
				complementizer,
				...earlyAdjuncts,
				subject,
				auxiliary ?? '',
				auxiliary2,
				preVerb,
				verb,
				...objects,
				...this.lateAdjuncts,
				this.conjunct ?? '',
			];
		}

		order = [...this.topics.map(x => `as for ${x},`), ...order];
		order = [...this.modals, ...order];
		return order.join(' ').trim().replace(/\s+/g, ' ');
	}
}

function branchToEnglish(tree: Branch<Tree>): Constituent {
	if (tree.label === 'SAP') {
		const sa = clean(leafText(tree.right as Leaf));
		const cp = tree.left;
		const translator = new ClauseTranslator(sa);
		translator.processCP(cp);
		const englishClause = translator.emit();
		const punctuation = isQuestion(cp) ? '?' : '.';
		return {
			text: englishClause.replace(/./, x => x.toUpperCase()) + punctuation,
		};
	}
	if (tree.label === 'CP') {
		const translator = new ClauseTranslator();
		translator.processCP(tree);
		return { text: translator.emit() };
	}
	if (tree.label === 'TP') {
		const translator = new ClauseTranslator();
		translator.processClause(tree);
		return { text: translator.emit() };
	}
	if (tree.label === 'DP') {
		const d = tree.left;
		const nP = tree.right as Branch<Tree>;
		const translator = new ClauseTranslator();
		translator.processCP(nP.right);
		const noun = translator.emit('DP');
		if (clean(leafText(d)) === 'báq') {
			return { text: noun + 's', person: VerbForm.Plural };
		} else {
			const det = treeToEnglish(d).text;
			return { text: (det + ' ' + noun).trim() };
		}
	}
	if (tree.label === 'AdjunctP') {
		if (tree.right.label === 'VP') {
			assertBranch(tree.right);
			const serial = tree.right.left;
			const object = tree.right.right;
			return {
				text: serialToEnglish(serial) + ' ' + treeToEnglish(object).text,
			};
		} else {
			const serial = tree.right;
			return { text: serialToEnglish(serial) + 'ly' };
		}
	}
	if (tree.label === 'ModalP') {
		const modal = tree.left;
		const cp = tree.right as Branch<Tree>;
		const c = cp.left as Leaf;
		const translator = new ClauseTranslator();
		translator.processCP(cp);
		const eng =
			{ she: 'necessarily', ao: 'would', daı: 'possibly', ea: 'could' }[
				bare(leafText(modal))
			] ?? '?';
		if (c.word.covert) {
			return { text: eng };
		} else {
			return {
				text: 'if ' + translator.emit().replace(/^that /, '') + ', then ' + eng,
			};
		}
	}
	if (tree.label === '&P' || tree.label === "&'") {
		return {
			text:
				treeToEnglish(tree.left).text + ' ' + treeToEnglish(tree.right).text,
			person: VerbForm.Plural,
		};
	}
	if (tree.label === 'FocusP') {
		const left = treeToEnglish(tree.left).text;
		const { text: right, person } = treeToEnglish(tree.right);
		switch (left) {
			case 'FOC':
			case 'FOC.CONTR':
				return { text: '*' + right + '*', person };
			default:
				return { text: left + ' ' + right, person };
		}
	}
	throw new Unimplemented('in branchToEnglish: ' + tree.label);
}

function treeToEnglish(tree: Tree): Constituent {
	if ('word' in tree) {
		return leafToEnglish(tree);
	} else if ('left' in tree) {
		return branchToEnglish(tree);
	} else {
		throw new Impossible('unexpected Rose in treeToEnglish: ' + tree.label);
	}
}

export function toEnglish(text: string): string {
	const trees = parse(text);
	if (trees.length === 0) return 'No parse';
	if (trees.length > 1) return 'Ambiguous parse';
	const tree = trees[0];
	return treeToEnglish(tree).text;
}
