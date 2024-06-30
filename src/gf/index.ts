import { Impossible, Unimplemented } from '../core/error';
import { baseForm } from '../morphology/tokenize';
import {
	type Branch,
	type Leaf,
	type StrictTree,
	assertBranch,
	assertLabel,
} from '../tree';
import { leafText as actualLeafText } from '../tree';
import type { G_A, G_N, G_PN, G_V, G_V2, G_V2S, G_V3, G_VS } from './lexicon';
import lexicon from './lexicon';

type G_Quant = 'IndefArt' | 'DefArt' | 'that_Quant' | 'this_Quant';
type G_Num = 'NumSg' | 'NumPl';
type G_Tense = 'TPres' | 'TPast' | 'TFut' | 'TCond';
type G_Ant = 'ASimul' | 'AAnter';
type G_Pol = 'PPos' | 'PNeg';
type G_Det = ['DetQuant', G_Quant, G_Num] | `${string}_Det`;
type G_Pron = `${string}_Pron`;
type G_CN = ['UseN', G_N] | ['RelCN', G_CN, G_RS];
type G_NP =
	| ['UsePron', G_Pron]
	| ['UsePN', G_PN]
	| ['DetCN', G_Det, G_CN]
	| ['ConjNP', G_Conj, G_ListNP]
	| ['RConjNP', G_Conj, G_NP, G_NP];
type G_Temp = ['TTAnt', G_Tense, G_Ant];
type G_AP = ['PositA', G_A];
type G_Comp = ['CompCN', G_CN] | ['CompAP', G_AP];
type G_VPSlash =
	| ['SlashV2a', G_V2]
	| ['Slash2V3', G_V3, G_NP]
	| ['SlashV2S', G_V2S, G_S];
type G_VP =
	| ['UseV', G_V]
	| ['UseComp', G_Comp]
	| G_Comp
	| ['ComplSlash', G_VPSlash, G_NP]
	| ['ComplVS', G_VS, G_S];
type G_Cl =
	| ['PredVP', G_NP, G_VP]
	| ['PredSCVP', G_SC, G_VP]
	| ['ImpersCl', G_VP];
type G_RCl = ['RelCl', G_Cl];
type G_S = ['UseCl', G_Temp, G_Pol, G_Cl] | ['RConjS', G_Conj, G_S, G_S];
type G_RS = ['UseRCl', G_Temp, G_Pol, G_RCl];
type G_Utt = ['UttS', G_S];
type G_Conj = 'and_Conj' | 'or_Conj';
type G_ListNP = ['BaseNP', G_NP, G_NP] | ['ConsNP', G_NP, G_ListNP];
type G_SC = ['EmbedS', G_S] | ['EmbedVP', G_VP];

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
	| G_ListNP
	| G_SC;

/**
 * Get leaf text ignoring movement.
 */
function leafText(leaf: StrictTree): string {
	return actualLeafText({ ...leaf, movement: undefined });
}

/**
 * Is this Temp the default tense/aspect?
 */
function isDefaultTemp(temp: G_Temp): boolean {
	return temp[1] === 'TPres' && temp[2] === 'ASimul';
}

export enum GfTarget {
	/**
	 * Target "ResourceDemo.pgf", which contains more languages but only a subset of the supported grammar.
	 */
	ResourceDemo = 0,

	/**
	 * Target "LibraryBrowser.pgf", which contains the full RGF grammar but only supports a few languages.
	 */
	LibraryBrowser = 1,
}

export class GfTranslator {
	constructor(public target: GfTarget) {}

