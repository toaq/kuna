import { Unimplemented } from '../core/error';
import { baseForm } from '../morphology/tokenize';
import { Branch, Leaf, StrictTree, assertBranch, assertLabel } from '../tree';
import { leafText as actualLeafText } from '../tree';
import { G_A, G_N, G_PN, G_V, G_V2, G_V3 } from './lexicon';
import lexicon from './lexicon';

type G_Quant = 'IndefArt' | 'DefArt' | 'that_Quant' | 'this_Quant';
type G_Num = 'NumSg' | 'NumPl';
type G_Tense = 'TPres' | 'TPast' | 'TFut' | 'TCond';
type G_Ant = 'ASimul' | 'AAnter';
type G_Pol = 'PPos' | 'PNeg';
type G_Det = ['DetQuant', G_Quant, G_Num] | 'every_Det';
type G_Pron = `${string}_Pron`;
type G_CN = ['UseN', G_N] | ['RelCN', G_CN, G_RS];
type G_NP =
	| ['UsePron', G_Pron]
	| ['UsePN', G_PN]
	| ['DetCN', G_Det, G_CN]
	| ['ConjNP', G_Conj, G_ListNP];
type G_Temp = ['TTAnt', G_Tense, G_Ant];
type G_AP = ['PositA', G_A];
type G_Comp = ['CompCN', G_CN] | ['CompAP', G_AP];
type G_VPSlash = ['SlashV2a', G_V2] | ['Slash2V3', G_V3, G_NP];
type G_VP =
	| ['UseV', G_V]
	| ['UseComp', G_Comp]
	| ['ComplSlash', G_VPSlash, G_NP];
type G_Cl = ['PredVP', G_NP, G_VP] | ['ImpersCl', G_VP];
type G_RCl = ['RelCl', G_Cl];
type G_S = ['UseCl', G_Temp, G_Pol, G_Cl];
type G_RS = ['UseRCl', G_Temp, G_Pol, G_RCl];
type G_Utt = ['UttS', G_S];
type G_Conj = 'and_Conj' | 'or_Conj';
type G_ListNP = ['BaseNP', G_NP, G_NP] | ['ConsNP', G_NP, G_ListNP];

type Gf =
	| G_Quant
	| G_Num
	| G_Tense
	| G_Ant
	| G_Pol
	| G_Det
	| G_Pron
	| G_CN
	| G_NP
	| G_Temp
	| G_AP
	| G_Comp
	| G_VPSlash
	| G_VP
	| G_Cl
	| G_RCl
	| G_S
	| G_RS
	| G_Utt
	| G_Conj
	| G_ListNP;

/**
 * Get leaf text ignoring movement.
 */
function leafText(leaf: StrictTree): string {
	return actualLeafText({ ...leaf, movement: undefined });
}

/**
 * Convert a Toaq pronoun DP to a GF pronoun.
 */
function pronounToGf(leaf: Leaf): G_Pron {
	assertLabel(leaf, 'DP');
	switch (leafText(leaf)) {
		case 'jí':
			return 'i_Pron';
		case 'íme':
		case 'áma':
		case 'úmo':
			return 'we_Pron';
		case 'súq':
			return 'youSg_Pron';
		case 'súna':
			return 'youPl_Pron';
		case 'nháo':
		case 'hó':
			return 'she_Pron';
		case 'nhána':
			return 'they_Pron';
		default:
			return 'it_Pron';
	}
}

/**
 * Convert a Toaq polarity Σ to a GF polarity.
 */
function polarityToGf(tree: StrictTree): G_Pol {
	assertLabel(tree, 'Σ');
	switch (leafText(tree)) {
		case 'bu':
		case 'aımu':
			return 'PNeg';
		default:
			return 'PPos';
	}
}

/**
 * Convert a Toaq tense T to a GF tense.
 */
function tenseToGf(tree: StrictTree): G_Tense {
	assertLabel(tree, 'T');
	switch (leafText(tree)) {
		case 'pu':
			return 'TPast';
		case 'jıa':
			return 'TFut';
		// TODO: mala
		default:
			return 'TPres';
	}
}

