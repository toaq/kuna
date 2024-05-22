import { Unimplemented } from '../core/error';
import { baseForm } from '../morphology/tokenize';
import { Branch, Leaf, StrictTree, assertBranch, assertLabel } from '../tree';
import { leafText as actualLeafText } from '../tree';
import { G_N, G_PN, G_V, G_V2 } from './lexicon';
import lexicon from './lexicon';

type G_Quant = 'IndefArt' | 'DefArt';
type G_Num = 'NumSg' | 'NumPl';
type G_Tense = 'TPres' | 'TPast' | 'TFut' | 'TCond';
type G_Ant = 'ASimul' | 'AAnter';
type G_Pol = 'PPos' | 'PNeg';
type G_Det = ['DetQuant', G_Quant, G_Num];
type G_Pron = 'i_Pron' | 'you_Pron' | 'she_Pron' | 'it_Pron';
type G_CN = ['UseN', G_N] | ['RelCN', G_CN, G_RS];
type G_NP = ['UsePron', G_Pron] | ['UsePN', G_PN] | ['DetCN', G_Det, G_CN];
type G_Temp = ['TTAnt', G_Tense, G_Ant];
type G_Comp = ['CompCN', G_CN];
type G_VPSlash = ['SlashV2a', G_V2];
type G_VP =
	| ['UseV', G_V]
	| ['UseComp', G_Comp]
	| ['ComplSlash', G_VPSlash, G_NP];
type G_Cl = ['PredVP', G_NP, G_VP];
type G_RCl = ['RelCl', G_Cl];
type Tensed<Ctor, Cl> = [Ctor, G_Temp, G_Pol, Cl];
type G_S = Tensed<'UseCl', G_Cl>;
type G_RS = Tensed<'UseRCl', G_RCl>;
type G_Utt = ['UttS', G_S];

type Gf = G_NP | G_Utt;

function leafText(leaf: StrictTree): string {
	return actualLeafText({ ...leaf, movement: undefined });
}

function pronounToGf(leaf: Leaf): G_Pron {
	switch (leafText(leaf)) {
		case 'jí':
			return 'i_Pron';
		case 'súq':
			return 'you_Pron';
		default:
			return 'it_Pron';
	}
}

function isDefaultTemp(temp: G_Temp): boolean {
	return temp[1] === 'TPres' && temp[2] === 'ASimul';
}

function simplifyRsToCn(rs: G_RS): G_CN | undefined {
	if (rs[0] === 'UseRCl' && isDefaultTemp(rs[1]) && rs[2] === 'PPos') {
		const rcl = rs[3];
		const cl = rcl[1];
		const vp = cl[2];
		if (vp[0] === 'UseComp') {
			return vp[1][1];
		}
	}
}

function npToGf(tree: StrictTree): G_CN {
	assertBranch(tree);
	assertLabel(tree, '𝘯P');
	const rs = relativeCpToGf(tree.right);
	return simplifyRsToCn(rs) ?? ['RelCN', ['UseN', 'person_N'], rs];
}

function dToGf(tree: StrictTree): G_Det {
	const text = leafText(tree);
	switch (text) {
		case 'sá':
			return ['DetQuant', 'IndefArt', 'NumSg'];
		case '◌́':
			return ['DetQuant', 'DefArt', 'NumSg'];

		default:
			throw new Unimplemented('dToGf: ' + text);
	}
}

function dpToGf(tree: StrictTree): G_NP {
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

function vToGf(tree: StrictTree): G_VP {
	assertLabel(tree, 'V');
	const text = baseForm(leafText(tree));
	const verb = lexicon.V.get(text);
	if (verb) return ['UseV', verb];
	const noun = lexicon.N.get(text);
	if (noun) return ['UseComp', ['CompCN', ['UseN', noun]]];
	throw new Unimplemented('Unknown V: ' + text);
}

function v2ToGf(tree: StrictTree, object: G_NP): G_VP {
	assertLabel(tree, 'V');
	const text = baseForm(leafText(tree));
	const verb = lexicon.V2.get(text);
	if (verb) return ['ComplSlash', ['SlashV2a', verb], object];
	throw new Unimplemented('Unknown V2: ' + text);
}

function vpToGf(tree: StrictTree): G_Cl {
	assertBranch(tree);
	assertLabel(tree, '𝘷P');
	if (tree.left.label === '𝘷') {
		const VP = tree.right;
		assertBranch(VP);
		assertLabel(VP, 'VP');
		assertLabel(VP.left, 'V');
		assertLabel(VP.right, 'DP');
		const gvp: G_VP = vToGf(VP.left);
		const subject = dpToGf(VP.right);
		return ['PredVP', subject, gvp];
	} else {
		const subject = dpToGf(tree.left);
		const vbar = tree.right;
		assertBranch(vbar);
		assertLabel(vbar, "𝘷'");
		const v = vbar.left;
		assertLabel(v, '𝘷');
		const VP = vbar.right;
		assertBranch(VP);
		assertLabel(VP, 'VP');
		const object = dpToGf(VP.right);
		const gvp: G_VP = v2ToGf(VP.left, object);
		return ['PredVP', subject, gvp];
	}
}

function declarativeAsppToGf(tree: StrictTree): G_S {
	assertBranch(tree);
	assertLabel(tree, 'AspP');
	const cl = vpToGf(tree.right);
	return ['UseCl', ['TTAnt', 'TPres', 'ASimul'], 'PPos', cl];
}

function declarativeTpToGf(tree: StrictTree): G_S {
	assertBranch(tree);
	assertLabel(tree, 'TP');
	return declarativeAsppToGf(tree.right);
}

function declarativeΣpToGf(tree: StrictTree): G_S {
	assertBranch(tree);
	assertLabel(tree, 'ΣP');
	return declarativeTpToGf(tree.right);
}

function declarativeCpToGf(tree: StrictTree): G_S {
	assertBranch(tree);
	assertLabel(tree, 'CP');
	return declarativeΣpToGf(tree.right);
}

function relativeAsppToGf(tree: StrictTree): G_RS {
	assertBranch(tree);
	assertLabel(tree, 'AspP');
	const cl = vpToGf(tree.right);
	const rcl: G_RCl = ['RelCl', cl];
	return ['UseRCl', ['TTAnt', 'TPres', 'ASimul'], 'PPos', rcl];
}

function relativeTpToGf(tree: StrictTree): G_RS {
	assertBranch(tree);
	assertLabel(tree, 'TP');
	return relativeAsppToGf(tree.right);
}

function relativeΣpToGf(tree: StrictTree): G_RS {
	assertBranch(tree);
	assertLabel(tree, 'ΣP');
	return relativeTpToGf(tree.right);
}

function relativeCpToGf(tree: StrictTree): G_RS {
	assertBranch(tree);
	assertLabel(tree, 'CPrel');
	return relativeΣpToGf(tree.right);
}

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

export function treeToGf(tree: StrictTree): Gf {
	if (tree.label === 'DP') {
		return dpToGf(tree);
	} else if (tree.label === 'SAP') {
		return sapToGf(tree);
	} else {
		throw new Unimplemented('treeToGf');
	}
}

export function showGf(gf: any): string {
	return typeof gf === 'string' ? gf : '(' + gf.map(showGf).join(' ') + ')';
}
