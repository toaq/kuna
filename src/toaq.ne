@preprocessor typescript

@{%
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
%}

# Pass your lexer object using the @lexer option:
@lexer lexer

Fragment -> SAP {% id %} | DP {% id %} | AdjunctP {% id %}
SAP -> CP SAopt {% makeBranch('SAP') %}

CP -> Copt TP {% makeBranch('CP') %}
CPsub -> Csub TP {% makeBranch('CP') %}
CPinc -> Cinc TP {% makeBranch('CP') %}
CPrel -> Crel TP {% makeBranch('CPrel') %}
CPdet -> TPdet {% makeBranchCovertLeft('CPrel', 'Crel') %}

DP -> %pronoun {% makeLeaf('DP') %}
DP -> D nP {% makeBranch('DP') %}
nP -> nP CPrel {% makeBranch('nP') %}
nP -> CPdet {% makeBranchFunctionalLeft('nP', 'n') %}

TP -> AspP {% makeBranchCovertLeft('TP', 'T') %}
TP -> T1 AspP {% makeBranch('TP') %}
TP -> Sigma T1 AspP {% make3L('ΣP', 'TP') %}
TPdet -> AspPdet {% makeBranchCovertLeft('TP', 'T') %}
TPdet -> T1 AspPdet {% makeBranch('TP') %}
TPdet -> Sigma T1 AspPdet {% make3L('ΣP', 'TP') %}

AspP -> vP {% makeBranchCovertLeft('AspP', 'Asp') %}
AspP -> Asp1 vP {% makeBranch('AspP') %}
AspP -> Sigma Asp1 vP {% make3L('ΣP', 'AspP') %}
AspPdet -> vPdet {% makeBranchCovertLeft('AspP', 'Asp') %}
AspPdet -> Asp1 vPdet {% makeBranch('AspP') %}
AspPdet -> Sigma Asp1 vPdet {% make3L('ΣP', 'AspP') %}

vP -> Serial AdjunctP1:* (term:+ AdjunctP1:*):? {% makevP %}
vPdet -> Serialdet {% makevPdet %}

AdjunctP -> Adjunct Serial DP1 {% makeAdjunctPT %}
AdjunctP -> Adjunct Serial {% makeAdjunctPI %}

Serial -> V1:+ {% makeSerial %}
Serialdet -> Serial {% id %}
Serialdet -> null {% makeCovertLeaf('V') %}

term -> DP1 {% id %} | CPsub {% id %}

DP1 -> DP {% id %}
DP1 -> DP Conjunction DP1 {% makeConn %}
T1 -> T {% id %}
T1 -> T Conjunction T1 {% makeConn %}
Asp1 -> Asp {% id %}
Asp1 -> Asp Conjunction Asp1 {% makeConn %}
AdjunctP1 -> AdjunctP {% id %}
AdjunctP1 -> AdjunctP Conjunction AdjunctP1 {% makeConn %}
V1 -> V {% id %}
V1 -> V ConjunctionT1 V1 {% makeConn %}

Adjunct -> %preposition {% makeLeaf('Adjunct') %}
Conjunction -> %conjunction {% makeLeaf('&') %}
ConjunctionT1 -> %conjunction_in_t1 {% makeLeaf('&') %}
ConjunctionT4 -> %conjunction_in_t4 {% makeLeaf('&') %}
Asp -> %aspect {% makeLeaf('Asp') %}
C -> %complementizer {% makeLeaf('C') %}
Copt -> C:? {% makeOptLeaf('C') %}
Csub -> %subordinating_complementizer {% makeLeaf('C') %}
Cinc -> %incorporated_complementizer {% makeLeaf('C') %}
Crel -> %relative_clause_complementizer {% makeLeaf('Crel') %}
Crelopt -> Crel:? {% makeOptLeaf('C') %}
D -> %determiner {% makeLeaf('D') %}
SA -> %illocution {% makeLeaf('SA') %}
SAopt -> SA:? {% makeOptLeaf('SA') %}
Sigma -> %polarity {% makeLeaf('Σ') %}
T -> %tense {% makeLeaf('T') %}
V -> %predicate {% makeLeaf('V') %}
