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
declare var topic_marker: any;
declare var complementizer: any;
declare var subordinating_complementizer: any;
declare var incorporated_complementizer: any;
declare var relative_clause_complementizer: any;
declare var determiner: any;
declare var incorporated_determiner: any;
declare var interjection: any;
declare var name_verb: any;
declare var cleft_verb: any;
declare var illocution: any;
declare var polarity: any;
declare var word_quote: any;
declare var tense: any;
declare var predicate: any;
declare var object_incorporating_verb: any;

import { ToaqTokenizer } from "./tokenize";
const {
	make3L,
	makeAdjunctPI,
	makeAdjunctPT,
	makeBranch,
	makeBranchCovertLeft,
	makeBranchFunctionalLeft,
	makeConn,
    makeCovertLeaf,
	makeLeaf,
	makeOptLeaf,
	makeRose,
	makeRose2,
	makeSerial,
    makeSingleChild,
	makeWord,
	makevP,
	makevPdet,
} = require('./tree');
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
    {"name": "Fragment", "symbols": ["SAP"], "postprocess": id},
    {"name": "Fragment", "symbols": ["DP"], "postprocess": id},
    {"name": "Fragment", "symbols": ["AdjunctP"], "postprocess": id},
    {"name": "SAP", "symbols": ["Interjection", "SAP"], "postprocess": makeBranch('InterjectionP')},
    {"name": "SAP", "symbols": ["CP", "SAopt"], "postprocess": makeBranch('SAP')},
    {"name": "CP", "symbols": ["Copt", "Clause"], "postprocess": makeBranch('CP')},
    {"name": "CPsub", "symbols": ["Csub", "Clause"], "postprocess": makeBranch('CP')},
    {"name": "CPincorp", "symbols": ["Cincorp", "Clause"], "postprocess": makeBranch('CP')},
    {"name": "CPrel", "symbols": ["Crel", "Clause"], "postprocess": makeBranch('CPrel')},
    {"name": "CPrelna", "symbols": ["Clause"], "postprocess": makeBranchCovertLeft('CPrel', 'Crel')},
    {"name": "CPdet", "symbols": ["TPdet"], "postprocess": makeBranchCovertLeft('CPrel', 'Crel')},
    {"name": "DP", "symbols": [(lexer.has("pronoun") ? {type: "pronoun"} : pronoun)], "postprocess": makeLeaf('DP')},
    {"name": "DP", "symbols": ["D", "nP"], "postprocess": makeBranch('DP')},
    {"name": "nP", "symbols": ["nP", "CPrel"], "postprocess": makeBranch('nP')},
    {"name": "nP", "symbols": ["CPdet"], "postprocess": makeBranchFunctionalLeft('nP', 'n')},
    {"name": "Clause", "symbols": ["TP"], "postprocess": id},
    {"name": "Clause", "symbols": ["DP", "Bi", "Clause"], "postprocess": make3L('TopicP', "Topic'")},
    {"name": "Clause", "symbols": ["DP", "Na", "CPrelna"], "postprocess": make3L('𝘷P', "𝘷'")},
    {"name": "TP", "symbols": ["AspP"], "postprocess": makeBranchCovertLeft('TP', 'T')},
    {"name": "TP", "symbols": ["T1", "AspP"], "postprocess": makeBranch('TP')},
    {"name": "TP", "symbols": ["Sigma", "T1", "AspP"], "postprocess": make3L('ΣP', 'TP')},
    {"name": "TPdet", "symbols": ["AspPdet"], "postprocess": makeBranchCovertLeft('TP', 'T')},
    {"name": "TPdet", "symbols": ["T1", "AspPdet"], "postprocess": makeBranch('TP')},
    {"name": "TPdet", "symbols": ["Sigma", "T1", "AspPdet"], "postprocess": make3L('ΣP', 'TP')},
    {"name": "AspP", "symbols": ["vP"], "postprocess": makeBranchCovertLeft('AspP', 'Asp')},
    {"name": "AspP", "symbols": ["Asp1", "vP"], "postprocess": makeBranch('AspP')},
    {"name": "AspP", "symbols": ["Sigma", "Asp1", "vP"], "postprocess": make3L('ΣP', 'AspP')},
    {"name": "AspPdet", "symbols": ["vPdet"], "postprocess": makeBranchCovertLeft('AspP', 'Asp')},
    {"name": "AspPdet", "symbols": ["Asp1", "vPdet"], "postprocess": makeBranch('AspP')},
    {"name": "AspPdet", "symbols": ["Sigma", "Asp1", "vPdet"], "postprocess": make3L('ΣP', 'AspP')},
    {"name": "vP", "symbols": ["Sigma", "vPinner"], "postprocess": makeBranch('ΣP')},
    {"name": "vP", "symbols": ["vPinner"], "postprocess": id},
    {"name": "vPinner$ebnf$1", "symbols": []},
    {"name": "vPinner$ebnf$1", "symbols": ["vPinner$ebnf$1", "AdjunctP1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vPinner$ebnf$2$subexpression$1$ebnf$1", "symbols": ["term"]},
    {"name": "vPinner$ebnf$2$subexpression$1$ebnf$1", "symbols": ["vPinner$ebnf$2$subexpression$1$ebnf$1", "term"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vPinner$ebnf$2$subexpression$1$ebnf$2", "symbols": []},
    {"name": "vPinner$ebnf$2$subexpression$1$ebnf$2", "symbols": ["vPinner$ebnf$2$subexpression$1$ebnf$2", "AdjunctP1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vPinner$ebnf$2$subexpression$1", "symbols": ["vPinner$ebnf$2$subexpression$1$ebnf$1", "vPinner$ebnf$2$subexpression$1$ebnf$2"]},
    {"name": "vPinner$ebnf$2", "symbols": ["vPinner$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "vPinner$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "vPinner", "symbols": ["Serial", "vPinner$ebnf$1", "vPinner$ebnf$2"], "postprocess": makevP},
    {"name": "vPdet", "symbols": ["Serialdet"], "postprocess": makevPdet},
    {"name": "AdjunctP", "symbols": ["Adjunct", "Serial", "term"], "postprocess": makeAdjunctPT},
    {"name": "AdjunctP", "symbols": ["Adjunct", "Serial"], "postprocess": makeAdjunctPI},
    {"name": "Serial$ebnf$1", "symbols": []},
    {"name": "Serial$ebnf$1", "symbols": ["Serial$ebnf$1", "V1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Serial", "symbols": ["Serial$ebnf$1", "Vlast"], "postprocess": makeSerial},
    {"name": "Serialdet", "symbols": ["Serial"], "postprocess": id},
    {"name": "Serialdet", "symbols": [], "postprocess": makeCovertLeaf('V')},
    {"name": "VPincorp", "symbols": ["V", "DPincorp"], "postprocess": makeBranch('VP')},
    {"name": "VPincorp", "symbols": ["V", "CPincorp"], "postprocess": makeBranch('VP')},
    {"name": "DPincorp", "symbols": [(lexer.has("incorporated_pronoun") ? {type: "incorporated_pronoun"} : incorporated_pronoun)], "postprocess": makeLeaf('DP')},
    {"name": "DPincorp", "symbols": ["Dincorp", "nP"], "postprocess": makeBranch('DP')},
    {"name": "VPoiv", "symbols": ["Voiv", "DP"], "postprocess": makeBranch('VP')},
    {"name": "term", "symbols": ["DP1"], "postprocess": id},
    {"name": "term", "symbols": ["CPsub"], "postprocess": id},
    {"name": "DP1", "symbols": ["DP"], "postprocess": id},
    {"name": "DP1", "symbols": ["DP", "Conjunction", "DP1"], "postprocess": makeConn},
    {"name": "T1", "symbols": ["T"], "postprocess": id},
    {"name": "T1", "symbols": ["T", "Conjunction", "T1"], "postprocess": makeConn},
    {"name": "Asp1", "symbols": ["Asp"], "postprocess": id},
    {"name": "Asp1", "symbols": ["Asp", "Conjunction", "Asp1"], "postprocess": makeConn},
    {"name": "AdjunctP1", "symbols": ["AdjunctP"], "postprocess": id},
    {"name": "AdjunctP1", "symbols": ["AdjunctP", "Conjunction", "AdjunctP1"], "postprocess": makeConn},
    {"name": "Vlast", "symbols": ["Verblike"], "postprocess": id},
    {"name": "Vlast", "symbols": ["VPincorp"], "postprocess": id},
    {"name": "Vlast", "symbols": ["VPoiv"], "postprocess": id},
    {"name": "Vlast", "symbols": ["Verblike", "ConjunctionT1", "Vlast"], "postprocess": makeConn},
    {"name": "V1", "symbols": ["Verblike"], "postprocess": id},
    {"name": "V1", "symbols": ["Verblike", "ConjunctionT1", "V1"], "postprocess": makeConn},
    {"name": "Verblike", "symbols": ["V"], "postprocess": id},
    {"name": "Verblike", "symbols": ["ShuP"], "postprocess": id},
    {"name": "ShuP", "symbols": ["Shu", "Word"], "postprocess": makeBranch('shuP')},
    {"name": "Verblike", "symbols": ["MiP"], "postprocess": id},
    {"name": "MiP", "symbols": ["Mi", "Word"], "postprocess": makeBranch('mıP')},
    {"name": "Adjunct", "symbols": [(lexer.has("preposition") ? {type: "preposition"} : preposition)], "postprocess": makeLeaf('Adjunct')},
    {"name": "Conjunction", "symbols": [(lexer.has("conjunction") ? {type: "conjunction"} : conjunction)], "postprocess": makeLeaf('&')},
    {"name": "ConjunctionT1", "symbols": [(lexer.has("conjunction_in_t1") ? {type: "conjunction_in_t1"} : conjunction_in_t1)], "postprocess": makeLeaf('&')},
    {"name": "ConjunctionT4", "symbols": [(lexer.has("conjunction_in_t4") ? {type: "conjunction_in_t4"} : conjunction_in_t4)], "postprocess": makeLeaf('&')},
    {"name": "Asp", "symbols": [(lexer.has("aspect") ? {type: "aspect"} : aspect)], "postprocess": makeLeaf('Asp')},
    {"name": "Bi", "symbols": [(lexer.has("topic_marker") ? {type: "topic_marker"} : topic_marker)], "postprocess": makeLeaf('Topic')},
    {"name": "C", "symbols": [(lexer.has("complementizer") ? {type: "complementizer"} : complementizer)], "postprocess": makeLeaf('C')},
    {"name": "Copt$ebnf$1", "symbols": ["C"], "postprocess": id},
    {"name": "Copt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Copt", "symbols": ["Copt$ebnf$1"], "postprocess": makeOptLeaf('C')},
    {"name": "Csub", "symbols": [(lexer.has("subordinating_complementizer") ? {type: "subordinating_complementizer"} : subordinating_complementizer)], "postprocess": makeLeaf('C')},
    {"name": "Cincorp", "symbols": [(lexer.has("incorporated_complementizer") ? {type: "incorporated_complementizer"} : incorporated_complementizer)], "postprocess": makeLeaf('C')},
    {"name": "Crel", "symbols": [(lexer.has("relative_clause_complementizer") ? {type: "relative_clause_complementizer"} : relative_clause_complementizer)], "postprocess": makeLeaf('Crel')},
    {"name": "Crelopt$ebnf$1", "symbols": ["Crel"], "postprocess": id},
    {"name": "Crelopt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Crelopt", "symbols": ["Crelopt$ebnf$1"], "postprocess": makeOptLeaf('C')},
    {"name": "D", "symbols": [(lexer.has("determiner") ? {type: "determiner"} : determiner)], "postprocess": makeLeaf('D')},
    {"name": "Dincorp", "symbols": [(lexer.has("incorporated_determiner") ? {type: "incorporated_determiner"} : incorporated_determiner)], "postprocess": makeLeaf('D')},
    {"name": "Interjection", "symbols": [(lexer.has("interjection") ? {type: "interjection"} : interjection)], "postprocess": makeLeaf('Interjection')},
    {"name": "Mi", "symbols": [(lexer.has("name_verb") ? {type: "name_verb"} : name_verb)], "postprocess": makeLeaf('mı')},
    {"name": "Na", "symbols": [(lexer.has("cleft_verb") ? {type: "cleft_verb"} : cleft_verb)], "postprocess": makeLeaf('𝘷')},
    {"name": "SA", "symbols": [(lexer.has("illocution") ? {type: "illocution"} : illocution)], "postprocess": makeLeaf('SA')},
    {"name": "SAopt$ebnf$1", "symbols": ["SA"], "postprocess": id},
    {"name": "SAopt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "SAopt", "symbols": ["SAopt$ebnf$1"], "postprocess": makeOptLeaf('SA')},
    {"name": "Sigma", "symbols": [(lexer.has("polarity") ? {type: "polarity"} : polarity)], "postprocess": makeLeaf('Σ')},
    {"name": "Shu", "symbols": [(lexer.has("word_quote") ? {type: "word_quote"} : word_quote)], "postprocess": makeLeaf('shu')},
    {"name": "T", "symbols": [(lexer.has("tense") ? {type: "tense"} : tense)], "postprocess": makeLeaf('T')},
    {"name": "V", "symbols": [(lexer.has("predicate") ? {type: "predicate"} : predicate)], "postprocess": makeLeaf('V')},
    {"name": "Voiv", "symbols": [(lexer.has("object_incorporating_verb") ? {type: "object_incorporating_verb"} : object_incorporating_verb)], "postprocess": makeLeaf('V')},
    {"name": "Word", "symbols": [(lexer.has("predicate") ? {type: "predicate"} : predicate)], "postprocess": makeLeaf('word')}
  ],
  ParserStart: "Fragment",
};

export default grammar;