	/**
	 * Convert a Toaq pronoun DP to a GF pronoun.
	 */
	private pronounToGf(leaf: Leaf): G_Pron {
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
	private polarityToGf(tree: StrictTree): G_Pol {
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
	private tenseToGf(tree: StrictTree): G_Tense {
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
	private aspectToGf(tree: StrictTree): G_Ant {
		assertLabel(tree, 'Asp');
		switch (leafText(tree)) {
			case '':
			case 'chum':
				return 'ASimul';
			default:
				return 'AAnter';
			// TODO: fancy aspects
		}
	}

	/**
	 * If the given RS looks like "such that it is an apple", extract the CN "apple".
	 */
	private simplifyRsToCn(rs: G_RS): G_CN | undefined {
		if (rs[0] === 'UseRCl' && isDefaultTemp(rs[1]) && rs[2] === 'PPos') {
			const rcl = rs[3];
			const cl = rcl[1];
			if (cl[0] === 'PredVP') {
				const vp = cl[2];
				if (vp[0] === 'UseComp') {
					const comp = vp[1];
					if (comp[0] === 'CompCN') return comp[1];
				}
				if (vp[0] === 'CompCN') {
					return vp[1];
				}
			}
		}
	}

	/**
	 * Convert a Toaq 𝘯P to a GF CN (common noun).
	 */
	private npToGf(tree: StrictTree): G_CN {
		assertBranch(tree);
		assertLabel(tree, '𝘯P');
		const rs = this.relativeCpToGf(tree.right);
		return this.simplifyRsToCn(rs) ?? ['RelCN', ['UseN', 'person_N'], rs];
	}

	/**
	 * Convert a Toaq D (determiner) to a GF Det.
	 */
	private dToGf(tree: StrictTree): G_Det {
		const text = leafText(tree);
		switch (text) {
			case 'sá':
				return 'a_Det'; // ['DetQuant', 'IndefArt', 'NumSg'];
			case 'báq':
				return 'aPl_Det'; // ['DetQuant', 'IndefArt', 'NumPl'];
			case 'tú':
				return 'every_Det';
			case 'hú':
				return 'that_Det'; // ['DetQuant', 'that_Quant', 'NumSg'];
			case 'ní':
				return 'this_Det'; // ['DetQuant', 'this_Quant', 'NumSg'];
			case 'ké':
			case 'ló':
			case '◌́':
				return 'the_Det'; // ['DetQuant', 'DefArt', 'NumSg'];

			default:
				throw new Unimplemented(`dToGf: ${text}`);
		}
	}

	/**
	 * Convert a Toaq & (conjunction) to a GF Conj.
	 */
	private conjToGf(tree: StrictTree): G_Conj {
		const text = leafText(tree);
		switch (text) {
			case 'rú':
			case 'róı':
				return 'and_Conj';
			case 'ró':
			case 'rá':
				return 'or_Conj';
			default:
				throw new Unimplemented(`conjToGf: ${text}`);
		}
	}

	/**
	 * Is this NP-or-SC an SC?
	 */
	private isSc(x: G_NP | G_SC): x is G_SC {
		return x[0] === 'EmbedS' || x[0] === 'EmbedVP';
	}

	/**
	 * Convert a Toaq DP (determiner phrase) to a GF NP (noun phrase) or SC
	 * (embedded sentence).
	 */
	private dpToGf(tree: StrictTree): G_NP | G_SC {
		if (tree.label === '&P') {
			assertBranch(tree);
			assertLabel(tree.left, 'DP');
			assertBranch(tree.right);
			assertLabel(tree.right, "&'");
			assertLabel(tree.right.left, '&');
			const np1 = this.dpToGf(tree.left);
			const conj = this.conjToGf(tree.right.left);
			const np2 = this.dpToGf(tree.right.right);
			if (this.isSc(np1) || this.isSc(np2)) {
				throw new Unimplemented('CP&CP');
			}
			// return ['ConjNP', conj, ['BaseNP', np1, np2]];
			return ['RConjNP', conj, np1, np2];
		}
		assertLabel(tree, 'DP');
		if ('word' in tree) {
			return ['UsePron', this.pronounToGf(tree)];
		}
		const _d = tree.left;
		const complement = tree.right as Branch<StrictTree>;
		if (complement.label === '𝘯P') {
			const cn = this.npToGf(complement);
			return ['DetCN', this.dToGf(tree.left), cn];
		}
		if (complement.label === 'CP') {
			const s = this.declarativeCpToGf(complement);
			return ['EmbedS', s];
		}
		throw new Unimplemented(`Unrecognized DP complement: ${complement.label}`);
	}

	/**
	 * Convert a Toaq nullary verb to a GF VP (verb phrase).
	 */
	private v0ToGf(tree: StrictTree): G_VP {
		const text = baseForm(leafText(tree));
		const verb = lexicon.V0.get(text);
		if (verb) return ['UseV', verb];
		throw new Unimplemented(`Unknown V0: ${text}`);
	}

	/**
	 * Convert a Toaq intransitive verb to a GF VP (verb phrase). This may introduce a copula.
	 */
	private vToGf(tree: StrictTree): G_VP {
		const text = baseForm(leafText(tree));
		const verb = lexicon.V.get(text);

		const useComp = (x: G_Comp): G_VP =>
			this.target === GfTarget.ResourceDemo ? x : ['UseComp', x];

		if (verb) return ['UseV', verb];
		const noun = lexicon.N.get(text);
		if (noun) return useComp(['CompCN', ['UseN', noun]]);
		const adj = lexicon.A.get(text);
		if (adj) return useComp(['CompAP', ['PositA', adj]]);

		throw new Unimplemented(`Unknown V: ${text}`);
	}

	/**
	 * Convert a Toaq (c 0) verb ("VS") to a GF VP.
	 */
	private vsToGf(tree: StrictTree, object: G_SC): G_VP {
		assertLabel(tree, 'V');
		const text = baseForm(leafText(tree));
		const verb = lexicon.VS.get(text);
		if (object[0] === 'EmbedS') {
			if (verb) return ['ComplVS', verb, object[1]];
		}
		throw new Unimplemented(`Unknown VS: ${text}`);
	}

	/**
	 * Convert a Toaq (c c 0) verb ("V2S") to a GF VP.
	 */
	private v2sToGf(tree: StrictTree, IO: G_NP, DO: G_SC): G_VP {
		assertLabel(tree, 'V');
		const text = baseForm(leafText(tree));
		const verb = lexicon.V2S.get(text);
		if (DO[0] === 'EmbedS') {
			if (verb) return ['ComplSlash', ['SlashV2S', verb, DO[1]], IO];
		}
		throw new Unimplemented(`Unknown VS: ${text}`);
	}

	/**
	 * Convert a Toaq transitive verb and object to a GF VP (verb phrase).
	 */
	private v2ToGf(tree: StrictTree, object: G_NP): G_VP {
		assertLabel(tree, 'V');
		const text = baseForm(leafText(tree));
		const verb = lexicon.V2.get(text);
		if (verb) return ['ComplSlash', ['SlashV2a', verb], object];
		throw new Unimplemented(`Unknown V2: ${text}`);
	}

	/**
	 * Convert a Toaq ditransitive verb and objects to a GF VP (verb phrase).
	 */
	private v3ToGf(tree: StrictTree, IO: G_NP, DO: G_NP): G_VP {
		assertLabel(tree, 'V');
		const text = baseForm(leafText(tree));
		const verb = lexicon.V3.get(text);
		if (verb) return ['ComplSlash', ['Slash2V3', verb, IO], DO];
		throw new Unimplemented(`Unknown V3: ${text}`);
	}

	/**
	 * Convert a Toaq 𝘷P to a GF Cl (clause without tense).
	 */
	private vpToGf(tree: StrictTree): G_Cl {
		assertBranch(tree);
		assertLabel(tree, '𝘷P');
		if (tree.left.label === '𝘷') {
			const VP = tree.right;
			assertLabel(VP, 'VP');
			if ('right' in VP) {
				// intransitive like "nuo" or "gı" or "poq"
				assertLabel(VP.left, 'V');
				// assertLabel(VP.right, 'DP');
				const gvp: G_VP = this.vToGf(VP.left);
				const subject = this.dpToGf(VP.right);
				if (this.isSc(subject)) {
					return ['PredSCVP', subject, gvp];
				}
				return ['PredVP', subject, gvp];
			}
			// nullary like "ruqshua"
			const gvp: G_VP = this.v0ToGf(VP);
			return ['ImpersCl', gvp];
		}
		const subject = this.dpToGf(tree.left);
		const vbar = tree.right;
		assertBranch(vbar);
		assertLabel(vbar, "𝘷'");
		const v = vbar.left;
		assertLabel(v, '𝘷');
		const VP = vbar.right;
		assertLabel(VP, 'VP');
		if ('right' in VP) {
			if (VP.right.label === "V'") {
				// ditransitive like "do"
				const IO = this.dpToGf(VP.left);
				if (this.isSc(IO)) throw new Unimplemented('IO is SC');
				const Vbar = VP.right;
				assertBranch(Vbar);
				const V = Vbar.left;
				const DO = this.dpToGf(Vbar.right);
				const gvp: G_VP = this.isSc(DO)
					? this.v2sToGf(V, IO, DO)
					: this.v3ToGf(V, IO, DO);
				if (this.isSc(subject)) {
					return ['PredSCVP', subject, gvp];
				}
				return ['PredVP', subject, gvp];
			}
			// transitive like "chuq"
			const object = this.dpToGf(VP.right);
			const gvp: G_VP = this.isSc(object)
				? this.vsToGf(VP.left, object)
				: this.v2ToGf(VP.left, object);
			if (this.isSc(subject)) {
				return ['PredSCVP', subject, gvp];
			}
			return ['PredVP', subject, gvp];
		}
		// agentive intransitive like "koı"
		const gvp: G_VP = this.vToGf(VP);
		if (this.isSc(subject)) {
			return ['PredSCVP', subject, gvp];
		}
		return ['PredVP', subject, gvp];
	}

	/**
	 * Convert a declarative AspP to an S. This sets a default tense and polarity
	 * which is overwritten higher up in the call stack.
	 */
	private declarativeAsppToGf(tree: StrictTree): G_S {
		assertBranch(tree);
		assertLabel(tree, 'AspP');
		const cl = this.vpToGf(tree.right);
		return [
			'UseCl',
			['TTAnt', 'TPres', this.aspectToGf(tree.left)],
			'PPos',
			cl,
		];
	}

	/**
	 * Convert a declarative TP to an S.
	 */
	private declarativeTpToGf(tree: StrictTree): G_S {
		assertBranch(tree);
		assertLabel(tree, 'TP');
		const s = this.declarativeAsppToGf(tree.right);
		if (s[0] === 'RConjS') throw new Impossible();
		s[1][1] = this.tenseToGf(tree.left);
		return s;
	}

	/**
	 * Convert a declarative ΣP to an S.
	 */
	private declarativeΣpToGf(tree: StrictTree): G_S {
		assertBranch(tree);
		if (tree.label === '&P') {
			assertBranch(tree);
			assertLabel(tree.left, 'ΣP');
			assertBranch(tree.right);
			assertLabel(tree.right, "&'");
			assertLabel(tree.right.left, '&');
			const s1 = this.declarativeΣpToGf(tree.left);
			const conj = this.conjToGf(tree.right.left);
			const s2 = this.declarativeΣpToGf(tree.right.right);
			return ['RConjS', conj, s1, s2];
		}

		assertLabel(tree, 'ΣP');
		while (tree.left.label === 'QP' || tree.left.label === '&QP') {
			tree = tree.right;
			assertBranch(tree);
			assertLabel(tree, 'ΣP');
		}
		const s = this.declarativeTpToGf(tree.right);
		s[2] = this.polarityToGf(tree.left);
		return s;
	}

	/**
	 * Convert a declarative CP to an S.
	 */
	private declarativeCpToGf(tree: StrictTree): G_S {
		assertBranch(tree);
		assertLabel(tree, 'CP');
		return this.declarativeΣpToGf(tree.right);
	}

	/**
	 * Convert a relative AspP to an RS. This sets a default tense and polarity
	 * which is overwritten higher up in the call stack.
	 */
	private relativeAsppToGf(tree: StrictTree): G_RS {
		assertBranch(tree);
		assertLabel(tree, 'AspP');
		const cl = this.vpToGf(tree.right);
		const rcl: G_RCl = ['RelCl', cl];
		return [
			'UseRCl',
			['TTAnt', 'TPres', this.aspectToGf(tree.left)],
			'PPos',
			rcl,
		];
	}

	/**
	 * Convert a relative TP to an RS.
	 */
	private relativeTpToGf(tree: StrictTree): G_RS {
		assertBranch(tree);
		assertLabel(tree, 'TP');
		const rs = this.relativeAsppToGf(tree.right);
		rs[1][1] = this.tenseToGf(tree.left);
		return rs;
	}

	/**
	 * Convert a relative ΣP to an RS.
	 */
	private relativeΣpToGf(tree: StrictTree): G_RS {
		assertBranch(tree);
		assertLabel(tree, 'ΣP');
		while (tree.left.label === 'QP' || tree.left.label === '&QP') {
			tree = tree.right;
			assertBranch(tree);
			assertLabel(tree, 'ΣP');
		}
		const rs = this.relativeTpToGf(tree.right);
		rs[2] = this.polarityToGf(tree.left);
		return rs;
	}

	/**
	 * Convert a relative CP to an RS.
	 */
	private relativeCpToGf(tree: StrictTree): G_RS {
		assertBranch(tree);
		assertLabel(tree, 'CPrel');
		return this.relativeΣpToGf(tree.right);
	}

	/**
	 * Convert a Toaq SAP (speech act phrase) to a GF "utterance."
	 */
	private sapToGf(tree: StrictTree): G_Utt {
		assertBranch(tree);
		const sa = tree.right;
		const cp = tree.left;
		if (leafText(sa) === 'da' || leafText(sa) === '') {
			return ['UttS', this.declarativeCpToGf(cp)];
		}
		throw new Unimplemented(`sapToGf: ${leafText(sa)}`);
	}

	/**
	 * Convert any Toaq syntax sub-tree to the appropriate GF expression.
	 */
	public treeToGf(tree: StrictTree): Gf {
		if (tree.label === 'DP') {
			return this.dpToGf(tree);
		}
		if (tree.label === 'SAP') {
			return this.sapToGf(tree);
		}
		if (tree.label === 'CP') {
			return this.declarativeCpToGf(tree);
		}
		throw new Unimplemented('treeToGf');
	}

	/**
	 * Format any GF expression into a parenthesized string.
	 *
	 * The result can be tested on
	 * <https://cloud.grammaticalframework.org/syntax-editor/editor.html>
	 * or submitted to
	 * <https://cloud.grammaticalframework.org/grammars/ResourceDemo.pgf?command=linearize&tree=result+goes+here>
	 */
	public showGf(gf: Gf | string): string {
		return typeof gf === 'string'
			? gf
			: `(${gf.map(x => this.showGf(x)).join(' ')})`;
	}
}
