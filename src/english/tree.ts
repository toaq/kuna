import { Impossible, Unimplemented } from '../error';
import { parse } from '../parse';
import { bare, clean } from '../tokenize';
import { Branch, Leaf, Tree, assertBranch, isQuestion } from '../tree';
import { ClauseTranslator, Constituent } from './clause-translator';
import { VerbForm } from './conjugation';
import { leafText, leafTextToEnglish, leafToEnglish } from './leaf';

/**
 * Translate one verb (part of a *Serial) to English.
 */
function verbToEnglish(tree: Tree): string {
	if ('word' in tree) {
		return leafTextToEnglish(leafText(tree));
	}
	assertBranch(tree);
	if (tree.label === 'EvAP') {
		const translator = new ClauseTranslator();
		translator.processClause(tree.right);
		return 'event of ' + translator.emit();
	}
	const right = verbToEnglish(tree.right);
	if (tree.label === 'mıP') {
		return right.replace(/\b\w/, m => m.toUpperCase());
	}
	const left = verbToEnglish(tree.left);
	const sep = left.endsWith('-') ? '' : ' ';
	return left + sep + right;
}

/**
 * Translate a *Serial to English by stringing together all the verbs.
 */
export function serialToEnglish(serial: Tree): string {
	if ('word' in serial && serial.word.covert) return '';
	if (serial.label !== '*Serial') throw new Impossible('non-*Serial serial');
	if (!('children' in serial)) throw new Impossible('non-Rose serial');
	return serial.children.map(x => verbToEnglish(x)).join('-');
}

/**
 * Translate a SAP to English by capitalizing and punctuating the clause.
 */
function sapToEnglish(tree: Branch<Tree>): Constituent {
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

/**
 * Translate a CP to English using ClauseTranslator.
 */
function cpToEnglish(tree: Branch<Tree>): Constituent {
	const translator = new ClauseTranslator();
	translator.processCP(tree);
	return { text: translator.emit() };
}

/**
 * Translate a TP to English using ClauseTranslator.
 */
function tpToEnglish(tree: Branch<Tree>): Constituent {
	const translator = new ClauseTranslator();
	translator.processClause(tree);
	return { text: translator.emit() };
}

/**
 * Translate a DP to English using ClauseTranslator.
 */
function dpToEnglish(tree: Branch<Tree>): Constituent {
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

function adjunctpToEnglish(tree: Branch<Tree>): Constituent {
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

function modalpToEnglish(tree: Branch<Tree>): Constituent {
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

function focuspToEnglish(tree: Branch<Tree>): Constituent {
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

function branchToEnglish(tree: Branch<Tree>): Constituent {
	switch (tree.label) {
		case 'SAP':
			return sapToEnglish(tree);
		case 'CP':
			return cpToEnglish(tree);
		case 'TP':
			return tpToEnglish(tree);
		case 'DP':
			return dpToEnglish(tree);
		case 'AdjunctP':
			return adjunctpToEnglish(tree);
		case 'ModalP':
			return modalpToEnglish(tree);
		case '&P':
		case "&'":
			const left = treeToEnglish(tree.left);
			const right = treeToEnglish(tree.right);
			return {
				text: left.text + ' ' + right.text,
				person: VerbForm.Plural,
			};
		case 'FocusP':
			return focuspToEnglish(tree);
		default:
			throw new Unimplemented('in branchToEnglish: ' + tree.label);
	}
}

export function treeToEnglish(tree: Tree): Constituent {
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
