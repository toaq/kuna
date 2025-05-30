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
declare var determiner: any;
declare var incorporated_determiner: any;
declare var tonal_determiner: any;
declare var tonal_incorporated_determiner: any;
declare var event_accessor: any;
declare var focus_particle: any;
declare var retroactive_cleft: any;
declare var word_determiner: any;
declare var incorporated_word_determiner: any;
declare var interjection: any;
declare var adjective_marker: any;
declare var name_verb: any;
declare var text_quote: any;
declare var quantifier: any;
declare var quantifier_with_complement: any;
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

import { ToaqTokenizer } from "./morphology/tokenize";
import * as TreeModule from "./tree";

const {
	make3L,
	makeAdjunctPI,
	makeAdjunctPT,
	makeBranch,
	makeBranchCovertLeft,
	makeConn,
	makeDiscourse,
	makeEmptynP,
	makeLeaf,
	makeOptLeaf,
	makePrefixLeaf,
	makePrefixP,
	makeQP,
	makeRetroactiveCleft,
	makeRose,
	makeRose2,
	makeSerial,
	makeSigmaT1QP,
	makeSingleChild,
	makeT1QP,
	makeWord,
	makevP_main,
	makevP_sub,
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
    {"name": "Fragment", "symbols": ["AdjunctPcon"], "postprocess": id},
    {"name": "Discourse", "symbols": ["SAP", "Discourse"], "postprocess": makeDiscourse},
    {"name": "Discourse", "symbols": ["SAP"], "postprocess": id},
    {"name": "SAP", "symbols": ["CP", "SAopt"], "postprocess": makeBranch('SAP')},
    {"name": "CP", "symbols": ["Copt", "Clause_main"], "postprocess": makeBranch('CP')},
    {"name": "CPsub", "symbols": ["Csub", "Clause_sub"], "postprocess": makeBranch('CP')},
    {"name": "CPsub", "symbols": ["EvA", "vP_sub"], "postprocess": makeBranch('EvAP')},
    {"name": "CPna_main", "symbols": ["Clause_main"], "postprocess": makeBranchCovertLeft('CP', 'C')},
    {"name": "CPna_sub", "symbols": ["Clause_sub"], "postprocess": makeBranchCovertLeft('CP', 'C')},
    {"name": "DP$ebnf$1", "symbols": []},
    {"name": "DP$ebnf$1", "symbols": ["DP$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DP", "symbols": [(lexer.has("pronoun") ? {type: "pronoun"} : pronoun), "DP$ebnf$1"], "postprocess": makeLeaf('DP')},
    {"name": "DP", "symbols": ["WordD", "Word"], "postprocess": makeBranch('DP')},
    {"name": "DP", "symbols": ["D", "nPopt"], "postprocess": makeBranch('DP')},
    {"name": "DP", "symbols": ["Dtonal", "nP"], "postprocess": makeBranch('DP')},
    {"name": "DPincorp$ebnf$1", "symbols": []},
    {"name": "DPincorp$ebnf$1", "symbols": ["DPincorp$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DPincorp", "symbols": [(lexer.has("incorporated_pronoun") ? {type: "incorporated_pronoun"} : incorporated_pronoun), "DPincorp$ebnf$1"], "postprocess": makeLeaf('DP')},
    {"name": "DPincorp", "symbols": ["WordDincorp", "Word"], "postprocess": makeBranch('DP')},
    {"name": "DPincorp", "symbols": ["Dincorp", "nPopt"], "postprocess": makeBranch('DP')},
    {"name": "DPincorp", "symbols": ["Dtonalincorp", "nP"], "postprocess": makeBranch('DP')},
    {"name": "DPsub", "symbols": ["D", "nPsub"], "postprocess": makeBranch('DP')},
    {"name": "DPsub", "symbols": ["Dtonal", "nPsub"], "postprocess": makeBranch('DP')},
    {"name": "DPsubincorp", "symbols": ["Dincorp", "nPsub"], "postprocess": makeBranch('DP')},
    {"name": "DPsubincorp", "symbols": ["Dtonalincorp", "nPsub"], "postprocess": makeBranch('DP')},
    {"name": "nP", "symbols": ["CPdet"], "postprocess": makeBranchCovertLeft('𝘯P', '𝘯')},
    {"name": "nPopt", "symbols": [], "postprocess": makeEmptynP},
    {"name": "nPopt", "symbols": ["nP"], "postprocess": id},
    {"name": "nPsub", "symbols": ["CPsub"], "postprocess": makeBranchCovertLeft('𝘯P', '𝘯')},
    {"name": "CPdet", "symbols": ["CPdet", "CPsubcon"], "postprocess": makeBranch('CP')},
    {"name": "CPdet", "symbols": ["QSPdet"], "postprocess": makeBranchCovertLeft('CP', 'C', 'REL')},
    {"name": "Clause_main", "symbols": ["Argument", "Bi", "Clause_main"], "postprocess": make3L('TopicP', "Topic'")},
    {"name": "Clause_sub", "symbols": ["Argument", "Bi", "Clause_sub"], "postprocess": make3L('TopicP', "Topic'")},
    {"name": "Clause_main", "symbols": ["QSP_main"], "postprocess": id},
    {"name": "Clause_sub", "symbols": ["QSP_sub"], "postprocess": id},
    {"name": "Clause_main", "symbols": ["Argument", "Na", "Clause_main"], "postprocess": make3L('𝘷P', "𝘷'")},
    {"name": "Clause_sub", "symbols": ["Argument", "Na", "Clause_sub"], "postprocess": make3L('𝘷P', "𝘷'")},
    {"name": "Clause_main", "symbols": ["AdjunctPcon", "Na", "Clause_main"], "postprocess": make3L('𝘷P', "𝘷'")},
    {"name": "Clause_sub", "symbols": ["AdjunctPcon", "Na", "Clause_sub"], "postprocess": make3L('𝘷P', "𝘷'")},
    {"name": "Clause_main", "symbols": ["QT4", "Csub", "Clause_sub", "Na", "CPna_main"], "postprocess": makeQP},
    {"name": "Clause_sub", "symbols": ["QT4", "Csub", "Clause_sub", "Na", "CPna_sub"], "postprocess": makeQP},
    {"name": "Clause_main", "symbols": ["QSP_main", "Go", "Clause_main"], "postprocess": makeRetroactiveCleft},
    {"name": "Clause_sub", "symbols": ["QSP_main", "Go", "Clause_sub"], "postprocess": makeRetroactiveCleft},
    {"name": "QSP_main", "symbols": ["SigmaPcon_main"], "postprocess": id},
    {"name": "QSP_sub", "symbols": ["SigmaPcon_sub"], "postprocess": id},
    {"name": "QSP_main", "symbols": ["Q", "SigmaPcon_main"], "postprocess": makeT1QP},
    {"name": "QSP_sub", "symbols": ["Q", "SigmaPcon_sub"], "postprocess": makeT1QP},
    {"name": "QSP_main", "symbols": ["Sigma", "Q", "SigmaPcon_main"], "postprocess": makeSigmaT1QP},
    {"name": "QSP_sub", "symbols": ["Sigma", "Q", "SigmaPcon_sub"], "postprocess": makeSigmaT1QP},
    {"name": "QSPdet", "symbols": ["SigmaPdet"], "postprocess": id},
    {"name": "QSPdet", "symbols": ["Q", "SigmaPdet"], "postprocess": makeT1QP},
    {"name": "QSPdet", "symbols": ["Sigma", "Q", "SigmaPdet"], "postprocess": makeSigmaT1QP},
    {"name": "SigmaPcon_main", "symbols": ["SigmaP_main"], "postprocess": id},
    {"name": "SigmaPcon_sub", "symbols": ["SigmaP_sub"], "postprocess": id},
    {"name": "SigmaPcon_main", "symbols": ["SigmaP_main", "Conjunction", "SigmaPcon_main"], "postprocess": makeConn},
    {"name": "SigmaPcon_sub", "symbols": ["SigmaP_sub", "Conjunction", "SigmaPcon_sub"], "postprocess": makeConn},
    {"name": "SigmaP_main", "symbols": ["TP_main"], "postprocess": id},
    {"name": "SigmaP_sub", "symbols": ["TP_sub"], "postprocess": id},
    {"name": "SigmaP_main", "symbols": ["Sigmacon", "TP_main"], "postprocess": makeBranch('ΣP')},
    {"name": "SigmaP_sub", "symbols": ["Sigmacon", "TP_sub"], "postprocess": makeBranch('ΣP')},
    {"name": "SigmaPdet", "symbols": ["TPdet"], "postprocess": id},
    {"name": "SigmaPdet", "symbols": ["Sigmacon", "TPdet"], "postprocess": makeBranch('ΣP')},
    {"name": "TP_main", "symbols": ["Tconopt", "AspP_main"], "postprocess": makeBranch('TP')},
    {"name": "TP_sub", "symbols": ["Tconopt", "AspP_sub"], "postprocess": makeBranch('TP')},
    {"name": "TPdet", "symbols": ["Tconopt", "AspPdet"], "postprocess": makeBranch('TP')},
    {"name": "AspP_main", "symbols": ["Aspconopt", "vP_main"], "postprocess": makeBranch('AspP')},
    {"name": "AspP_sub", "symbols": ["Aspconopt", "vP_sub"], "postprocess": makeBranch('AspP')},
    {"name": "AspPdet", "symbols": ["Aspconopt", "vPdet"], "postprocess": makeBranch('AspP')},
    {"name": "vP_main$ebnf$1", "symbols": []},
    {"name": "vP_main$ebnf$1", "symbols": ["vP_main$ebnf$1", "AdjunctPcon"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP_main$ebnf$2$subexpression$1$ebnf$1", "symbols": ["VocArgument"]},
    {"name": "vP_main$ebnf$2$subexpression$1$ebnf$1", "symbols": ["vP_main$ebnf$2$subexpression$1$ebnf$1", "VocArgument"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP_main$ebnf$2$subexpression$1$ebnf$2", "symbols": []},
    {"name": "vP_main$ebnf$2$subexpression$1$ebnf$2", "symbols": ["vP_main$ebnf$2$subexpression$1$ebnf$2", "AdjunctPcon"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP_main$ebnf$2$subexpression$1", "symbols": ["vP_main$ebnf$2$subexpression$1$ebnf$1", "vP_main$ebnf$2$subexpression$1$ebnf$2"]},
    {"name": "vP_main$ebnf$2", "symbols": ["vP_main$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "vP_main$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "vP_main", "symbols": ["Serial", "vP_main$ebnf$1", "vP_main$ebnf$2"], "postprocess": makevP_main},
    {"name": "vP_sub$ebnf$1", "symbols": []},
    {"name": "vP_sub$ebnf$1", "symbols": ["vP_sub$ebnf$1", "AdjunctPcon"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP_sub$ebnf$2$subexpression$1$ebnf$1", "symbols": ["VocArgument"]},
    {"name": "vP_sub$ebnf$2$subexpression$1$ebnf$1", "symbols": ["vP_sub$ebnf$2$subexpression$1$ebnf$1", "VocArgument"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP_sub$ebnf$2$subexpression$1$ebnf$2", "symbols": []},
    {"name": "vP_sub$ebnf$2$subexpression$1$ebnf$2", "symbols": ["vP_sub$ebnf$2$subexpression$1$ebnf$2", "AdjunctPcon"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP_sub$ebnf$2$subexpression$1", "symbols": ["vP_sub$ebnf$2$subexpression$1$ebnf$1", "vP_sub$ebnf$2$subexpression$1$ebnf$2"]},
    {"name": "vP_sub$ebnf$2", "symbols": ["vP_sub$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "vP_sub$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "vP_sub", "symbols": ["Serial", "vP_sub$ebnf$1", "vP_sub$ebnf$2"], "postprocess": makevP_sub},
    {"name": "vPdet", "symbols": ["Serialdet"], "postprocess": makevPdet},
    {"name": "AdjunctP", "symbols": ["Adjunct", "Serial", "Argument"], "postprocess": makeAdjunctPT},
    {"name": "AdjunctP", "symbols": ["Adjunct", "Serial"], "postprocess": makeAdjunctPI},
    {"name": "Serial$ebnf$1", "symbols": []},
    {"name": "Serial$ebnf$1", "symbols": ["Serial$ebnf$1", "V1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Serial", "symbols": ["Serial$ebnf$1", "Vlast"], "postprocess": makeSerial('*Serial')},
    {"name": "Serialdet$ebnf$1", "symbols": []},
    {"name": "Serialdet$ebnf$1", "symbols": ["Serialdet$ebnf$1", "V1orKi"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Serialdet", "symbols": ["Serialdet$ebnf$1", "Vlast"], "postprocess": makeSerial('*Serialdet')},
    {"name": "V1orKi", "symbols": ["V1"], "postprocess": id},
    {"name": "V1orKi", "symbols": ["Ki"], "postprocess": id},
    {"name": "Argument", "symbols": ["DPcon"], "postprocess": id},
    {"name": "Argument", "symbols": ["DPsubcon"], "postprocess": id},
    {"name": "Argincorp", "symbols": ["DPincorp"], "postprocess": id},
    {"name": "Argincorp", "symbols": ["DPsubincorp"], "postprocess": id},
    {"name": "DPcon", "symbols": ["DProi"], "postprocess": id},
    {"name": "DPcon", "symbols": ["DProi", "Conjunction", "DPcon"], "postprocess": makeConn},
    {"name": "DPcon", "symbols": ["DProi", "ConjunctionT1", "DPsubcon"], "postprocess": makeConn},
    {"name": "DProi", "symbols": ["DPfoc"], "postprocess": id},
    {"name": "DProi", "symbols": ["DPfoc", "Roi", "DProi"], "postprocess": makeConn},
    {"name": "DPfoc", "symbols": ["DP"], "postprocess": id},
    {"name": "DPfoc", "symbols": ["Focus", "DP"], "postprocess": makeBranch('FocusP')},
    {"name": "DPsubcon", "symbols": ["DPsubfoc"], "postprocess": id},
    {"name": "DPsubcon", "symbols": ["DPsubfoc", "Conjunction", "DPsubcon"], "postprocess": makeConn},
    {"name": "DPsubfoc", "symbols": ["DPsub"], "postprocess": id},
    {"name": "DPsubfoc", "symbols": ["Focus", "DPsub"], "postprocess": makeBranch('FocusP')},
    {"name": "DPsubincorpcon", "symbols": ["DPsubincorpfoc"], "postprocess": id},
    {"name": "DPsubincorpcon", "symbols": ["DPsubincorpfoc", "Conjunction", "DPsubcon"], "postprocess": makeConn},
    {"name": "DPsubincorpfoc", "symbols": ["DPsubincorp"], "postprocess": id},
    {"name": "DPsubincorpfoc", "symbols": ["Focus", "DPsubincorp"], "postprocess": makeBranch('FocusP')},
    {"name": "CPsubcon", "symbols": ["CPsub"], "postprocess": id},
    {"name": "CPsubcon", "symbols": ["CPsub", "Conjunction", "CPsubcon"], "postprocess": makeConn},
    {"name": "Sigmacon", "symbols": ["Sigma"], "postprocess": id},
    {"name": "Sigmacon", "symbols": ["Sigma", "Conjunction", "Sigmacon"], "postprocess": makeConn},
    {"name": "Tconopt$ebnf$1", "symbols": ["Tcon"], "postprocess": id},
    {"name": "Tconopt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Tconopt", "symbols": ["Tconopt$ebnf$1"], "postprocess": makeOptLeaf('T')},
    {"name": "Tcon", "symbols": ["T"], "postprocess": id},
    {"name": "Tcon", "symbols": ["T_prefix"], "postprocess": id},
    {"name": "Tcon", "symbols": ["T", "Conjunction", "Tcon"], "postprocess": makeConn},
    {"name": "Aspconopt$ebnf$1", "symbols": ["Aspcon"], "postprocess": id},
    {"name": "Aspconopt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Aspconopt", "symbols": ["Aspconopt$ebnf$1"], "postprocess": makeOptLeaf('Asp')},
    {"name": "Aspcon", "symbols": ["Asp"], "postprocess": id},
    {"name": "Aspcon", "symbols": ["Asp_prefix"], "postprocess": id},
    {"name": "Aspcon", "symbols": ["Asp", "Conjunction", "Aspcon"], "postprocess": makeConn},
    {"name": "AdjunctPcon", "symbols": ["AdjunctPfoc"], "postprocess": id},
    {"name": "AdjunctPcon", "symbols": ["AdjunctPfoc", "Conjunction", "AdjunctPcon"], "postprocess": makeConn},
    {"name": "AdjunctPfoc", "symbols": ["AdjunctP"], "postprocess": id},
    {"name": "AdjunctPfoc", "symbols": ["Focus", "AdjunctP"], "postprocess": makeBranch('FocusP')},
    {"name": "Vlast", "symbols": ["Verb", "ConjunctionT1", "Vlast"], "postprocess": makeConn},
    {"name": "Vlast", "symbols": ["Verb"], "postprocess": id},
    {"name": "Vlast", "symbols": ["Voiv", "Argument"], "postprocess": makeBranch('V')},
    {"name": "Vlast", "symbols": ["Verb", "Argincorp"], "postprocess": makeBranch('V')},
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
    {"name": "D$ebnf$1", "symbols": []},
    {"name": "D$ebnf$1", "symbols": ["D$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "D", "symbols": [(lexer.has("determiner") ? {type: "determiner"} : determiner), "D$ebnf$1"], "postprocess": makeLeaf('D')},
    {"name": "Dincorp$ebnf$1", "symbols": []},
    {"name": "Dincorp$ebnf$1", "symbols": ["Dincorp$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Dincorp", "symbols": [(lexer.has("incorporated_determiner") ? {type: "incorporated_determiner"} : incorporated_determiner), "Dincorp$ebnf$1"], "postprocess": makeLeaf('D')},
    {"name": "Dtonal$ebnf$1", "symbols": []},
    {"name": "Dtonal$ebnf$1", "symbols": ["Dtonal$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Dtonal", "symbols": [(lexer.has("tonal_determiner") ? {type: "tonal_determiner"} : tonal_determiner), "Dtonal$ebnf$1"], "postprocess": makeLeaf('D')},
    {"name": "Dtonalincorp$ebnf$1", "symbols": []},
    {"name": "Dtonalincorp$ebnf$1", "symbols": ["Dtonalincorp$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Dtonalincorp", "symbols": [(lexer.has("tonal_incorporated_determiner") ? {type: "tonal_incorporated_determiner"} : tonal_incorporated_determiner), "Dtonalincorp$ebnf$1"], "postprocess": makeLeaf('D')},
    {"name": "EvA$ebnf$1", "symbols": []},
    {"name": "EvA$ebnf$1", "symbols": ["EvA$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "EvA", "symbols": [(lexer.has("event_accessor") ? {type: "event_accessor"} : event_accessor), "EvA$ebnf$1"], "postprocess": makeLeaf('EvA')},
    {"name": "Focus$ebnf$1", "symbols": []},
    {"name": "Focus$ebnf$1", "symbols": ["Focus$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Focus", "symbols": [(lexer.has("focus_particle") ? {type: "focus_particle"} : focus_particle), "Focus$ebnf$1"], "postprocess": makeLeaf('Focus')},
    {"name": "Go$ebnf$1", "symbols": []},
    {"name": "Go$ebnf$1", "symbols": ["Go$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Go", "symbols": [(lexer.has("retroactive_cleft") ? {type: "retroactive_cleft"} : retroactive_cleft), "Go$ebnf$1"], "postprocess": makeLeaf('𝘷')},
    {"name": "WordD$ebnf$1", "symbols": []},
    {"name": "WordD$ebnf$1", "symbols": ["WordD$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "WordD", "symbols": [(lexer.has("word_determiner") ? {type: "word_determiner"} : word_determiner), "WordD$ebnf$1"], "postprocess": makeLeaf('D')},
    {"name": "WordDincorp$ebnf$1", "symbols": []},
    {"name": "WordDincorp$ebnf$1", "symbols": ["WordDincorp$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "WordDincorp", "symbols": [(lexer.has("incorporated_word_determiner") ? {type: "incorporated_word_determiner"} : incorporated_word_determiner), "WordDincorp$ebnf$1"], "postprocess": makeLeaf('D')},
    {"name": "Interjection", "symbols": [(lexer.has("interjection") ? {type: "interjection"} : interjection)], "postprocess": makeLeaf('Interjection')},
    {"name": "Ki$ebnf$1", "symbols": []},
    {"name": "Ki$ebnf$1", "symbols": ["Ki$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Ki", "symbols": [(lexer.has("adjective_marker") ? {type: "adjective_marker"} : adjective_marker), "Ki$ebnf$1"], "postprocess": makeLeaf('Adjunct')},
    {"name": "Mi$ebnf$1", "symbols": []},
    {"name": "Mi$ebnf$1", "symbols": ["Mi$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Mi", "symbols": [(lexer.has("name_verb") ? {type: "name_verb"} : name_verb), "Mi$ebnf$1"], "postprocess": makeLeaf('mı')},
    {"name": "Mo$ebnf$1", "symbols": []},
    {"name": "Mo$ebnf$1", "symbols": ["Mo$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Mo", "symbols": [(lexer.has("text_quote") ? {type: "text_quote"} : text_quote), "Mo$ebnf$1"], "postprocess": makeLeaf('mo')},
    {"name": "Q$ebnf$1", "symbols": []},
    {"name": "Q$ebnf$1", "symbols": ["Q$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Q", "symbols": [(lexer.has("quantifier") ? {type: "quantifier"} : quantifier), "Q$ebnf$1"], "postprocess": makeLeaf('Q')},
    {"name": "QT4$ebnf$1", "symbols": []},
    {"name": "QT4$ebnf$1", "symbols": ["QT4$ebnf$1", "Free"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "QT4", "symbols": [(lexer.has("quantifier_with_complement") ? {type: "quantifier_with_complement"} : quantifier_with_complement), "QT4$ebnf$1"], "postprocess": makeLeaf('Q')},
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
