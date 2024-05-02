# This is a "nearleyjs grammar with Kuna extensions" file.
# It supports "generics" and #ifdef blocks:
#
#     CP -> wa Clause<main>
#     CPsub -> wä Clause<sub>
#     Clause<S> -> TP<S>
#     #ifdef EXPERIMENT
#     TP<S> -> T T? AspP<S>
#     #else
#     TP<S> -> T AspP<S>
#     #endif
#
# It is converted into plain nearleyjs syntax by src/grammar-preprocessor.ts,
# which runs as part of the "npm run codegen" step defined in package.json:
#
#     CP -> wa Clause_main
#     CPsub -> wä Clause_sub
#     Clause_main -> TP_main
#     Clause_sub -> TP_sub
#     TP_main -> T AspP_main
#     TP_sub -> T AspP_sub


@preprocessor typescript

@{%
import { ToaqTokenizer } from "./tokenize";
import * as TreeModule from "./tree";

const {
	make3L,
	make3LCovertLeft,
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
	makevP_main,
	makevP_sub,
	makevPdet,
} = TreeModule as any;
const lexer = new ToaqTokenizer();
%}

# Pass your lexer object using the @lexer option:
@lexer lexer

Fragment -> Free Fragment {% a => a[1] %}
Fragment -> Discourse {% id %}
Fragment -> Argument {% id %}
Fragment -> AdjunctPcon {% id %}

# ꝡa hao da. ꝡa hao da
Discourse -> SAP Discourse {% makeDiscourse %}
Discourse -> SAP {% id %}

# ꝡa hao da
SAP -> CP SAopt {% makeBranch('SAP') %}

# ꝡa hao
CP -> Copt Clause<main> {% makeBranch('CP') %}
# ꝡä hao
CPsub -> Csub Clause<sub> {% makeBranch('CP') %}
# ꝡâ hao
CPincorp -> Cincorp Clause<sub> {% make3LCovertLeft('DP', 'D', 'CP') %}
# ꝡë hao
CPrel -> Crel Clause<sub> {% makeBranch('CPrel') %}
# (nä) hao
CPrelna<S> -> Clause<S> {% makeBranchCovertLeft('CPrel', 'Crel') %}
# (sá) ∅ hao
CPdet -> MTPdet {% makeBranchCovertLeft('CPrel', 'Crel') %}

# jí
DP -> %pronoun Free:* {% makeLeaf('DP') %}
# hụ́ꝡa
DP -> Hu Word {% makeBranch('DP') %}
# sá ...
DP -> D nP {% makeBranch('DP') %}
# (sá) ꝡë hao
nP -> nP CPrelcon {% makeBranch('𝘯P') %}
# (sá) ∅ hao
nP -> CPdet {% makeBranchCovertLeft('𝘯P', '𝘯') %}

# ní bï pu hao
Clause<S> -> Argument Bi Clause<S> {% make3L('TopicP', "Topic'") %}
# pu hao
Clause<S> -> MTP<S> {% id %}
# jí nä pu hao hóa
Clause<S> -> Argument Na CPrelna<S> {% make3L('𝘷P', "𝘷'") %}
# râo fíachaq nä pu hao hóa
Clause<S> -> AdjunctPcon Na CPrelna<S> {% make3L('𝘷P', "𝘷'") %}
# shê ꝡä hao nä jıa hao
Clause<S> -> ModalP Na MTP<S> {% make3L('𝘷P', "𝘷'") %}
ModalP -> ModalT4 CPsub {% makeBranch('ModalP') %}
# hao jí gö hao jí
Clause<S> -> MTP<main> Go Clause<S> {% makeRetroactiveCleft %}

# "MTP" is a TP that can have a t1 modal in front.

# ao pu chum hao jí
MTP<S> -> TPcon<S> {% id %}
MTP<S> -> Modal TPcon<S> {% makeT1ModalvP %}
MTP<S> -> Sigma Modal TPcon<S> {% makeSigmaT1ModalvP %}

# (sá) ao hao
MTPdet -> TPdet {% id %}
MTPdet -> Modal TPdet {% makeT1ModalvP %}
MTPdet -> Sigma Modal TPdet {% makeSigmaT1ModalvP %}

