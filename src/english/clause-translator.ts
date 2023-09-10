import { Impossible, Unimplemented } from '../error';
import { clean } from '../tokenize';
import { Leaf, Tree, assertBranch } from '../tree';
import {
	VerbForm,
	conjugate,
	mergeConstructions,
	negateAuxiliary,
	realizeAspect,
	realizeTense,
} from './conjugation';
import { serialToEnglish, treeToEnglish } from './tree';
import { leafText } from './leaf';

/**
 * Just some English text tagged with the verb form it conjugates with.
 * By default this is VerbForm.ThirdPerson.
 *
 * e.g. {text: "the dog"} or {text: "you", person: VerbForm.Plural}
 */
export interface Constituent {
	text: string;
	person?: VerbForm;
}

/**
 * This class walks down a Toaq clause and stores information about what it sees
 * (what's the subject, what's the tense...). Then, calling `emit()` constructs
 * an English sentence from this information.
 */
export class ClauseTranslator {
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
