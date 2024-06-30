import { Impossible, Unimplemented } from '../core/error';
import { clean } from '../morphology/tokenize';
import { type Leaf, type Tree, assertBranch } from '../tree';
import { leafText } from '../tree/functions';
import {
	VerbForm,
	conjugate,
	mergeConstructions,
	negateAuxiliary,
	nominative,
	realizeAspect,
	realizeTense,
} from './conjugation';
import { serialToEnglish, treeToEnglish } from './tree';

// @ts-ignore
import { Tagger } from 'pos';

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
	static tagger = new Tagger();

	toaqTense = 'naı';
	toaqComplementizer?: string;
	toaqSpeechAct?: string;
	verb?: string = undefined;
	topics: string[] = [];
	toaqAspect = 'tam';
	negative = false;
	hoaReferent?: Constituent = undefined;
	subject?: Constituent = undefined;
	earlyAdjuncts: string[] = [];
	objects: Constituent[] = [];
	lateAdjuncts: string[] = [];
	modals: string[] = [];
	conjunct?: string = undefined;
	constructor(toaqSpeechAct?: string) {
		this.toaqSpeechAct = toaqSpeechAct;
	}

	private pos(word: string): 'adjective' | 'noun' | 'verb' {
		const w = word.split('.')[0];
		switch (ClauseTranslator.tagger.tag([w])[0][1]) {
			case 'JJ':
			case 'JJR':
			case 'JJS':
			case 'RB':
			case 'RBR':
			case 'RBS':
			case 'CD':
				return 'adjective';
			case 'NN':
			case 'NNP':
			case 'NNPS':
			case 'NNS':
				return 'noun';
			default:
				return 'verb';
		}
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
			}
			if ('word' in node) {
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
					if (
						'left' in node.right &&
						'word' in node.right.left &&
						clean(leafText(node.right.left)) === 'nä'
					) {
						this.hoaReferent = treeToEnglish(node.left);
					}
					node = node.right;
					break;
				case "𝘷'":
				case 'CPrel':
					node = node.right;
					break;
				case '&P':
					this.conjunct = treeToEnglish(node.right).text;
					node = node.left;
					break;
				default:
					console.log(node);
					throw new Unimplemented(`in processClause: ${node.label}`);
			}
		}
	}

	private mainVerb(
		mode: 'DP' | undefined,
		verbForm: VerbForm,
		auxiliary: boolean,
		past: boolean,
	): string {
		if (!this.verb) return '';
		const pos = this.pos(this.verb);
		if (mode === 'DP') {
			if (this.verb === 'something') {
				return '';
			}
			if (pos === 'verb') {
				return `${this.verb}er`;
			}
			if (pos === 'adjective') {
				return `${this.verb} thing`;
			}
			return this.verb;
		}
		if (pos === 'verb') {
			return conjugate(this.verb, verbForm, auxiliary ? false : past);
		}
		const be = conjugate('be', verbForm, auxiliary ? false : past);
		const article =
			pos === 'noun' ? (/^[aeiou]/.test(this.verb) ? ' an ' : ' a ') : ' ';
		return be + article + this.verb;
	}

	public emit(mode?: 'DP'): string {
		if (mode !== 'DP') {
			this.subject ||= { text: 'it' };
		}
		if (this.subject?.text) {
			this.subject.text = nominative(this.subject.text);
		}
		let complementizer = '';
		switch (this.toaqComplementizer) {
			case 'ꝡä':
				complementizer = 'that';
				break;
			case 'mä':
				complementizer = 'if';
				break;
			case 'lä':
				complementizer = 'to';
				if (this.subject?.text === 'X') {
					this.subject = { text: '', person: VerbForm.Infinitive };
				}
				break;
		}

		const subjectVerbForm = this.subject?.person ?? VerbForm.Third;
		let verbForm = subjectVerbForm;
		let auxiliary = '';
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
		if (merged.verbForm) verbForm = merged.verbForm;
		const auxiliaryInfinitive = auxiliary;

		if (auxiliary) {
			auxiliary = conjugate(auxiliary, subjectVerbForm, past);
			if (this.negative) auxiliary = negateAuxiliary(auxiliary);
		}

		let mainVerb = this.mainVerb(mode, verbForm, !!auxiliary, past);

		// Transform "Does she be" → "Is she" or "She doesn't be" → "She isn't"
		if (/^be /.test(mainVerb) && auxiliaryInfinitive === 'do') {
			mainVerb = mainVerb.replace(/^be /, '');
			auxiliary = conjugate('be', subjectVerbForm, past);
			if (this.negative) auxiliary = negateAuxiliary(auxiliary);
		}

		const earlyAdjuncts = this.earlyAdjuncts.map(x => `${x},`);
		const text = (constituent?: Constituent) =>
			constituent
				? constituent.text === 'RSM' && this.hoaReferent
					? this.hoaReferent.text
					: constituent.text
				: '';

		const subject = text(this.subject);
		const objects = this.objects.map(text);
		let order: string[];
		if (this.toaqComplementizer === 'ma') {
			order = [
				auxiliary,
				...earlyAdjuncts,
				subject,
				auxiliary2,
				preVerb,
				mainVerb,
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
				mainVerb,
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
