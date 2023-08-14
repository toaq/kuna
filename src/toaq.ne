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

# ua, ꝡa hao da
SAP -> Interjection SAP {% makeBranch('InterjectionP') %}
# ꝡa hao da
SAP -> CP SAopt {% makeBranch('SAP') %}

# ꝡa hao
CP -> Copt Clause {% makeBranch('CP') %}
# ꝡä hao
CPsub -> Csub Clause {% makeBranch('CP') %}
# ꝡâ hao
CPincorp -> Cincorp Clause {% makeBranch('CP') %}
# ꝡë hao
CPrel -> Crel Clause {% makeBranch('CPrel') %}
# (nä) hao
CPrelna -> Clause {% makeBranchCovertLeft('CPrel', 'Crel') %}
# (sá) ∅ hao
CPdet -> TPdet {% makeBranchCovertLeft('CPrel', 'Crel') %}

# jí
DP -> %pronoun {% makeLeaf('DP') %}
# sá ...
DP -> D nP {% makeBranch('DP') %}
# (sá) ꝡë hao
nP -> nP CPrel {% makeBranch('nP') %}
# (sá) ∅ hao
nP -> CPdet {% makeBranchFunctionalLeft('nP', 'n') %}

# pu hao
Clause -> TP {% id %}
# ní bï pu hao
Clause -> DP Bi Clause {% make3L('TopicP', "Topic'") %}
# jí nä pu hao hóa
Clause -> DP Na CPrelna {% make3L('𝘷P', "𝘷'") %}

# pu chum hao jí
TP -> AspP {% makeBranchCovertLeft('TP', 'T') %}
TP -> T1 AspP {% makeBranch('TP') %}
TP -> Sigma T1 AspP {% make3L('ΣP', 'TP') %}

# (sá) pu chum hao
TPdet -> AspPdet {% makeBranchCovertLeft('TP', 'T') %}
TPdet -> T1 AspPdet {% makeBranch('TP') %}
TPdet -> Sigma T1 AspPdet {% make3L('ΣP', 'TP') %}

# chum hao jí
AspP -> vP {% makeBranchCovertLeft('AspP', 'Asp') %}
AspP -> Asp1 vP {% makeBranch('AspP') %}
AspP -> Sigma Asp1 vP {% make3L('ΣP', 'AspP') %}

# (sá) chum hao
AspPdet -> vPdet {% makeBranchCovertLeft('AspP', 'Asp') %}
AspPdet -> Asp1 vPdet {% makeBranch('AspP') %}
AspPdet -> Sigma Asp1 vPdet {% make3L('ΣP', 'AspP') %}

# bu hao jí
vP -> Sigma vPinner {% makeBranch('ΣP') %}
# hao jí
vP -> vPinner {% id %}

# tua hao tî kúe jí súq râo níchaq
vPinner -> Serial AdjunctP1:* (term:+ AdjunctP1:*):? {% makevP %}
# (sá) tua hao
vPdet -> Serialdet {% makevPdet %}

# ^ tı kúe
AdjunctP -> Adjunct Serial term {% makeAdjunctPT %}
# ^ jaq suaı
AdjunctP -> Adjunct Serial {% makeAdjunctPI %}

# tua hao
Serial -> V1:* Vlast {% makeSerial %}
# (sá) tua hao
Serialdet -> Serial {% id %}
# (sá) ∅
Serialdet -> null {% makeCovertLeaf('V') %}

# hao sâ ...
VPincorp -> V DPincorp {% makeBranch('VP') %}
# hao ꝡâ ...
VPincorp -> V CPincorp {% makeBranch('VP') %}
# jî
DPincorp -> %incorporated_pronoun {% makeLeaf('DP') %}
# sâ ...
DPincorp -> Dincorp nP {% makeBranch('DP') %}
# po sá ...
VPoiv -> Voiv DP {% makeBranch('VP') %}

term -> DP1 {% id %} | CPsub {% id %}

DP1 -> DP {% id %}
DP1 -> DP Conjunction DP1 {% makeConn %}
T1 -> T {% id %}
T1 -> T Conjunction T1 {% makeConn %}
Asp1 -> Asp {% id %}
Asp1 -> Asp Conjunction Asp1 {% makeConn %}
AdjunctP1 -> AdjunctP {% id %}
AdjunctP1 -> AdjunctP Conjunction AdjunctP1 {% makeConn %}
Vlast -> Verblike {% id %}
Vlast -> VPincorp {% id %}
Vlast -> VPoiv {% id %}
Vlast -> Verblike ConjunctionT1 Vlast {% makeConn %}
V1 -> Verblike {% id %}
V1 -> Verblike ConjunctionT1 V1 {% makeConn %}
Verblike -> V {% id %}
Verblike -> ShuP {% id %}
ShuP -> Shu Word {% makeBranch('shuP') %}
Verblike -> MiP {% id %}
MiP -> Mi Word {% makeBranch('mıP') %}

Adjunct -> %preposition {% makeLeaf('Adjunct') %}
Conjunction -> %conjunction {% makeLeaf('&') %}
ConjunctionT1 -> %conjunction_in_t1 {% makeLeaf('&') %}
ConjunctionT4 -> %conjunction_in_t4 {% makeLeaf('&') %}
Asp -> %aspect {% makeLeaf('Asp') %}
Bi -> %topic_marker {% makeLeaf('Topic') %}
C -> %complementizer {% makeLeaf('C') %}
Copt -> C:? {% makeOptLeaf('C') %}
Csub -> %subordinating_complementizer {% makeLeaf('C') %}
Cincorp -> %incorporated_complementizer {% makeLeaf('C') %}
Crel -> %relative_clause_complementizer {% makeLeaf('Crel') %}
Crelopt -> Crel:? {% makeOptLeaf('C') %}
D -> %determiner {% makeLeaf('D') %}
Dincorp -> %incorporated_determiner {% makeLeaf('D') %}
Interjection -> %interjection {% makeLeaf('Interjection') %}
Mi -> %name_verb {% makeLeaf('mı') %}
Na -> %cleft_verb {% makeLeaf('𝘷') %}
SA -> %illocution {% makeLeaf('SA') %}
SAopt -> SA:? {% makeOptLeaf('SA') %}
Sigma -> %polarity {% makeLeaf('Σ') %}
Shu -> %word_quote {% makeLeaf('shu') %}
T -> %tense {% makeLeaf('T') %}
V -> %predicate {% makeLeaf('V') %}
Voiv -> %object_incorporating_verb {% makeLeaf('V') %}
# TODO: match all word types, not just predicate
Word -> %predicate {% makeLeaf('word') %}