# pu chum hao jí
TPcon<S> -> TP<S> {% id %}
TPcon<S> -> TP<S> Conjunction TPcon<S> {% makeConn %}
TP<S> -> Tcon AspP<S> {% makeBranch('TP') %}
TP<S> -> Sigma Tcon AspP<S> {% make3L('ΣP', 'TP') %}
# ë marao óguı ráı
TP<S> -> EvA vP<sub> DPcon {% makeEvAP %}

# (sá) pu chum hao
TPdet -> Tcon AspPdet {% makeBranch('TP') %}
TPdet -> Sigma Tcon AspPdet {% make3L('ΣP', 'TP') %}
# (sá) ë marao óguı
TPdet -> EvA vP<sub> {% makeEvAPdet %}

# chum hao jí
AspP<S> -> Aspcon vP<S> {% makeBranch('AspP') %}

# (sá) chum hao
AspPdet -> Aspcon vPdet {% makeBranch('AspP') %}

# tua hao tî kúe jí súq râo níchaq
vP<S> -> Serial AdjunctPcon:* (VocArgument:+ AdjunctPcon:*):? {% makevP<S> %}

# (sá) tua hao
vPdet -> Serialdet {% makevPdet %}

# ^ tı kúe
AdjunctP -> Adjunct Serial Argument {% makeAdjunctPT %}
# ^ jaq suaı
AdjunctP -> Adjunct Serial {% makeAdjunctPI %}

# tua hao
Serial -> V1orKi:* Vlast {% makeSerial %}
V1orKi -> V1 {% id %}
V1orKi -> Ki {% id %}
# (sá) tua hao
Serialdet -> Serial {% id %}
# (sá) ∅
Serialdet -> null {% makeEmptySerial() %}

# hao sâ ...
VPincorp -> V DPincorp {% makeBranch('VP') %}
# hao ꝡâ ...
VPincorp -> V CPincorp {% makeBranch('VP') %}
# jî
DPincorp -> %incorporated_pronoun Free:* {% makeLeaf('DP') %}
# hụ̂ꝡa
DPincorp -> Huincorp Word {% makeBranch('DP') %}
# sâ ...
DPincorp -> Dincorp nP {% makeBranch('DP') %}
# po sá ...
VPoiv -> Voiv DPcon {% makeBranch('VP') %}

Argument -> DPcon {% id %}
Argument -> CPargcon {% id %}

DPcon -> DProi {% id %}
DPcon -> DProi Conjunction DPcon {% makeConn %}
DPcon -> DProi ConjunctionT1 CPargcon {% makeConn %}
DProi -> DPfoc {% id %}
DProi -> DPfoc Roi DProi {% makeConn %}
DPfoc -> DP {% id %}
DPfoc -> Focus DP {% makeBranch('FocusP') %}
CPargcon -> CPargfoc {% id %}
CPargcon -> CPargfoc Conjunction CPargcon {% makeConn %}
CPargfoc -> CParg {% id %}
CPargfoc -> Focus CParg {% makeBranch('FocusP') %}
CParg -> CPsub {% makeBranchCovertLeft('DP', 'D') %}
CPrelcon -> CPrel {% id %}
CPrelcon -> CPrel Conjunction CPrelcon {% makeConn %}
Tcon -> null {% makeCovertLeaf('T') %}
Tcon -> T {% id %}
Tcon -> T_prefix {% id %}
Tcon -> T Conjunction Tcon {% makeConn %}
Aspcon -> null {% makeCovertLeaf('Asp') %}
Aspcon -> Asp {% id %}
Aspcon -> Asp_prefix {% id %}
Aspcon -> Asp Conjunction Aspcon {% makeConn %}
AdjunctPcon -> AdjunctPfoc {% id %}
AdjunctPcon -> AdjunctPfoc Conjunction AdjunctPcon {% makeConn %}
AdjunctPfoc -> AdjunctP {% id %}
AdjunctPfoc -> Focus AdjunctP {% makeBranch('FocusP') %}
Vlast -> VPincorp {% id %}
Vlast -> VPoiv {% id %}
Vlast -> Verb ConjunctionT1 Vlast {% makeConn %}
Vlast -> Verb {% id %}
V1 -> Verb {% id %}
V1 -> Verb ConjunctionT1 V1 {% makeConn %}
Verb -> Prefix Verb {% makePrefixP %}
Verb -> V {% id %}
Verb -> ShuP {% id %}
ShuP -> Shu Word {% makeBranch('shuP') %}
Verb -> TeoP {% id %}
TeoP -> MoP Teo {% makeBranch('teoP') %}
MoP -> Mo Text {% makeBranch('moP') %}
Verb -> MiP {% id %}
MiP -> Mi Word {% makeBranch('mıP') %}

