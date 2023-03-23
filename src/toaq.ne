@preprocessor typescript

@{%
import { ToaqTokenizer } from "./tokenize";
const {
	make3L,
	makeBranch,
	makeBranchCovertLeft,
	makeBranchFunctionalLeft,
    makeCovertLeaf,
	makeLeaf,
	makeOptLeaf,
	makeRose,
	makeRose2,
	makeSerial,
    makeSingleChild,
	makeWord,
	makevP,
} = require('./tree');
const lexer = new ToaqTokenizer();
%}

# Pass your lexer object using the @lexer option:
@lexer lexer

SAP -> CP SAopt {% makeBranch('SAP') %}

CP -> Copt TP {% makeBranch('CP') %}
CPsub -> Csub TP {% makeBranch('CP') %}
CPinc -> Cinc TP {% makeBranch('CP') %}
CPrel -> Crel TP {% makeBranch('CPrel') %}
CPdet -> TPdet {% makeBranchCovertLeft('CPrel', 'C') %}

DP -> %pronoun {% makeLeaf('DP') %}
DP -> D nP {% makeBranch('DP') %}
nP -> nP CPrel {% makeBranch('nP') %}
nP -> CPdet {% makeBranchFunctionalLeft('nP', 'n') %}

TP -> Topt AspP {% makeBranch('TP') %}
TP -> Sigma T AspP {% make3L('ΣP', 'TP') %}
TPdet -> Topt AspPdet {% makeBranch('TP') %}
TPdet -> Sigma T AspPdet {% make3L('ΣP', 'TP') %}

AspP -> Aspopt vP {% makeBranch('AspP') %}
AspP -> Sigma Asp vP {% make3L('ΣP', 'AspP') %}
AspPdet -> Aspopt vPdet {% makeBranch('AspP') %}
AspPdet -> Sigma Asp vPdet {% make3L('ΣP', 'AspP') %}

vP -> Serial term:* {% makevP %}
vPdet -> Serialdet {% makeSingleChild('*𝑣P') %}

Serial -> V:+ {% makeSerial %}
Serialdet -> Serial {% id %}
Serialdet -> null {% makeCovertLeaf('V') %}

term -> DP {% id %} | CPsub {% id %}

Adjunct -> %preposition {% makeLeaf('Adjunct') %}
Conjunction -> %conjunction {% makeLeaf('&') %}
ConjunctionT1 -> %conjunction_in_t1 {% makeLeaf('&') %}
ConjunctionT4 -> %conjunction_in_t4 {% makeLeaf('&') %}
Asp -> %aspect {% makeLeaf('Asp') %}
Aspopt -> Asp:? {% makeOptLeaf('Asp') %}
C -> %complementizer {% makeLeaf('C') %}
Copt -> C:? {% makeOptLeaf('C') %}
Csub -> %subordinating_complementizer {% makeLeaf('C') %}
Cinc -> %incorporated_complementizer {% makeLeaf('C') %}
Crel -> %relative_clause_complementizer {% makeLeaf('C') %}
Crelopt -> Crel:? {% makeOptLeaf('C') %}
D -> %determiner {% makeLeaf('D') %}
SA -> %illocution {% makeLeaf('SA') %}
SAopt -> SA:? {% makeOptLeaf('SA') %}
Sigma -> %polarity {% makeLeaf('Σ') %}
T -> %tense {% makeLeaf('T') %}
Topt -> T:? {% makeOptLeaf('T') %}
V -> %predicate {% makeLeaf('V') %}
