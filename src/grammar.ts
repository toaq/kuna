// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var pronoun: any;
declare var preposition: any;
declare var conjunction: any;
declare var conjunction_in_t1: any;
declare var conjunction_in_t4: any;
declare var aspect: any;
declare var complementizer: any;
declare var subordinating_complementizer: any;
declare var incorporated_complementizer: any;
declare var relative_clause_complementizer: any;
declare var determiner: any;
declare var illocution: any;
declare var polarity: any;
declare var tense: any;
declare var predicate: any;

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
    {"name": "SAP", "symbols": ["CP", "SAopt"], "postprocess": makeBranch('SAP')},
    {"name": "CP", "symbols": ["Copt", "TP"], "postprocess": makeBranch('CP')},
    {"name": "CPsub", "symbols": ["Csub", "TP"], "postprocess": makeBranch('CP')},
    {"name": "CPinc", "symbols": ["Cinc", "TP"], "postprocess": makeBranch('CP')},
    {"name": "CPrel", "symbols": ["Crel", "TP"], "postprocess": makeBranch('CPrel')},
    {"name": "CPdet", "symbols": ["TPdet"], "postprocess": makeBranchCovertLeft('CPrel', 'C')},
    {"name": "DP", "symbols": [(lexer.has("pronoun") ? {type: "pronoun"} : pronoun)], "postprocess": makeLeaf('DP')},
    {"name": "DP", "symbols": ["D", "nP"], "postprocess": makeBranch('DP')},
    {"name": "nP", "symbols": ["nP", "CPrel"], "postprocess": makeBranch('nP')},
    {"name": "nP", "symbols": ["CPdet"], "postprocess": makeBranchFunctionalLeft('nP', 'n')},
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
    {"name": "vP$ebnf$1", "symbols": []},
    {"name": "vP$ebnf$1", "symbols": ["vP$ebnf$1", "AdjunctP1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP$ebnf$2$subexpression$1$ebnf$1", "symbols": ["term"]},
    {"name": "vP$ebnf$2$subexpression$1$ebnf$1", "symbols": ["vP$ebnf$2$subexpression$1$ebnf$1", "term"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP$ebnf$2$subexpression$1$ebnf$2", "symbols": []},
    {"name": "vP$ebnf$2$subexpression$1$ebnf$2", "symbols": ["vP$ebnf$2$subexpression$1$ebnf$2", "AdjunctP1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vP$ebnf$2$subexpression$1", "symbols": ["vP$ebnf$2$subexpression$1$ebnf$1", "vP$ebnf$2$subexpression$1$ebnf$2"]},
    {"name": "vP$ebnf$2", "symbols": ["vP$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "vP$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "vP", "symbols": ["Serial", "vP$ebnf$1", "vP$ebnf$2"], "postprocess": makevP},
    {"name": "vPdet", "symbols": ["Serialdet"], "postprocess": makevPdet},
    {"name": "AdjunctP", "symbols": ["Adjunct", "Serial", "DP1"], "postprocess": makeAdjunctPT},
    {"name": "AdjunctP", "symbols": ["Adjunct", "Serial"], "postprocess": makeAdjunctPI},
    {"name": "Serial$ebnf$1", "symbols": ["V1"]},
    {"name": "Serial$ebnf$1", "symbols": ["Serial$ebnf$1", "V1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Serial", "symbols": ["Serial$ebnf$1"], "postprocess": makeSerial},
    {"name": "Serialdet", "symbols": ["Serial"], "postprocess": id},
    {"name": "Serialdet", "symbols": [], "postprocess": makeCovertLeaf('V')},
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
    {"name": "V1", "symbols": ["V"], "postprocess": id},
    {"name": "V1", "symbols": ["V", "ConjunctionT1", "V1"], "postprocess": makeConn},
    {"name": "Adjunct", "symbols": [(lexer.has("preposition") ? {type: "preposition"} : preposition)], "postprocess": makeLeaf('Adjunct')},
    {"name": "Conjunction", "symbols": [(lexer.has("conjunction") ? {type: "conjunction"} : conjunction)], "postprocess": makeLeaf('&')},
    {"name": "ConjunctionT1", "symbols": [(lexer.has("conjunction_in_t1") ? {type: "conjunction_in_t1"} : conjunction_in_t1)], "postprocess": makeLeaf('&')},
    {"name": "ConjunctionT4", "symbols": [(lexer.has("conjunction_in_t4") ? {type: "conjunction_in_t4"} : conjunction_in_t4)], "postprocess": makeLeaf('&')},
    {"name": "Asp", "symbols": [(lexer.has("aspect") ? {type: "aspect"} : aspect)], "postprocess": makeLeaf('Asp')},
    {"name": "C", "symbols": [(lexer.has("complementizer") ? {type: "complementizer"} : complementizer)], "postprocess": makeLeaf('C')},
    {"name": "Copt$ebnf$1", "symbols": ["C"], "postprocess": id},
    {"name": "Copt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Copt", "symbols": ["Copt$ebnf$1"], "postprocess": makeOptLeaf('C')},
    {"name": "Csub", "symbols": [(lexer.has("subordinating_complementizer") ? {type: "subordinating_complementizer"} : subordinating_complementizer)], "postprocess": makeLeaf('C')},
    {"name": "Cinc", "symbols": [(lexer.has("incorporated_complementizer") ? {type: "incorporated_complementizer"} : incorporated_complementizer)], "postprocess": makeLeaf('C')},
    {"name": "Crel", "symbols": [(lexer.has("relative_clause_complementizer") ? {type: "relative_clause_complementizer"} : relative_clause_complementizer)], "postprocess": makeLeaf('C')},
    {"name": "Crelopt$ebnf$1", "symbols": ["Crel"], "postprocess": id},
    {"name": "Crelopt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Crelopt", "symbols": ["Crelopt$ebnf$1"], "postprocess": makeOptLeaf('C')},
    {"name": "D", "symbols": [(lexer.has("determiner") ? {type: "determiner"} : determiner)], "postprocess": makeLeaf('D')},
    {"name": "SA", "symbols": [(lexer.has("illocution") ? {type: "illocution"} : illocution)], "postprocess": makeLeaf('SA')},
    {"name": "SAopt$ebnf$1", "symbols": ["SA"], "postprocess": id},
    {"name": "SAopt$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "SAopt", "symbols": ["SAopt$ebnf$1"], "postprocess": makeOptLeaf('SA')},
    {"name": "Sigma", "symbols": [(lexer.has("polarity") ? {type: "polarity"} : polarity)], "postprocess": makeLeaf('Σ')},
    {"name": "T", "symbols": [(lexer.has("tense") ? {type: "tense"} : tense)], "postprocess": makeLeaf('T')},
    {"name": "V", "symbols": [(lexer.has("predicate") ? {type: "predicate"} : predicate)], "postprocess": makeLeaf('V')}
  ],
  ParserStart: "Fragment",
};

export default grammar;
