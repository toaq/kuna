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
# which runs as part of the "pnpm run codegen" step defined in package.json:
#
#     CP -> wa Clause_main
#     CPsub -> wä Clause_sub
#     Clause_main -> TP_main
#     Clause_sub -> TP_sub
#     TP_main -> T AspP_main
#     TP_sub -> T AspP_sub


@preprocessor typescript

@{%
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
	makeEvAP,
	makeEvAPdet,
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
# (shê ꝡä hao nä) hao
CPna<S> -> Clause<S> {% makeBranchCovertLeft('CP', 'C') %}

# jí
DP -> %pronoun Free:* {% makeLeaf('DP') %}
# háo/hụ́ꝡa
DP -> WordD Word {% makeBranch('DP') %}
# sá ...
DP -> D nPopt {% makeBranch('DP') %}
DP -> Dtonal nP {% makeBranch('DP') %}

# jî
DPincorp -> %incorporated_pronoun Free:* {% makeLeaf('DP') %}
# hụ̂ꝡa
DPincorp -> WordDincorp Word {% makeBranch('DP') %}
# sâ ...
DPincorp -> Dincorp nPopt {% makeBranch('DP') %}
DPincorp -> Dtonalincorp nP {% makeBranch('DP') %}

# ꝡá hao
DPsub -> D nPsub {% makeBranch('DP') %}
DPsub -> Dtonal nPsub {% makeBranch('DP') %}
# ꝡâ hao
DPsubincorp -> Dincorp nPsub {% makeBranch('DP') %}
DPsubincorp -> Dtonalincorp nPsub {% makeBranch('DP') %}

# (sá) ∅ hao
nP -> CPdet {% makeBranchCovertLeft('𝘯P', '𝘯') %}
# (sá) ∅
nPopt -> null {% makeEmptynP %}
nPopt -> nP {% id %}
# (sá) ꝡä hao
nPsub -> CPsub {% makeBranchCovertLeft('𝘯P', '𝘯') %}
# (sá) raı ꝡë hao
CPdet -> CPdet CPsubcon {% makeBranch('CP') %}
# (sá) ∅ hao
CPdet -> QSPdet {% makeBranchCovertLeft('CP', 'C', 'REL') %}

# ní bï pu hao
Clause<S> -> Argument Bi Clause<S> {% make3L('TopicP', "Topic'") %}
# pu hao
Clause<S> -> QSP<S> {% id %}
# jí nä pu hao hóa
Clause<S> -> Argument Na Clause<S> {% make3L('𝘷P', "𝘷'") %}
# râo fíachaq nä pu hao hóa
Clause<S> -> AdjunctPcon Na Clause<S> {% make3L('𝘷P', "𝘷'") %}
# shê ꝡä hao nä jıa hao
Clause<S> -> QT4 Csub Clause<sub> Na CPna<S> {% makeQP %}
# hao jí gö hao jí
Clause<S> -> QSP<main> Go Clause<S> {% makeRetroactiveCleft %}

# "QSP" is a SigmaP that can have a t1 quantifier in front.

# ao jeo pu chum hao jí
QSP<S> -> SigmaPcon<S> {% id %}
QSP<S> -> Q SigmaPcon<S> {% makeT1QP %}
QSP<S> -> Sigma Q SigmaPcon<S> {% makeSigmaT1QP %}

# (sá) ao hao
QSPdet -> SigmaPdet {% id %}
QSPdet -> Q SigmaPdet {% makeT1QP %}
QSPdet -> Sigma Q SigmaPdet {% makeSigmaT1QP %}

# jeo pu chum hao jí
SigmaPcon<S> -> SigmaP<S> {% id %}
SigmaPcon<S> -> SigmaP<S> Conjunction SigmaPcon<S> {% makeConn %}
SigmaP<S> -> TP<S> {% id %}
SigmaP<S> -> Sigmacon TP<S> {% makeBranch('ΣP') %}

# (sá) jeo pu chum hao
SigmaPdet -> TPdet {% id %}
SigmaPdet -> Sigmacon TPdet {% makeBranch('ΣP') %}

# pu chum hao jí
TP<S> -> Tconopt AspP<S> {% makeBranch('TP') %}
# ë marao óguı ráı
TP<S> -> EvA vP<sub> DPcon {% makeEvAP %}

# (sá) pu chum hao
TPdet -> Tconopt AspPdet {% makeBranch('TP') %}
# (sá) ë marao óguı
TPdet -> EvA vP<sub> {% makeEvAPdet %}

# chum hao jí
AspP<S> -> Aspconopt vP<S> {% makeBranch('AspP') %}

# (sá) chum hao
AspPdet -> Aspconopt vPdet {% makeBranch('AspP') %}

# tua hao tî kúe jí súq râo níchaq
vP<S> -> Serial AdjunctPcon:* (VocArgument:+ AdjunctPcon:*):? {% makevP<S> %}

# (sá) tua hao
vPdet -> Serialdet {% makevPdet %}

# ^ tı kúe
AdjunctP -> Adjunct Serial Argument {% makeAdjunctPT %}
# ^ jaq suaı
AdjunctP -> Adjunct Serial {% makeAdjunctPI %}

# tua hao
Serial -> V1:* Vlast {% makeSerial('*Serial') %}
# (sá) tua hao
Serialdet -> V1orKi:* Vlast {% makeSerial('*Serialdet') %}
V1orKi -> V1 {% id %}
V1orKi -> Ki {% id %}

Argument -> DPcon {% id %}
Argument -> DPsubcon {% id %}
Argincorp -> DPincorp {% id %}
Argincorp -> DPsubincorp {% id %}

DPcon -> DProi {% id %}
DPcon -> DProi Conjunction DPcon {% makeConn %}
DPcon -> DProi ConjunctionT1 DPsubcon {% makeConn %}
DProi -> DPfoc {% id %}
DProi -> DPfoc Roi DProi {% makeConn %}
DPfoc -> DP {% id %}
DPfoc -> Focus DP {% makeBranch('FocusP') %}
DPsubcon -> DPsubfoc {% id %}
DPsubcon -> DPsubfoc Conjunction DPsubcon {% makeConn %}
DPsubfoc -> DPsub {% id %}
DPsubfoc -> Focus DPsub {% makeBranch('FocusP') %}
DPsubincorpcon -> DPsubincorpfoc {% id %}
DPsubincorpcon -> DPsubincorpfoc Conjunction DPsubcon {% makeConn %}
DPsubincorpfoc -> DPsubincorp {% id %}
DPsubincorpfoc -> Focus DPsubincorp {% makeBranch('FocusP') %}
CPsubcon -> CPsub {% id %}
CPsubcon -> CPsub Conjunction CPsubcon {% makeConn %}
Sigmacon -> Sigma {% id %}
Sigmacon -> Sigma Conjunction Sigmacon {% makeConn %}
Tconopt -> Tcon:? {% makeOptLeaf('T') %}
Tcon -> T {% id %}
Tcon -> T_prefix {% id %}
Tcon -> T Conjunction Tcon {% makeConn %}
Aspconopt -> Aspcon:? {% makeOptLeaf('Asp') %}
Aspcon -> Asp {% id %}
Aspcon -> Asp_prefix {% id %}
Aspcon -> Asp Conjunction Aspcon {% makeConn %}
AdjunctPcon -> AdjunctPfoc {% id %}
AdjunctPcon -> AdjunctPfoc Conjunction AdjunctPcon {% makeConn %}
AdjunctPfoc -> AdjunctP {% id %}
AdjunctPfoc -> Focus AdjunctP {% makeBranch('FocusP') %}
Vlast -> Verb ConjunctionT1 Vlast {% makeConn %}
Vlast -> Verb {% id %}
Vlast -> Voiv Argument {% makeBranch('V') %}
Vlast -> Verb Argincorp {% makeBranch('V') %}
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
D -> %determiner Free:* {% makeLeaf('D') %}
Dincorp -> %incorporated_determiner Free:* {% makeLeaf('D') %}
Dtonal -> %tonal_determiner Free:* {% makeLeaf('D') %}
Dtonalincorp -> %tonal_incorporated_determiner Free:* {% makeLeaf('D') %}
EvA -> %event_accessor Free:* {% makeLeaf('EvA') %}
Focus -> %focus_particle Free:* {% makeLeaf('Focus') %}
Go -> %retroactive_cleft Free:* {% makeLeaf('𝘷') %}
WordD -> %word_determiner Free:* {% makeLeaf('D') %}
WordDincorp -> %incorporated_word_determiner Free:* {% makeLeaf('D') %}
Interjection -> %interjection {% makeLeaf('Interjection') %}
Ki -> %adjective_marker Free:* {% makeLeaf('Adjunct') %}
Mi -> %name_verb Free:* {% makeLeaf('mı') %}
Mo -> %text_quote Free:* {% makeLeaf('mo') %}
Q -> %quantifier Free:* {% makeLeaf('Q') %}
QT4 -> %quantifier_with_complement Free:* {% makeLeaf('Q') %}
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