/**
 * Convert a Toaq aspect Asp to a GF anteriority.
 */
function aspectToGf(tree: StrictTree): G_Ant {
	assertLabel(tree, 'Asp');
	switch (leafText(tree)) {
		case '':
		case 'chum':
			return 'ASimul';
		case 'tam':
		default:
			return 'AAnter';
		// TODO: fancy aspects
	}
}

/**
 * Is this Temp the default tense/aspect?
 */
function isDefaultTemp(temp: G_Temp): boolean {
	return temp[1] === 'TPres' && temp[2] === 'ASimul';
}

/**
 * If the given RS looks like "such that it is an apple", extract the CN "apple".
 */
function simplifyRsToCn(rs: G_RS): G_CN | undefined {
	if (rs[0] === 'UseRCl' && isDefaultTemp(rs[1]) && rs[2] === 'PPos') {
		const rcl = rs[3];
		const cl = rcl[1];
		if (cl[0] === 'PredVP') {
			const vp = cl[2];
			if (vp[0] === 'UseComp') {
				const comp = vp[1];
				if (comp[0] === 'CompCN') return comp[1];
			}
		}
	}
}

/**
 * Convert a Toaq 𝘯P to a GF CN (common noun).
 */
function npToGf(tree: StrictTree): G_CN {
	assertBranch(tree);
	assertLabel(tree, '𝘯P');
	const rs = relativeCpToGf(tree.right);
	return simplifyRsToCn(rs) ?? ['RelCN', ['UseN', 'person_N'], rs];
}

/**
 * Convert a Toaq D (determiner) to a GF Det.
 */
function dToGf(tree: StrictTree): G_Det {
	const text = leafText(tree);
	switch (text) {
		case 'sá':
			return ['DetQuant', 'IndefArt', 'NumSg'];
		case 'báq':
			return ['DetQuant', 'IndefArt', 'NumPl'];
		case 'tú':
			return 'every_Det';
		case 'hú':
			return ['DetQuant', 'that_Quant', 'NumSg'];
		case 'ní':
			return ['DetQuant', 'this_Quant', 'NumSg'];
		case 'ké':
		case 'ló':
		case '◌́':
			return ['DetQuant', 'DefArt', 'NumSg'];

		default:
			throw new Unimplemented('dToGf: ' + text);
	}
}

/**
 * Convert a Toaq & (conjunction) to a GF Conj.
 */
function conjToGf(tree: StrictTree): G_Conj {
	const text = leafText(tree);
	switch (text) {
		case 'rú':
		case 'róı':
			return 'and_Conj';
		case 'ró':
		case 'rá':
			return 'or_Conj';
		default:
			throw new Unimplemented('conjToGf: ' + text);
	}
}

/**
 * Convert a Toaq DP (determiner phrase) to a GF NP (noun phrase).
 */
function dpToGf(tree: StrictTree): G_NP {
	if (tree.label === '&P') {
		assertBranch(tree);
		assertLabel(tree.left, 'DP');
		assertBranch(tree.right);
		assertLabel(tree.right, "&'");
		assertLabel(tree.right.left, '&');
		assertLabel(tree.right.right, 'DP');
		const np1 = dpToGf(tree.left);
		const conj = conjToGf(tree.right.left);
		const np2 = dpToGf(tree.right.right);
		return ['ConjNP', conj, ['BaseNP', np1, np2]];
	}
	assertLabel(tree, 'DP');
	if ('word' in tree) {
		return ['UsePron', pronounToGf(tree)];
	} else {
		const d = tree.left;
		const complement = tree.right as Branch<StrictTree>;
		if (complement.label === '𝘯P') {
			const cn = npToGf(complement);
			return ['DetCN', dToGf(tree.left), cn];
		} else if (complement.label === 'CP') {
			const s = declarativeCpToGf(complement);
			// uhh
			throw new Unimplemented(
				'Unrecognized DP complement: ' + complement.label,
			);
		} else {
			throw new Unimplemented(
				'Unrecognized DP complement: ' + complement.label,
			);
		}
	}
}

