@preprocessor typescript

@{%
import { ToaqTokenizer } from "./tokenize";
const {
	make3L,
	makeAdjunctPI,
	makeAdjunctPT,
	makeBranch,
	makeBranchCovertLeft,
	makeConn,
    makeCovertLeaf,
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
} = require('./tree');
const lexer = new ToaqTokenizer();
%}

# Pass your lexer object using the @lexer option:
@lexer lexer

Fragment -> SAP {% id %} | term {% id %} | AdjunctP {% id %}

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
CPdet -> MTPdet {% makeBranchCovertLeft('CPrel', 'Crel') %}

# jí
DP -> %pronoun {% makeLeaf('DP') %}
# sá ...
DP -> D nP {% makeBranch('DP') %}
# kú jí
DP -> Focus DP {% makeBranch('FocusP') %}
# (sá) ꝡë hao
nP -> nP CPrel {% makeBranch('nP') %}
# (sá) ∅ hao
nP -> CPdet {% makeBranchCovertLeft('nP', 'n') %}

# ní bï pu hao
Clause -> term Bi Clause {% make3L('TopicP', "Topic'") %}
# pu hao
Clause -> MTP {% id %}
# jí nä pu hao hóa
Clause -> DP Na CPrelna {% make3L('𝘷P', "𝘷'") %}
# shê ꝡä hao nä jıa hao
Clause -> ModalP Na MTP {% make3L('𝘷P', "𝘷'") %}
ModalP -> ModalT4 CPsub {% makeBranch('ModalP') %}
# hao jí gö hao jí
Clause -> MTP Go Clause {% makeRetroactiveCleft %}

# "MTP" is a TP that can have a t1 modal in front.

# ao pu chum hao jí
MTP -> TP1 {% id %}
MTP -> Modal TP1 {% makeT1ModalvP %}
MTP -> Sigma Modal TP1 {% makeSigmaT1ModalvP %}

# (sá) ao hao
MTPdet -> TPdet {% id %}
MTPdet -> Modal TPdet {% makeT1ModalvP %}
MTPdet -> Sigma Modal TPdet {% makeSigmaT1ModalvP %}

# pu chum hao jí
TP1 -> TP {% id %}
TP1 -> TP Conjunction TP1 {% makeConn %}
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

term -> DP1 {% id %} | CPsub1 {% id %}

DP1 -> DP {% id %}
DP1 -> DP Conjunction DP1 {% makeConn %}
DP1 -> DP Roi DP1 {% makeConn %}
CPsub1 -> CPsub {% id %}
CPsub1 -> CPsub Conjunction CPsub1 {% makeConn %}
T1 -> T {% id %}
T1 -> T_prefix {% id %}
T1 -> T Conjunction T1 {% makeConn %}
Asp1 -> Asp {% id %}
Asp1 -> Asp_prefix {% id %}
Asp1 -> Asp Conjunction Asp1 {% makeConn %}
AdjunctP1 -> AdjunctP {% id %}
AdjunctP1 -> AdjunctP Conjunction AdjunctP1 {% makeConn %}
Vlast -> EvA vP {% makeBranch ('EvAP') %}
Vlast -> VPincorp {% id %}
Vlast -> VPoiv {% id %}
Vlast -> Verblike ConjunctionT1 Vlast {% makeConn %}
Vlast -> Verblike {% id %}
V1 -> Verblike {% id %}
V1 -> Verblike ConjunctionT1 V1 {% makeConn %}
Verblike -> Prefix Verblike {% makePrefixP %}
Verblike -> V {% id %}
Verblike -> ShuP {% id %}
ShuP -> Shu Word {% makeBranch('shuP') %}
Verblike -> TeoP {% id %}
TeoP -> MoP Teo {% makeBranch('teoP') %}
MoP -> Mo Text {% makeBranch('moP') %}
Verblike -> MiP {% id %}
MiP -> Mi Word {% makeBranch('mıP') %}

Adjunct -> %preposition {% makeLeaf('Adjunct') %}
Conjunction -> %conjunction {% makeLeaf('&') %}
ConjunctionT1 -> %conjunction_in_t1 {% makeLeaf('&') %}
ConjunctionT4 -> %conjunction_in_t4 {% makeLeaf('&') %}
Asp -> %aspect {% makeLeaf('Asp') %}
Asp_prefix -> %prefix_aspect {% makeLeaf('Asp') %}
Bi -> %topic_marker {% makeLeaf('Topic') %}
C -> %complementizer {% makeLeaf('C') %}
Copt -> C:? {% makeOptLeaf('C') %}
Csub -> %subordinating_complementizer {% makeLeaf('C') %}
Cincorp -> %incorporated_complementizer {% makeLeaf('C') %}
Crel -> %relative_clause_complementizer {% makeLeaf('Crel') %}
Crelopt -> Crel:? {% makeOptLeaf('C') %}
D -> %determiner {% makeLeaf('D') %}
Dincorp -> %incorporated_determiner {% makeLeaf('D') %}
EvA -> %event_accessor {% makeLeaf('EvA') %}
Focus -> %focus_particle {% makeLeaf('Focus') %}
Go -> %retroactive_cleft {% makeLeaf('𝘷') %}
Interjection -> %interjection {% makeLeaf('Interjection') %}
Mi -> %name_verb {% makeLeaf('mı') %}
Mo -> %text_quote {% makeLeaf('mo') %}
Modal -> %modality {% makeLeaf('Modal') %}
ModalT4 -> %modality_with_complement {% makeLeaf('Modal') %}
Na -> %cleft_verb {% makeLeaf('𝘷') %}
Prefix -> %prefix {% makePrefixLeaf %}
Roi -> %plural_coordinator {% makeLeaf('&') %}
SA -> %illocution {% makeLeaf('SA') %}
SAopt -> SA:? {% makeOptLeaf('SA') %}
Sigma -> %polarity {% makeLeaf('Σ') %}
Shu -> %word_quote {% makeLeaf('shu') %}
T -> %tense {% makeLeaf('T') %}
T_prefix -> %prefix_tense {% makeLeaf('T') %}
Teo -> %end_quote {% makeLeaf('teo') %}
# TODO: multiple-fragment quotes?
Text -> Fragment {% id %}
V -> %predicate {% makeLeaf('V') %}
Voiv -> %object_incorporating_verb {% makeLeaf('V') %}
# TODO: match all word types, not just predicate
Word -> %predicate {% makeLeaf('word') %}