Adjunct -> %preposition Free:* {% makeLeaf('Adjunct') %}
Conjunction -> %conjunction Free:* {% makeLeaf('&') %}
Conjunction -> PrefixNa V {% makeBranch('&(naP)') %}
ConjunctionT1 -> %conjunction_in_t1 Free:* {% makeLeaf('&') %}
ConjunctionT1 -> PrefixNaT1 V {% makeBranch('&(naP)') %}
ConjunctionT4 -> %conjunction_in_t4 Free:* {% makeLeaf('&') %}
ConjunctionT4 -> PrefixNaT4 V {% makeBranch('&(naP)') %}
Asp -> %aspect Free:* {% makeLeaf('Asp') %}
Asp_prefix -> %prefix_aspect Free:* {% makeLeaf('Asp') %}
Bi -> %topic_marker Free:* {% makeLeaf('Topic') %}
C -> %complementizer Free:* {% makeLeaf('C') %}
Copt -> C:? {% makeOptLeaf('C') %}
Csub -> %subordinating_complementizer Free:* {% makeLeaf('C') %}
Cincorp -> %incorporated_complementizer Free:* {% makeLeaf('C') %}
Crel -> %relative_clause_complementizer Free:* {% makeLeaf('Crel') %}
Crelopt -> Crel:? {% makeOptLeaf('C') %}
D -> %determiner Free:* {% makeLeaf('D') %}
Dincorp -> %incorporated_determiner Free:* {% makeLeaf('D') %}
EvA -> %event_accessor Free:* {% makeLeaf('EvA') %}
Focus -> %focus_particle Free:* {% makeLeaf('Focus') %}
Go -> %retroactive_cleft Free:* {% makeLeaf('𝘷') %}
Hu -> %prefix_pronoun Free:* {% makeLeaf('D') %}
Huincorp -> %incorporated_prefix_pronoun Free:* {% makeLeaf('D') %}
Interjection -> %interjection {% makeLeaf('Interjection') %}
Ki -> %adjective_marker Free:* {% makeLeaf('𝘢') %}
Mi -> %name_verb Free:* {% makeLeaf('mı') %}
Mo -> %text_quote Free:* {% makeLeaf('mo') %}
Modal -> %modality Free:* {% makeLeaf('Modal') %}
ModalT4 -> %modality_with_complement Free:* {% makeLeaf('Modal') %}
Na -> %cleft_verb Free:* {% makeLeaf('𝘷') %}
Prefix -> %prefix {% makePrefixLeaf %}
Prefix -> %focus_particle_prefix_form {% makePrefixLeaf %}
PrefixNa -> %prefix_conjunctionizer {% makePrefixLeaf %}
PrefixNaT1 -> %prefix_conjunctionizer_in_t1 {% makePrefixLeaf %}
PrefixNaT4 -> %prefix_conjunctionizer_in_t4 {% makePrefixLeaf %}
Roi -> %plural_coordinator Free:* {% makeLeaf('&') %}
SA -> %illocution Free:* {% makeLeaf('SA') %}
SAopt -> SA:? {% makeOptLeaf('SA') %}
Sigma -> %polarity Free:* {% makeLeaf('Σ') %}
Shu -> %word_quote Free:* {% makeLeaf('shu') %}
T -> %tense Free:* {% makeLeaf('T') %}
T_prefix -> %prefix_tense Free:* {% makeLeaf('T') %}
Text -> %text Free:* {% makeLeaf('text') %}
Teo -> %end_quote Free:* {% makeLeaf('teo') %}
V -> %predicate Free:* {% makeLeaf('V') %}
Voiv -> %predicatizer Free:* {% makeLeaf('V') %}
Word -> %word Free:* {% makeLeaf('word') %}

VocativeP -> Vocative Argument {% makeBranch('VocativeP') %}
Vocative -> %vocative {% makeLeaf('Vocative') %}
VocArgument -> Argument {% id %}
VocArgument -> VocativeP {% id %}
Parenthetical -> %start_parenthetical Fragment %end_parenthetical {% id %}

Free -> Interjection {% id %}
Free -> Parenthetical {% id %}