/**
 * Convert a Toaq nullary verb to a GF VP (verb phrase).
 */
function v0ToGf(tree: StrictTree): G_VP {
	const text = baseForm(leafText(tree));
	const verb = lexicon.V0.get(text);
	if (verb) return ['UseV', verb];
	throw new Unimplemented('Unknown V0: ' + text);
}

/**
 * Convert a Toaq intransitive verb to a GF VP (verb phrase). This may introduce a copula.
 */
function vToGf(tree: StrictTree): G_VP {
	const text = baseForm(leafText(tree));
	const verb = lexicon.V.get(text);
	if (verb) return ['UseV', verb];
	const noun = lexicon.N.get(text);
	if (noun) return ['UseComp', ['CompCN', ['UseN', noun]]];
	const adj = lexicon.A.get(text);
	if (adj) return ['UseComp', ['CompAP', ['PositA', adj]]];

	throw new Unimplemented('Unknown V: ' + text);
}

/**
 * Convert a Toaq transitive verb and object to a GF VP (verb phrase).
 */
function v2ToGf(tree: StrictTree, object: G_NP): G_VP {
	assertLabel(tree, 'V');
	const text = baseForm(leafText(tree));
	const verb = lexicon.V2.get(text);
	if (verb) return ['ComplSlash', ['SlashV2a', verb], object];
	throw new Unimplemented('Unknown V2: ' + text);
}

/**
 * Convert a Toaq ditransitive verb and objects to a GF VP (verb phrase).
 */
function v3ToGf(tree: StrictTree, IO: G_NP, DO: G_NP): G_VP {
	assertLabel(tree, 'V');
	const text = baseForm(leafText(tree));
	const verb = lexicon.V3.get(text);
	if (verb) return ['ComplSlash', ['Slash2V3', verb, IO], DO];
	throw new Unimplemented('Unknown V3: ' + text);
}

/**
 * Convert a Toaq 𝘷P to a GF Cl (clause without tense).
 */
function vpToGf(tree: StrictTree): G_Cl {
	assertBranch(tree);
	assertLabel(tree, '𝘷P');
	if (tree.left.label === '𝘷') {
		// Intransitive case
		const VP = tree.right;
		assertLabel(VP, 'VP');
		if ('right' in VP) {
			assertLabel(VP.left, 'V');
			assertLabel(VP.right, 'DP');
			const gvp: G_VP = vToGf(VP.left);
			const subject = dpToGf(VP.right);
			return ['PredVP', subject, gvp];
		} else {
			const gvp: G_VP = v0ToGf(VP);
			return ['ImpersCl', gvp];
		}
	} else {
		const subject = dpToGf(tree.left);
		const vbar = tree.right;
		assertBranch(vbar);
		assertLabel(vbar, "𝘷'");
		const v = vbar.left;
		assertLabel(v, '𝘷');
		const VP = vbar.right;
		assertLabel(VP, 'VP');
		if ('right' in VP) {
			if (VP.right.label === "V'") {
				const IO = dpToGf(VP.left);
				const Vbar = VP.right;
				assertBranch(Vbar);
				const V = Vbar.left;
				const DO = dpToGf(Vbar.right);
				const gvp: G_VP = v3ToGf(V, IO, DO);
				return ['PredVP', subject, gvp];
			} else {
				const object = dpToGf(VP.right);
				const gvp: G_VP = v2ToGf(VP.left, object);
				return ['PredVP', subject, gvp];
			}
		} else {
			const gvp: G_VP = vToGf(VP);
			return ['PredVP', subject, gvp];
		}
	}
}

/**
 * Convert a declarative AspP to an S. This sets a default tense and polarity
 * which is overwritten higher up in the call stack.
 */
function declarativeAsppToGf(tree: StrictTree): G_S {
	assertBranch(tree);
	assertLabel(tree, 'AspP');
	const cl = vpToGf(tree.right);
	return ['UseCl', ['TTAnt', 'TPres', aspectToGf(tree.left)], 'PPos', cl];
}

