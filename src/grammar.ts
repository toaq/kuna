// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var pronoun: any;
declare var incorporated_pronoun: any;
declare var preposition: any;
declare var conjunction: any;
declare var conjunction_in_t1: any;
declare var conjunction_in_t4: any;
declare var aspect: any;
declare var prefix_aspect: any;
declare var topic_marker: any;
declare var complementizer: any;
declare var subordinating_complementizer: any;
declare var incorporated_complementizer: any;
declare var relative_clause_complementizer: any;
declare var determiner: any;
declare var incorporated_determiner: any;
declare var event_accessor: any;
declare var focus_particle: any;
declare var retroactive_cleft: any;
declare var prefix_pronoun: any;
declare var incorporated_prefix_pronoun: any;
declare var interjection: any;
declare var adjective_marker: any;
declare var name_verb: any;
declare var text_quote: any;
declare var modality: any;
declare var modality_with_complement: any;
declare var cleft_verb: any;
declare var prefix: any;
declare var focus_particle_prefix_form: any;
declare var prefix_conjunctionizer: any;
declare var prefix_conjunctionizer_in_t1: any;
declare var prefix_conjunctionizer_in_t4: any;
declare var plural_coordinator: any;
declare var illocution: any;
declare var polarity: any;
declare var word_quote: any;
declare var tense: any;
declare var prefix_tense: any;
declare var text: any;
declare var end_quote: any;
declare var predicate: any;
declare var predicatizer: any;
declare var word: any;
declare var vocative: any;
declare var start_parenthetical: any;
declare var end_parenthetical: any;

import { ToaqTokenizer } from "./tokenize";
import * as TreeModule from "./tree";