/**
 * Convert a declarative TP to an S.
 */
function declarativeTpToGf(tree: StrictTree): G_S {
	assertBranch(tree);
	assertLabel(tree, 'TP');
	const s = declarativeAsppToGf(tree.right);
	s[1][1] = tenseToGf(tree.left);
	return s;
}

/**
 * Convert a declarative ΣP to an S.
 */
function declarativeΣpToGf(tree: StrictTree): G_S {
	assertBranch(tree);
	assertLabel(tree, 'ΣP');
	while (tree.left.label === 'QP' || tree.left.label === '&QP') {
		tree = tree.right;
		assertBranch(tree);
		assertLabel(tree, 'ΣP');
	}
	const s = declarativeTpToGf(tree.right);
	s[2] = polarityToGf(tree.left);
	return s;
}

/**
 * Convert a declarative CP to an S.
 */
function declarativeCpToGf(tree: StrictTree): G_S {
	assertBranch(tree);
	assertLabel(tree, 'CP');
	return declarativeΣpToGf(tree.right);
}

/**
 * Convert a relative AspP to an RS. This sets a default tense and polarity
 * which is overwritten higher up in the call stack.
 */
function relativeAsppToGf(tree: StrictTree): G_RS {
	assertBranch(tree);
	assertLabel(tree, 'AspP');
	const cl = vpToGf(tree.right);
	const rcl: G_RCl = ['RelCl', cl];
	return ['UseRCl', ['TTAnt', 'TPres', aspectToGf(tree.left)], 'PPos', rcl];
}

/**
 * Convert a relative TP to an RS.
 */
function relativeTpToGf(tree: StrictTree): G_RS {
	assertBranch(tree);
	assertLabel(tree, 'TP');
	const rs = relativeAsppToGf(tree.right);
	rs[1][1] = tenseToGf(tree.left);
	return rs;
}

/**
 * Convert a relative ΣP to an RS.
 */
function relativeΣpToGf(tree: StrictTree): G_RS {
	assertBranch(tree);
	assertLabel(tree, 'ΣP');
	while (tree.left.label === 'QP' || tree.left.label === '&QP') {
		tree = tree.right;
		assertBranch(tree);
		assertLabel(tree, 'ΣP');
	}
	const rs = relativeTpToGf(tree.right);
	rs[2] = polarityToGf(tree.left);
	return rs;
}

/**
 * Convert a relative CP to an RS.
 */
function relativeCpToGf(tree: StrictTree): G_RS {
	assertBranch(tree);
	assertLabel(tree, 'CPrel');
	return relativeΣpToGf(tree.right);
}

/**
 * Convert a Toaq SAP (speech act phrase) to a GF "utterance."
 */
function sapToGf(tree: StrictTree): G_Utt {
	assertBranch(tree);
	const sa = tree.right;
	const cp = tree.left;
	if (leafText(sa) === 'da' || leafText(sa) === '') {
		return ['UttS', declarativeCpToGf(cp)];
	} else {
		throw new Unimplemented('sapToGf: ' + leafText(sa));
	}
}

/**
 * Convert any Toaq syntax sub-tree to the appropriate GF expression.
 */
export function treeToGf(tree: StrictTree): Gf {
	if (tree.label === 'DP') {
		return dpToGf(tree);
	} else if (tree.label === 'SAP') {
		return sapToGf(tree);
	} else {
		throw new Unimplemented('treeToGf');
	}
}

/**
 * Format any GF expression into a parenthesized string.
 *
 * The result can be tested on
 * <https://cloud.grammaticalframework.org/syntax-editor/editor.html>
 * or submitted to
 * <https://cloud.grammaticalframework.org/grammars/LibraryBrowser.pgf?command=linearize&tree=result+goes+here>
 */
export function showGf(gf: Gf | string): string {
	return typeof gf === 'string' ? gf : '(' + gf.map(showGf).join(' ') + ')';
}