const {
	make3L,
	makeAdjunctPI,
	makeAdjunctPT,
	makeBranch,
	makeBranchCovertLeft,
	makeConn,
	makeCovertLeaf,
	makeDiscourse,
    makeEmptySerial,
	makeEvAP,
	makeEvAPdet,
	makeLeaf,
	makeOptLeaf,
	makePrefixLeaf,
	makePrefixP,
	makeRetroactiveCleft,
	makeRose,
	makeRose2,
	makeSerial,
	makeSigmaT1ModalvP,
    makeSingleChild,
	makeT1ModalvP,
	makeWord,
	makevP,
	makevPdet,
} = TreeModule as any;
const lexer = new ToaqTokenizer();

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: lexer,
  ParserRules: [
    {"name": "Fragment", "symbols": ["Free", "Fragment"], "postprocess": a => a[1]},
    {"name": "Fragment", "symbols": ["Discourse"], "postprocess": id},
    {"name": "Fragment", "symbols": ["Argument"], "postprocess": id},
    {"name": "Fragment", "symbols": ["AdjunctP1"], "postprocess": id},
    {"name": "Discourse", "symbols": ["SAP", "Discourse"], "postprocess": makeDiscourse},
    {"name": "Discourse", "symbols": ["SAP"], "postprocess": id},
    {"name": "SAP", "symbols": ["CP", "SAopt"], "postprocess": makeBranch('SAP')},
    {"name": "CP", "symbols": ["Copt", "Clause"], "postprocess": makeBranch('CP')},
    {"name": "CPsub", "symbols": ["Csub", "Clause"], "postprocess": makeBranch('CP')},
    {"name": "CPincorp", "symbols": ["Cincorp", "Clause"], "postprocess": makeBranch('CP')},
    {"name": "CPrel", "symbols": ["Crel", "Clause"], "postprocess": makeBranch('CPrel')},
    {"name": "CPrelna", "symbols": ["Clause"], "postprocess": makeBranchCovertLeft('CPrel', 'Crel')},
    {"name": "CPdet", "symbols": ["MTPdet"], "postprocess": makeBranchCovertLeft('CPrel', 'Crel')},
    {"name": "DP$ebnf$1", "symbols": []},
    {"name": "DP$ebnf$1", "symbols": ["DP$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DP", "symbols": [(lexer.has("pronoun") ? {type: "pronoun"} : pronoun), "DP$ebnf$1"], "postprocess": makeLeaf('DP')},
    {"name": "DP", "symbols": ["Hu", "Word"], "postprocess": makeBranch('DP')},
    {"name": "DP", "symbols": ["D", "nP"], "postprocess": makeBranch('DP')},
    {"name": "nP", "symbols": ["nP", "CPrel"], "postprocess": makeBranch('𝘯P')},
    {"name": "nP", "symbols": ["CPdet"], "postprocess": makeBranchCovertLeft('𝘯P', '𝘯')},
    {"name": "Clause", "symbols": ["Argument", "Bi", "Clause"], "postprocess": make3L('TopicP', "Topic'")},
    {"name": "Clause", "symbols": ["MTP"], "postprocess": id},
    {"name": "Clause", "symbols": ["Argument", "Na", "CPrelna"], "postprocess": make3L('𝘷P', "𝘷'")},
    {"name": "Clause", "symbols": ["AdjunctP1", "Na", "CPrelna"], "postprocess": make3L('𝘷P', "𝘷'")},
    {"name": "Clause", "symbols": ["ModalP", "Na", "MTP"], "postprocess": make3L('𝘷P', "𝘷'")},
    {"name": "ModalP", "symbols": ["ModalT4", "CPsub"], "postprocess": makeBranch('ModalP')},
    {"name": "Clause", "symbols": ["MTP", "Go", "Clause"], "postprocess": makeRetroactiveCleft},
    {"name": "MTP", "symbols": ["TP1"], "postprocess": id},
    {"name": "MTP", "symbols": ["Modal", "TP1"], "postprocess": makeT1ModalvP},
    {"name": "MTP", "symbols": ["Sigma", "Modal", "TP1"], "postprocess": makeSigmaT1ModalvP},
    {"name": "MTPdet", "symbols": ["TPdet"], "postprocess": id},
    {"name": "MTPdet", "symbols": ["Modal", "TPdet"], "postprocess": makeT1ModalvP},
    {"name": "MTPdet", "symbols": ["Sigma", "Modal", "TPdet"], "postprocess": makeSigmaT1ModalvP},
    {"name": "TP1", "symbols": ["TP"], "postprocess": id},
    {"name": "TP1", "symbols": ["TP", "Conjunction", "TP1"], "postprocess": makeConn},
    {"name": "TP", "symbols": ["T1", "AspP"], "postprocess": makeBranch('TP')},
    {"name": "TP", "symbols": ["Sigma", "T1", "AspP"], "postprocess": make3L('ΣP', 'TP')},
    {"name": "TP", "symbols": ["EvA", "vP", "DP1"], "postprocess": makeEvAP},
    {"name": "TPdet", "symbols": ["T1", "AspPdet"], "postprocess": makeBranch('TP')},
    {"name": "TPdet", "symbols": ["Sigma", "T1", "AspPdet"], "postprocess": make3L('ΣP', 'TP')},
    {"name": "TPdet", "symbols": ["EvA", "vP"], "postprocess": makeEvAPdet},
    {"name": "AspP", "symbols": ["Asp1", "vP"], "postprocess": makeBranch('AspP')},
    {"name": "AspPdet", "symbols": ["Asp1", "vPdet"], "postprocess": makeBranch('AspP')},
    {"name": "vP$ebnf$1", "symbols": []},
    {"name": "vP$ebnf$1", "symbols": ["vP$ebnf$1", "AdjunctP1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP$ebnf$2$subexpression$1$ebnf$1", "symbols": ["VocArgument"]},
    {"name": "vP$ebnf$2$subexpression$1$ebnf$1", "symbols": ["vP$ebnf$2$subexpression$1$ebnf$1", "VocArgument"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP$ebnf$2$subexpression$1$ebnf$2", "symbols": []},
    {"name": "vP$ebnf$2$subexpression$1$ebnf$2", "symbols": ["vP$ebnf$2$subexpression$1$ebnf$2", "AdjunctP1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP$ebnf$2$subexpression$1", "symbols": ["vP$ebnf$2$subexpression$1$ebnf$1", "vP$ebnf$2$subexpression$1$ebnf$2"]},
    {"name": "vP$ebnf$2", "symbols": ["vP$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "vP$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "vP", "symbols": ["Serial", "vP$ebnf$1", "vP$ebnf$2"], "postprocess": makevP},
    {"name": "vPdet", "symbols": ["Serialdet"], "postprocess": makevPdet},
    {"name": "AdjunctP", "symbols": ["Adjunct", "Serial", "Argument"], "postprocess": makeAdjunctPT},
    {"name": "AdjunctP", "symbols": ["Adjunct", "Serial"], "postprocess": makeAdjunctPI},
    {"name": "Serial$ebnf$1", "symbols": []},
    {"name": "Serial$ebnf$1", "symbols": ["Serial$ebnf$1", "V1orKi"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Serial", "symbols": ["Serial$ebnf$1", "Vlast"], "postprocess": makeSerial},
    {"name": "V1orKi", "symbols": ["V1"], "postprocess": id},
    {"name": "V1orKi", "symbols": ["Ki"], "postprocess": id},
    {"name": "Serialdet", "symbols": ["Serial"], "postprocess": id},
    {"name": "Serialdet", "symbols": [], "postprocess": makeEmptySerial()},
    {"name": "VPincorp", "symbols": ["V", "DPincorp"], "postprocess": makeBranch('VP')},
    {"name": "VPincorp", "symbols": ["V", "CPincorp"], "postprocess": makeBranch('VP')},
    {"name": "DPincorp$ebnf$1", "symbols": []},
    {"name": "DPincorp$ebnf$1", "symbols": ["DPincorp$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DPincorp", "symbols": [(lexer.has("incorporated_pronoun") ? {type: "incorporated_pronoun"} : incorporated_pronoun), "DPincorp$ebnf$1"], "postprocess": makeLeaf('DP')},
    {"name": "DPincorp", "symbols": ["Huincorp", "Word"], "postprocess": makeBranch('DP')},
    {"name": "DPincorp", "symbols": ["Dincorp", "nP"], "postprocess": makeBranch('DP')},
    {"name": "VPoiv", "symbols": ["Voiv", "DP1"], "postprocess": makeBranch('VP')},
    {"name": "Argument", "symbols": ["DP1"], "postprocess": id},
    {"name": "Argument", "symbols": ["CPsub1"], "postprocess": id},
    {"name": "DP1", "symbols": ["DP2"], "postprocess": id},
    {"name": "DP1", "symbols": ["DP2", "Conjunction", "DP1"], "postprocess": makeConn},
    {"name": "DP1", "symbols": ["DP2", "ConjunctionT1", "CPsub1"], "postprocess": makeConn},
    {"name": "DP2", "symbols": ["DP3"], "postprocess": id},
    {"name": "DP2", "symbols": ["Focus", "DP3"], "postprocess": makeBranch('FocusP')},
    {"name": "DP3", "symbols": ["DP"], "postprocess": id},
    {"name": "DP3", "symbols": ["DP", "Roi", "DP3"], "postprocess": makeConn},
    {"name": "CPsub1", "symbols": ["CPsub2"], "postprocess": id},
    {"name": "CPsub1", "symbols": ["Focus", "CPsub1"], "postprocess": makeBranch('FocusP')},
    {"name": "CPsub2", "symbols": ["CPsub"], "postprocess": id},
    {"name": "CPsub2", "symbols": ["CPsub", "Conjunction", "CPsub2"], "postprocess": makeConn},
    {"name": "T1", "symbols": [], "postprocess": makeCovertLeaf('T')},
    {"name": "T1", "symbols": ["T"], "postprocess": id},
    {"name": "T1", "symbols": ["T_prefix"], "postprocess": id},
    {"name": "T1", "symbols": ["T", "Conjunction", "T1"], "postprocess": makeConn},
    {"name": "Asp1", "symbols": [], "postprocess": makeCovertLeaf('Asp')},
    {"name": "Asp1", "symbols": ["Asp"], "postprocess": id},
    {"name": "Asp1", "symbols": ["Asp_prefix"], "postprocess": id},
    {"name": "Asp1", "symbols": ["Asp", "Conjunction", "Asp1"], "postprocess": makeConn},
    {"name": "AdjunctP1", "symbols": ["AdjunctP2"], "postprocess": id},
    {"name": "AdjunctP1", "symbols": ["Focus", "AdjunctP2"], "postprocess": makeBranch('FocusP')},
    {"name": "AdjunctP2", "symbols": ["AdjunctP"], "postprocess": id},
    {"name": "AdjunctP2", "symbols": ["AdjunctP", "Conjunction", "AdjunctP2"], "postprocess": makeConn},
    {"name": "Vlast", "symbols": ["VPincorp"], "postprocess": id},
    {"name": "Vlast", "symbols": ["VPoiv"], "postprocess": id},
    {"name": "Vlast", "symbols": ["Verb", "ConjunctionT1", "Vlast"], "postprocess": makeConn},
    {"name": "Vlast", "symbols": ["Verb"], "postprocess": id},
    {"name": "V1", "symbols": ["Verb"], "postprocess": id},
    {"name": "V1", "symbols": ["Verb", "ConjunctionT1", "V1"], "postprocess": makeConn},
    {"name": "Verb", "symbols": ["Prefix", "Verb"], "postprocess": makePrefixP},
    {"name": "Verb", "symbols": ["V"], "postprocess": id},
    {"name": "Verb", "symbols": ["ShuP"], "postprocess": id},
    {"name": "ShuP", "symbols": ["Shu", "Word"], "postprocess": makeBranch('shuP')},
    {"name": "Verb", "symbols": ["TeoP"], "postprocess": id},
    {"name": "TeoP", "symbols": ["MoP", "Teo"], "postprocess": makeBranch('teoP')},
    {"name": "MoP", "symbols": ["Mo", "Text"], "postprocess": makeBranch('moP')},
    {"name": "Verb", "symbols": ["MiP"], "postprocess": id},
    {"name": "MiP", "symbols": ["Mi", "Word"], "postprocess": makeBranch('mıP')},
    {"name": "Adjunct$ebnf$1", "symbols": []},
    {"name": "Adjunct$ebnf$1", "symbols": ["Adjunct$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Adjunct", "symbols": [(lexer.has("preposition") ? {type: "preposition"} : preposition), "Adjunct$ebnf$1"], "postprocess": makeLeaf('Adjunct')},
    {"name": "Conjunction$ebnf$1", "symbols": []},
    {"name": "Conjunction$ebnf$1", "symbols": ["Conjunction$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Conjunction", "symbols": [(lexer.has("conjunction") ? {type: "conjunction"} : conjunction), "Conjunction$ebnf$1"], "postprocess": makeLeaf('&')},
    {"name": "Conjunction", "symbols": ["PrefixNa", "V"], "postprocess": makeBranch('&(naP)')},
    {"name": "ConjunctionT1$ebnf$1", "symbols": []},
    {"name": "ConjunctionT1$ebnf$1", "symbols": ["ConjunctionT1$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ConjunctionT1", "symbols": [(lexer.has("conjunction_in_t1") ? {type: "conjunction_in_t1"} : conjunction_in_t1), "ConjunctionT1$ebnf$1"], "postprocess": makeLeaf('&')},
    {"name": "ConjunctionT1", "symbols": ["PrefixNaT1", "V"], "postprocess": makeBranch('&(naP)')},
    {"name": "ConjunctionT4$ebnf$1", "symbols": []},
    {"name": "ConjunctionT4$ebnf$1", "symbols": ["ConjunctionT4$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ConjunctionT4", "symbols": [(lexer.has("conjunction_in_t4") ? {type: "conjunction_in_t4"} : conjunction_in_t4), "ConjunctionT4$ebnf$1"], "postprocess": makeLeaf('&')},
    {"name": "ConjunctionT4", "symbols": ["PrefixNaT4", "V"], "postprocess": makeBranch('&(naP)')},
    {"name": "Asp$ebnf$1", "symbols": []},
    {"name": "Asp$ebnf$1", "symbols": ["Asp$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Asp", "symbols": [(lexer.has("aspect") ? {type: "aspect"} : aspect), "Asp$ebnf$1"], "postprocess": makeLeaf('Asp')},
    {"name": "Asp_prefix$ebnf$1", "symbols": []},
    {"name": "Asp_prefix$ebnf$1", "symbols": ["Asp_prefix$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Asp_prefix", "symbols": [(lexer.has("prefix_aspect") ? {type: "prefix_aspect"} : prefix_aspect), "Asp_prefix$ebnf$1"], "postprocess": makeLeaf('Asp')},
    {"name": "Bi$ebnf$1", "symbols": []},
    {"name": "Bi$ebnf$1", "symbols": ["Bi$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Bi", "symbols": [(lexer.has("topic_marker") ? {type: "topic_marker"} : topic_marker), "Bi$ebnf$1"], "postprocess": makeLeaf('Topic')},
    {"name": "C$ebnf$1", "symbols": []},
    {"name": "C$ebnf$1", "symbols": ["C$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "C", "symbols": [(lexer.has("complementizer") ? {type: "complementizer"} : complementizer), "C$ebnf$1"], "postprocess": makeLeaf('C')},
    {"name": "Copt$ebnf$1", "symbols": ["C"], "postprocess": id},
    {"name": "Copt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Copt", "symbols": ["Copt$ebnf$1"], "postprocess": makeOptLeaf('C')},
    {"name": "Csub$ebnf$1", "symbols": []},
    {"name": "Csub$ebnf$1", "symbols": ["Csub$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Csub", "symbols": [(lexer.has("subordinating_complementizer") ? {type: "subordinating_complementizer"} : subordinating_complementizer), "Csub$ebnf$1"], "postprocess": makeLeaf('C')},
    {"name": "Cincorp$ebnf$1", "symbols": []},
    {"name": "Cincorp$ebnf$1", "symbols": ["Cincorp$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Cincorp", "symbols": [(lexer.has("incorporated_complementizer") ? {type: "incorporated_complementizer"} : incorporated_complementizer), "Cincorp$ebnf$1"], "postprocess": makeLeaf('C')},
    {"name": "Crel$ebnf$1", "symbols": []},
    {"name": "Crel$ebnf$1", "symbols": ["Crel$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Crel", "symbols": [(lexer.has("relative_clause_complementizer") ? {type: "relative_clause_complementizer"} : relative_clause_complementizer), "Crel$ebnf$1"], "postprocess": makeLeaf('Crel')},
    {"name": "Crelopt$ebnf$1", "symbols": ["Crel"], "postprocess": id},
    {"name": "Crelopt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Crelopt", "symbols": ["Crelopt$ebnf$1"], "postprocess": makeOptLeaf('C')},
    {"name": "D$ebnf$1", "symbols": []},
    {"name": "D$ebnf$1", "symbols": ["D$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "D", "symbols": [(lexer.has("determiner") ? {type: "determiner"} : determiner), "D$ebnf$1"], "postprocess": makeLeaf('D')},
    {"name": "Dincorp$ebnf$1", "symbols": []},
    {"name": "Dincorp$ebnf$1", "symbols": ["Dincorp$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Dincorp", "symbols": [(lexer.has("incorporated_determiner") ? {type: "incorporated_determiner"} : incorporated_determiner), "Dincorp$ebnf$1"], "postprocess": makeLeaf('D')},
    {"name": "EvA$ebnf$1", "symbols": []},
    {"name": "EvA$ebnf$1", "symbols": ["EvA$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "EvA", "symbols": [(lexer.has("event_accessor") ? {type: "event_accessor"} : event_accessor), "EvA$ebnf$1"], "postprocess": makeLeaf('EvA')},
    {"name": "Focus$ebnf$1", "symbols": []},
    {"name": "Focus$ebnf$1", "symbols": ["Focus$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Focus", "symbols": [(lexer.has("focus_particle") ? {type: "focus_particle"} : focus_particle), "Focus$ebnf$1"], "postprocess": makeLeaf('Focus')},
    {"name": "Go$ebnf$1", "symbols": []},
    {"name": "Go$ebnf$1", "symbols": ["Go$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Go", "symbols": [(lexer.has("retroactive_cleft") ? {type: "retroactive_cleft"} : retroactive_cleft), "Go$ebnf$1"], "postprocess": makeLeaf('𝘷')},
    {"name": "Hu$ebnf$1", "symbols": []},
    {"name": "Hu$ebnf$1", "symbols": ["Hu$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Hu", "symbols": [(lexer.has("prefix_pronoun") ? {type: "prefix_pronoun"} : prefix_pronoun), "Hu$ebnf$1"], "postprocess": makeLeaf('D')},
    {"name": "Huincorp$ebnf$1", "symbols": []},
    {"name": "Huincorp$ebnf$1", "symbols": ["Huincorp$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Huincorp", "symbols": [(lexer.has("incorporated_prefix_pronoun") ? {type: "incorporated_prefix_pronoun"} : incorporated_prefix_pronoun), "Huincorp$ebnf$1"], "postprocess": makeLeaf('D')},
    {"name": "Interjection", "symbols": [(lexer.has("interjection") ? {type: "interjection"} : interjection)], "postprocess": makeLeaf('Interjection')},
    {"name": "Ki$ebnf$1", "symbols": []},
    {"name": "Ki$ebnf$1", "symbols": ["Ki$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Ki", "symbols": [(lexer.has("adjective_marker") ? {type: "adjective_marker"} : adjective_marker), "Ki$ebnf$1"], "postprocess": makeLeaf('𝘢')},
    {"name": "Mi$ebnf$1", "symbols": []},
    {"name": "Mi$ebnf$1", "symbols": ["Mi$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Mi", "symbols": [(lexer.has("name_verb") ? {type: "name_verb"} : name_verb), "Mi$ebnf$1"], "postprocess": makeLeaf('mı')},
    {"name": "Mo$ebnf$1", "symbols": []},
    {"name": "Mo$ebnf$1", "symbols": ["Mo$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Mo", "symbols": [(lexer.has("text_quote") ? {type: "text_quote"} : text_quote), "Mo$ebnf$1"], "postprocess": makeLeaf('mo')},
    {"name": "Modal$ebnf$1", "symbols": []},
    {"name": "Modal$ebnf$1", "symbols": ["Modal$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Modal", "symbols": [(lexer.has("modality") ? {type: "modality"} : modality), "Modal$ebnf$1"], "postprocess": makeLeaf('Modal')},
    {"name": "ModalT4$ebnf$1", "symbols": []},
    {"name": "ModalT4$ebnf$1", "symbols": ["ModalT4$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ModalT4", "symbols": [(lexer.has("modality_with_complement") ? {type: "modality_with_complement"} : modality_with_complement), "ModalT4$ebnf$1"], "postprocess": makeLeaf('Modal')},
    {"name": "Na$ebnf$1", "symbols": []},
    {"name": "Na$ebnf$1", "symbols": ["Na$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Na", "symbols": [(lexer.has("cleft_verb") ? {type: "cleft_verb"} : cleft_verb), "Na$ebnf$1"], "postprocess": makeLeaf('𝘷')},
    {"name": "Prefix", "symbols": [(lexer.has("prefix") ? {type: "prefix"} : prefix)], "postprocess": makePrefixLeaf},
    {"name": "Prefix", "symbols": [(lexer.has("focus_particle_prefix_form") ? {type: "focus_particle_prefix_form"} : focus_particle_prefix_form)], "postprocess": makePrefixLeaf},
    {"name": "PrefixNa", "symbols": [(lexer.has("prefix_conjunctionizer") ? {type: "prefix_conjunctionizer"} : prefix_conjunctionizer)], "postprocess": makePrefixLeaf},
    {"name": "PrefixNaT1", "symbols": [(lexer.has("prefix_conjunctionizer_in_t1") ? {type: "prefix_conjunctionizer_in_t1"} : prefix_conjunctionizer_in_t1)], "postprocess": makePrefixLeaf},
    {"name": "PrefixNaT4", "symbols": [(lexer.has("prefix_conjunctionizer_in_t4") ? {type: "prefix_conjunctionizer_in_t4"} : prefix_conjunctionizer_in_t4)], "postprocess": makePrefixLeaf},
    {"name": "Roi$ebnf$1", "symbols": []},
    {"name": "Roi$ebnf$1", "symbols": ["Roi$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Roi", "symbols": [(lexer.has("plural_coordinator") ? {type: "plural_coordinator"} : plural_coordinator), "Roi$ebnf$1"], "postprocess": makeLeaf('&')},
    {"name": "SA$ebnf$1", "symbols": []},
    {"name": "SA$ebnf$1", "symbols": ["SA$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SA", "symbols": [(lexer.has("illocution") ? {type: "illocution"} : illocution), "SA$ebnf$1"], "postprocess": makeLeaf('SA')},
    {"name": "SAopt$ebnf$1", "symbols": ["SA"], "postprocess": id},
    {"name": "SAopt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "SAopt", "symbols": ["SAopt$ebnf$1"], "postprocess": makeOptLeaf('SA')},
    {"name": "Sigma$ebnf$1", "symbols": []},
    {"name": "Sigma$ebnf$1", "symbols": ["Sigma$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Sigma", "symbols": [(lexer.has("polarity") ? {type: "polarity"} : polarity), "Sigma$ebnf$1"], "postprocess": makeLeaf('Σ')},
    {"name": "Shu$ebnf$1", "symbols": []},
    {"name": "Shu$ebnf$1", "symbols": ["Shu$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Shu", "symbols": [(lexer.has("word_quote") ? {type: "word_quote"} : word_quote), "Shu$ebnf$1"], "postprocess": makeLeaf('shu')},
    {"name": "T$ebnf$1", "symbols": []},
    {"name": "T$ebnf$1", "symbols": ["T$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "T", "symbols": [(lexer.has("tense") ? {type: "tense"} : tense), "T$ebnf$1"], "postprocess": makeLeaf('T')},
    {"name": "T_prefix$ebnf$1", "symbols": []},
    {"name": "T_prefix$ebnf$1", "symbols": ["T_prefix$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "T_prefix", "symbols": [(lexer.has("prefix_tense") ? {type: "prefix_tense"} : prefix_tense), "T_prefix$ebnf$1"], "postprocess": makeLeaf('T')},
    {"name": "Text$ebnf$1", "symbols": []},
    {"name": "Text$ebnf$1", "symbols": ["Text$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Text", "symbols": [(lexer.has("text") ? {type: "text"} : text), "Text$ebnf$1"], "postprocess": makeLeaf('text')},
    {"name": "Teo$ebnf$1", "symbols": []},
    {"name": "Teo$ebnf$1", "symbols": ["Teo$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Teo", "symbols": [(lexer.has("end_quote") ? {type: "end_quote"} : end_quote), "Teo$ebnf$1"], "postprocess": makeLeaf('teo')},
    {"name": "V$ebnf$1", "symbols": []},
    {"name": "V$ebnf$1", "symbols": ["V$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "V", "symbols": [(lexer.has("predicate") ? {type: "predicate"} : predicate), "V$ebnf$1"], "postprocess": makeLeaf('V')},
    {"name": "Voiv$ebnf$1", "symbols": []},
    {"name": "Voiv$ebnf$1", "symbols": ["Voiv$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Voiv", "symbols": [(lexer.has("predicatizer") ? {type: "predicatizer"} : predicatizer), "Voiv$ebnf$1"], "postprocess": makeLeaf('V')},
    {"name": "Word$ebnf$1", "symbols": []},
    {"name": "Word$ebnf$1", "symbols": ["Word$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Word", "symbols": [(lexer.has("word") ? {type: "word"} : word), "Word$ebnf$1"], "postprocess": makeLeaf('word')},
    {"name": "VocativeP", "symbols": ["Vocative", "Argument"], "postprocess": makeBranch('VocativeP')},
    {"name": "Vocative", "symbols": [(lexer.has("vocative") ? {type: "vocative"} : vocative)], "postprocess": makeLeaf('Vocative')},
    {"name": "VocArgument", "symbols": ["Argument"], "postprocess": id},
    {"name": "VocArgument", "symbols": ["VocativeP"], "postprocess": id},
    {"name": "Parenthetical", "symbols": [(lexer.has("start_parenthetical") ? {type: "start_parenthetical"} : start_parenthetical), "Fragment", (lexer.has("end_parenthetical") ? {type: "end_parenthetical"} : end_parenthetical)], "postprocess": id},
    {"name": "Free", "symbols": ["Interjection"], "postprocess": id},
    {"name": "Free", "symbols": ["Parenthetical"], "postprocess": id}
  ],
  ParserStart: "Fragment",
};

export default grammar;
