import { type ToaqToken, ToaqTokenizer } from '../morphology/tokenize';
import {
	type Label,
	type Leaf,
	PRO,
	type SerialTree,
	type Tree,
	catSource,
	makeEmptySerial,
	makeEvAP,
	makeLeaf,
	makeNull,
	makePrefixLeaf,
	makePrefixP,
	makeRetroactiveCleft,
	makeSigmaT1ModalvP,
	makeT1ModalvP,
	serialArity,
} from '../tree';
import { ParseError } from './error';

enum ClauseType {
	Main = 0,
	Sub = 1,
	Det = 2,
	Incorp = 3,
}

export class RecursiveDescentParser {
	private tokenIndex = 0;
	private tokens: ToaqToken[];
	private lines: string[];
	constructor(private text: string) {
		const tokenizer = new ToaqTokenizer();
		tokenizer.reset(text);
		this.tokens = tokenizer.tokens;
		this.lines = text.split('\n');
	}

	//#region Basic API

	private error(
		baseMessage: string,
		hints: Record<string, string> = {},
	): ParseError {
		let message = baseMessage;
		const token = this.peek();
		if (token) {
			const hint = hints[token.type];
			if (hint) message += `\n(Hint: ${hint})`;
			return new ParseError(token, message, this.lines[token.position.line]);
		}
		return new ParseError(undefined, message);
	}

	private peek(): ToaqToken | undefined {
		return this.tokens[this.tokenIndex];
	}

	private next(): ToaqToken | undefined {
		return this.tokens[this.tokenIndex++];
	}

	private eat(type: string): ToaqToken | undefined {
		const next = this.peek();
		if (next?.type === type) {
			this.tokenIndex++;
			return next;
		}
	}

	private eatEOF(): boolean {
		return this.tokenIndex >= this.tokens.length;
	}

	private expectEOF(): void {
		if (!this.eatEOF()) {
			throw this.error('I expected the sentence to end here.', {
				pronoun: 'Maybe there are too many arguments.',
				D: 'Maybe there are too many arguments.',
			});
		}
	}

	private skipFree(): void {
		const startParenthetical = this.eat('start_parenthetical');
		if (startParenthetical) {
			while (!this.eat('end_parenthetical')) this.expectFragment(false);
			this.skipFree();
		}
		const interjection = this.eat('interjection');
		if (interjection) {
			this.skipFree();
		}
	}

	private eatLeaf(tokenType: string, label: Label): Leaf | undefined {
		this.skipFree();
		const token = this.eat(tokenType);
		if (token) {
			return makeLeaf(label)([token, []]);
		}
	}

	private eatPrefixLeaf(tokenType: string): Leaf | undefined {
		const token = this.eat(tokenType);
		if (token) {
			return makePrefixLeaf([token]);
		}
	}

	private makeBranch(label: Label, left: Tree, right: Tree) {
		return { label, left, right, source: catSource(left, right) };
	}

	//#endregion Basic API

	//#region Combinators

	private conjoined(
		what: string,
		eat: () => Tree | undefined,
		eatConj_?: () => Tree | undefined,
	): Tree | undefined {
		const eatConj = eatConj_ ?? (() => this.eatConjunction());
		const left = eat();
		if (!left) return undefined;
		const preConj = this.tokenIndex;
		const conj = eatConj();
		if (conj) {
			const right = this.conjoined(what, eat, eatConj);
			if (!right) {
				// throw this.error(
				// 	`This ${conj.source} must be followed by another ${what}.`,
				// );
				this.tokenIndex = preConj;
				return left;
			}
			return this.makeBranch('&P', left, this.makeBranch("&'", conj, right));
		}
		return left;
	}

	private focusable(eat: () => Tree | undefined): Tree | undefined {
		const old = this.tokenIndex;
		const focus = this.eatFocus();
		if (focus) {
			const right = eat();
			if (!right) {
				this.tokenIndex = old;
				return undefined;
			}
			return this.makeBranch('FocusP', focus, right);
		}
		return eat();
	}

	// #endregion Combinators

	// #region Sentence structure

	// Fragment -> Free Fragment {% a => a[1] %}
	// Fragment -> Discourse {% id %}
	// Fragment -> Argument {% id %}
	// Fragment -> AdjunctPcon {% id %}

	public expectFragment(expectEOF = true): Tree {
		// We can't tell DPs from SAPs without backtracking because of fronted subjects.
		const index = this.tokenIndex;
		const DP = this.eatDPcon();
		if (DP) {
			if (!expectEOF || this.eatEOF()) {
				return DP;
			}
		}
		this.tokenIndex = index;
		const AdjunctP = this.eatAdjunctPcon();
		if (AdjunctP) {
			if (!expectEOF || this.eatEOF()) {
				return AdjunctP;
			}
		}
		this.tokenIndex = index;
		const SAP = this.expectSAP();
		if (expectEOF) this.expectEOF();
		return SAP;
	}

	// # ꝡa hao da
	// SAP -> CP SAopt {% makeBranch('SAP') %}

	private expectSAP(): Tree {
		const CP = this.expectCP(ClauseType.Main);
		const SA = this.eatSA() ?? makeNull('SA');
		return {
			label: 'SAP',
			left: CP,
			right: SA,
			source: catSource(CP, SA),
		};
	}

	// # ꝡa hao
	// CP -> Copt Clause<main> {% makeBranch('CP') %}
	// # ꝡä hao
	// CPsub -> Csub Clause<sub> {% makeBranch('CP') %}
	// # ꝡâ hao
	// CPincorp -> Cincorp Clause<sub> {% make3LCovertLeft('DP', 'D', 'CP') %}
	// # (shê ꝡä hao nä) hao
	// CPna<S> -> Clause<S> {% makeBranchCovertLeft('CP', 'C') %}
	// # ꝡë hao
	// CPrel -> Crel Clause<sub> {% makeBranch('CPrel') %}
	// # (ráı nä) hao
	// CPrelna<S> -> Clause<S> {% makeBranchCovertLeft('CPrel', 'Crel') %}
	// # (sá) ∅ hao
	// CPdet -> MSPdet {% makeBranchCovertLeft('CPrel', 'Crel') %}

	private expectCP(clauseType: ClauseType, nullC?: boolean): Tree {
		let C: Tree;
		if (nullC) {
			C = makeNull('C');
		} else if (clauseType === ClauseType.Main) {
			C = this.eatC() ?? makeNull('C');
		} else if (clauseType === ClauseType.Incorp) {
			C = this.eatCincorp()!;
		} else {
			C = this.eatCsub()!;
		}
		const clause = this.expectClause(clauseType);
		return this.makeBranch('CP', C, clause);
	}

	private eatCPrel(nullC?: boolean): Tree | undefined {
		const Crel = nullC ? makeNull('Crel') : this.eatCrel();
		if (!Crel) return undefined;
		const clause = this.expectClause(ClauseType.Sub);
		return this.makeBranch('CPrel', Crel, clause);
	}

	private expectCPdet(): Tree {
		const MSP = this.expectMSP(ClauseType.Det);
		return this.makeBranch('CPrel', makeNull('Crel'), MSP);
	}

	// # jí
	// DP -> %pronoun Free:* {% makeLeaf('DP') %}
	// # hụ́ꝡa
	// DP -> Hu Word {% makeBranch('DP') %}
	// # sá ...
	// DP -> D nP {% makeBranch('DP') %}

	private eatDP(): Tree | undefined {
		return (
			this.eatLeaf('pronoun', 'DP') ??
			this.eatHuPronoun('prefix_pronoun') ??
			this.eatDnP('determiner')
		);
	}

	private eatHuPronoun(_tokenType: string): Tree | undefined {
		const Hu = this.eatLeaf('prefix_pronoun', 'D');
		if (!Hu) return undefined;
		const word = this.eatWord();
		if (!word) throw this.error('hu- must be attached to a word.');
		return this.makeBranch('DP', Hu, word);
	}

	private eatDnP(tokenType: string): Tree | undefined {
		const D = this.eatLeaf(tokenType, 'D');
		if (!D) return undefined;
		const nP = this.expectnP();
		return this.makeBranch('DP', D, nP);
	}

	// # (sá) ꝡë hao
	// nP -> nP CPrelcon {% makeBranch('𝘯P') %}
	// # (sá) ∅ hao
	// nP -> CPdet {% makeBranchCovertLeft('𝘯P', '𝘯') %}

	private expectnP(): Tree {
		const CPdet = this.expectCPdet();
		const inner = this.makeBranch('𝘯P', makeNull('𝘯'), CPdet);
		const CPrelcon = this.eatCPrelcon();
		if (CPrelcon) {
			return this.makeBranch('𝘯P', inner, CPrelcon);
		}
		return inner;
	}

	// # ní bï pu hao
	// Clause<S> -> Argument Bi Clause<S> {% make3L('TopicP', "Topic'") %}
	// # pu hao
	// Clause<S> -> MSP<S> {% id %}
	// # jí nä pu hao hóa
	// Clause<S> -> Argument Na CPrelna<S> {% make3L('𝘷P', "𝘷'") %}
	// # râo fíachaq nä pu hao hóa
	// Clause<S> -> AdjunctPcon Na CPrelna<S> {% make3L('𝘷P', "𝘷'") %}
	// # shê ꝡä hao nä jıa hao
	// Clause<S> -> ModalP Na CPna<S> {% make3L('𝘷P', "𝘷'") %}
	// # hao jí gö hao jí
	// Clause<S> -> MSP<main> Go Clause<S> {% makeRetroactiveCleft %}

	private expectClause(clauseType: ClauseType): Tree {
		const argument = this.eatArgument();
		if (argument) {
			const bi = this.eatBi();
			if (bi) {
				return this.makeBranch(
					'TopicP',
					argument,
					this.makeBranch("Topic'", bi, this.expectClause(clauseType)),
				);
			}
			const na = this.eatNa();
			if (na) {
				return this.makeBranch(
					'𝘷P',
					argument,
					this.makeBranch("𝘷'", na, this.eatCPrel(true)!),
				);
			}
			throw this.error(
				'This clause starts with a fronted subject or topic, so I expected bï or nä. (Maybe you forgot the verb.)',
			);
		}
		const adjunctp = this.eatAdjunctPcon();
		if (adjunctp) {
			const na = this.eatNa();
			if (na) {
				return this.makeBranch(
					'𝘷P',
					adjunctp,
					this.makeBranch("𝘷'", na, this.eatCPrel(true)!),
				);
			}
			throw this.error('Adjunct phrases cannot be fronted without nä.');
		}
		const modalp = this.eatModalP();
		if (modalp) {
			const na = this.eatNa();
			if (na) {
				return this.makeBranch(
					'𝘷P',
					modalp,
					this.makeBranch("𝘷'", na, this.expectCP(clauseType, true)!),
				);
			}
			throw this.error('This ModalP is missing nä.');
		}

		const interjection = this.eatInterjection();
		if (interjection) {
			return this.expectClause(clauseType);
		}

		// Nothing is fronted, so parse the verbal complex:
		const MSP = this.expectMSP(clauseType);
		const go = this.eatGo();
		if (go) {
			return makeRetroactiveCleft([MSP, go, this.expectClause(clauseType)]);
		}
		return MSP;
	}

	// ModalP -> ModalT4 CPsub {% makeBranch('ModalP') %}

	private eatModalP(): Tree | undefined {
		const modal = this.eatModalT4();
		if (modal) {
			const CP = this.expectCP(ClauseType.Sub);
			return this.makeBranch('ModalP', modal, CP);
		}
	}

	// # "MSP" is a SigmaP that can have a t1 modal in front.
	// # ao jeo pu chum hao jí
	// MSP<S> -> SigmaPcon<S> {% id %}
	// MSP<S> -> Modal SigmaPcon<S> {% makeT1ModalvP %}
	// MSP<S> -> Sigma Modal SigmaPcon<S> {% makeSigmaT1ModalvP %}
	// # (sá) ao hao
	// MSPdet -> SigmaPdet {% id %}
	// MSPdet -> Modal SigmaPdet {% makeT1ModalvP %}
	// MSPdet -> Sigma Modal SigmaPdet {% makeSigmaT1ModalvP %}

	private expectMSP(clauseType: ClauseType): Tree {
		if (
			this.peek()?.type === 'polarity' &&
			this.tokens[this.tokenIndex + 1]?.type === 'modality'
		) {
			const Σ = this.eatΣ()!;
			const Modal = this.eatModal()!;
			const ΣP =
				clauseType === ClauseType.Det
					? this.expectΣP(clauseType)
					: this.expectΣPcon(clauseType);
			return makeSigmaT1ModalvP([Σ, Modal, ΣP]) as Tree;
		}

		const Modal = this.eatModal();
		if (Modal) {
			const ΣP =
				clauseType === ClauseType.Det
					? this.expectΣP(clauseType)
					: this.expectΣPcon(clauseType);
			return makeT1ModalvP([Modal, ΣP]) as Tree;
		}
		return clauseType === ClauseType.Det
			? this.expectΣP(clauseType)
			: this.expectΣPcon(clauseType);
	}

	// # jeo pu chum hao jí
	// SigmaPcon<S> -> SigmaP<S> {% id %}
	// SigmaPcon<S> -> SigmaP<S> Conjunction SigmaPcon<S> {% makeConn %}
	// SigmaP<S> -> Sigmacon TP<S> {% makeBranch('ΣP') %}
	// # (sá) jeo pu chum hao
	// SigmaPdet -> Sigmacon TPdet {% makeBranch('ΣP') %}

	private expectΣPcon(clauseType: ClauseType): Tree {
		return this.conjoined('ΣP', () => this.expectΣP(clauseType))!;
	}

	private expectΣP(clauseType: ClauseType): Tree {
		const Σ = this.expectΣcon();
		const TP = this.expectTP(clauseType);
		return this.makeBranch('ΣP', Σ, TP);
	}

	// # pu chum hao jí
	// TP<S> -> Tcon AspP<S> {% makeBranch('TP') %}
	// # ë marao óguı ráı
	// TP<S> -> EvA vP<sub> DPcon {% makeEvAP %}
	// # (sá) pu chum hao
	// TPdet -> Tcon AspPdet {% makeBranch('TP') %}
	// # (sá) ë marao óguı
	// TPdet -> EvA vP<sub> {% makeEvAPdet %}

	private expectTP(clauseType: ClauseType): Tree {
		const T = this.expectTcon();
		const eva = this.eatEvA();
		if (eva) {
			const vp = this.eatvP(ClauseType.Sub);
			if (!vp) throw this.error('ë must be followed by a verb');
			const dp = clauseType === ClauseType.Det ? PRO : this.eatDPcon() ?? PRO;
			return makeEvAP([eva, vp, dp]);
		}
		const AspP = this.expectAspP(clauseType);
		return this.makeBranch('TP', T, AspP);
	}

	// # chum hao jí
	// AspP<S> -> Aspcon vP<S> {% makeBranch('AspP') %}
	// # (sá) chum hao
	// AspPdet -> Aspcon vPdet {% makeBranch('AspP') %}

	private expectAspP(clauseType: ClauseType): Tree {
		const Asp = this.expectAspcon();
		const vP = this.eatvP(clauseType);
		if (!vP) {
			throw this.error('I expect a verb here.', {
				tense: 'Tense must come before Aspect.',
				polarity: 'Polarity must come before Tense and Aspect.',
				pronoun: 'Fronted subjects must come before Tense and Aspect.',
				D: 'Fronted subjects must come before Tense and Aspect.',
			});
		}
		return this.makeBranch('AspP', Asp, vP);
	}

	// # tua hao tî kúe jí súq râo níchaq
	// vP<S> -> Serial AdjunctPcon:* (VocArgument:+ AdjunctPcon:*):? {% makevP<S> %}
	// # (sá) leo hamla lô raı
	// vPdet -> Serialdet {% makevPdet %}

	private eatvP(clauseType: ClauseType): Tree | undefined {
		const serial =
			this.eatSerial() ??
			(clauseType === ClauseType.Det ? makeEmptySerial()() : undefined);
		if (!serial) return undefined;

		const children: Tree[] = [serial as Tree];
		if (clauseType === ClauseType.Det) {
			children.push(PRO);
		} else {
			for (;;) {
				const arg = this.eatAdjunctPcon();
				if (!arg) break;
				children.push(arg);
			}
			let numArgs = 0;
			for (;;) {
				const arg = this.eatVocArgument();
				if (!arg) break;
				if (arg.label !== 'VocativeP') {
					children.push(arg);
					if (++numArgs === serial.arity) {
						break;
					}
				}
			}
			if (
				clauseType === ClauseType.Sub &&
				serial.arity !== undefined &&
				numArgs < serial.arity
			) {
				throw this.error(
					`This subclause is underfilled. '${serial.source}' should have exactly ${serial.arity} arguments, but it has ${numArgs}.`,
				);
			}
			if (numArgs > 0) {
				for (;;) {
					const arg = this.eatAdjunctPcon();
					if (!arg) break;
					children.push(arg);
				}
			}
		}

		return {
			label: '*𝘷P',
			children,
			source: catSource(...children),
		};
	}

	// # ^ tı kúe
	// AdjunctP -> Adjunct Serial Argument {% makeAdjunctPT %}
	// # ^ jaq suaı
	// AdjunctP -> Adjunct Serial {% makeAdjunctPI %}

	private eatAdjunctPcon = () =>
		this.conjoined('adjunct phrase', () =>
			this.focusable(() => this.eatAdjunctP()),
		);

	private eatAdjunctP(): Tree | undefined {
		const Adjunct = this.eatAdjunct();
		if (!Adjunct) return undefined;
		const serial = this.eatSerial();
		if (!serial) {
			throw this.error('Adjunct head must be followed by a verb.');
		}
		if (serial.arity && (serial.arity < 1 || serial.arity > 2)) {
			throw this.error(
				`'${serial.source}' has arity ${serial.arity}, so it can't be used as an adverb.`,
			);
		}
		if (serial.arity === 2) {
			const object = this.eatArgument();
			if (!object) {
				throw this.error(
					`${catSource(Adjunct, serial)} must be followed by an object, because it is transitive`,
				);
			}
			const vP: Tree = {
				label: '*𝘷P',
				children: [serial, PRO, object],
				source: catSource(serial, object),
			};
			return this.makeBranch('AdjunctP', Adjunct, vP);
		}
		if (serial.arity === 1) {
			const vP: Tree = {
				label: '*𝘷P',
				children: [serial, PRO],
				source: serial.source,
			};
			return this.makeBranch('AdjunctP', Adjunct, vP);
		}
	}

	// # tua hao
	// Serial -> V1orKi:* Vlast {% makeSerial %}
	// V1orKi -> V1 {% id %}
	// V1orKi -> Ki {% id %}
	// # (sá) tua hao
	// Serialdet -> Serial {% id %}
	// # (sá) ∅
	// Serialdet -> null {% makeEmptySerial() %}

	private eatSerial(): SerialTree | undefined {
		let eaten = this.eatSerialItem();
		if (!eaten) return undefined;
		const verbTrees = [];
		do {
			verbTrees.push(eaten[1]);
			if (eaten[0] === 'last') {
				break;
			}
			eaten = this.eatSerialItem();
		} while (eaten);

		return {
			label: '*Serial',
			children: verbTrees,
			source: catSource(...verbTrees),
			arity: serialArity(verbTrees),
		};
	}

	private eatSerialItem(): ['last' | 'non-last', Tree] | undefined {
		const ki = this.eatKi();
		return ki ? ['non-last', ki] : this.eatVlast();
	}

	// Vlast -> Verb ConjunctionT1 Vlast {% makeConn %}
	// Vlast -> Verb {% id %}
	// Vlast -> Voiv Argument {% makeBranch('V') %}
	// Vlast -> Verb Argincorp {% makeBranch('V') %}
	// V1 -> Verb {% id %}
	// V1 -> Verb ConjunctionT1 V1 {% makeConn %}
	private eatVlast(): ['last' | 'non-last', Tree] | undefined {
		const left = this.eatVerb();
		if (!left) {
			const oiv = this.eatVoiv();
			if (!oiv) return undefined;
			const arg = this.eatArgument();
			if (!arg)
				throw this.error('A predicatizer must be followed by an object.');
			return ['last', this.makeBranch('V', oiv, arg)];
		}
		const preConj = this.tokenIndex;
		const conj = this.eatConjunctionT1();
		if (conj) {
			const right = this.eatV1();
			if (!right) {
				this.tokenIndex = preConj;
				return ['non-last', left];
			}
			return [
				'non-last',
				this.makeBranch('&P', left, this.makeBranch("&'", conj, right)),
			];
		}
		const incorporatedObject = this.eatArgincorp();
		if (incorporatedObject) {
			return ['last', this.makeBranch('V', left, incorporatedObject)];
		}
		return ['non-last', left];
	}

	// # jî
	// DPincorp -> %incorporated_pronoun Free:* {% makeLeaf('DP') %}
	// # hụ̂ꝡa
	// DPincorp -> Huincorp Word {% makeBranch('DP') %}
	// # sâ ...
	// DPincorp -> Dincorp nP {% makeBranch('DP') %}
	private eatDPincorp(): Tree | undefined {
		return (
			this.eatLeaf('incorporated_pronoun', 'DP') ??
			this.eatHuPronoun('incorporated_prefix_pronoun') ??
			this.eatDnP('incorporated_determiner')
		);
	}

	// Argument -> DPcon {% id %}
	// Argument -> CPargcon {% id %}
	private eatArgument(): Tree | undefined {
		return this.eatCPargcon() ?? this.eatDPcon();
	}

	// Argincorp -> DPincorp {% id %}
	// Argincorp -> CPincorp {% id %}
	private eatArgincorp(): Tree | undefined {
		if (this.peek()?.type === 'incorporated_complementizer') {
			const cp = this.expectCP(ClauseType.Incorp);
			return this.makeBranch('DP', makeNull('D'), cp);
		}
		return this.eatDPincorp();
	}

	// DPcon -> DProi {% id %}
	// DPcon -> DProi Conjunction DPcon {% makeConn %}
	// DPcon -> DProi ConjunctionT1 CPargcon {% makeConn %}
	private eatDPcon(): Tree | undefined {
		const left = this.eatDProi();
		if (!left) return undefined;
		const preConj = this.tokenIndex;
		const conj = this.eatConjunction();
		if (conj) {
			const right = this.eatDPcon();
			if (!right) {
				// It must be ΣP-rú-ΣP then.
				this.tokenIndex = preConj;
				return left;
			}
			return this.makeBranch('&P', left, this.makeBranch("&'", conj, right));
		}
		const conjT1 = this.eatConjunctionT1();
		if (conjT1) {
			const right = this.eatCPargcon();
			if (!right) {
				throw this.error(`This ${conjT1.source} must be followed by a CP.`);
			}
			return this.makeBranch('&P', left, this.makeBranch("&'", conjT1, right));
		}

		return left;
	}

	// DProi -> DPfoc {% id %}
	// DProi -> DPfoc Roi DProi {% makeConn %}
	// DPfoc -> DP {% id %}
	// DPfoc -> Focus DP {% makeBranch('FocusP') %}
	private eatDProi(): Tree | undefined {
		const left = this.focusable(() => this.eatDP());
		if (!left) return undefined;
		const roi = this.eatRoi();
		if (roi) {
			const right = this.eatDPcon();
			if (!right) {
				throw this.error(`This ${roi.source} must be followed by another DP.`);
			}
			return this.makeBranch('&P', left, this.makeBranch("&'", roi, right));
		}
		return left;
	}

	// CPargcon -> CPargfoc {% id %}
	// CPargcon -> CPargfoc Conjunction CPargcon {% makeConn %}
	// CPargfoc -> CParg {% id %}
	// CPargfoc -> Focus CParg {% makeBranch('FocusP') %}
	// CParg -> CPsub {% makeBranchCovertLeft('DP', 'D') %}
	// CPrelcon -> CPrel {% id %}
	// CPrelcon -> CPrel Conjunction CPrelcon {% makeConn %}
	private eatCPargcon(): Tree | undefined {
		return this.conjoined('CP argument', () =>
			this.focusable(() => this.eatCParg()),
		);
	}

	private eatCParg(): Tree | undefined {
		if (this.peek()?.type === 'subordinating_complementizer') {
			const CP = this.expectCP(ClauseType.Sub);
			return this.makeBranch('DP', makeNull('D'), CP);
		}
		return undefined;
	}

	// Sigmacon -> null {% makeCovertLeaf('Σ') %}
	// Sigmacon -> Sigma {% id %}
	// Sigmacon -> Sigma Conjunction Sigmacon {% makeConn %}
	private expectΣcon(): Tree {
		const Σ = this.conjoined('polarity', () => this.eatΣ());
		return Σ ?? makeNull('Σ');
	}

	// Tcon -> null {% makeCovertLeaf('T') %}
	// Tcon -> T {% id %}
	// Tcon -> T_prefix {% id %}
	// Tcon -> T Conjunction Tcon {% makeConn %}
	private expectTcon(): Tree {
		return (
			this.eatT_prefix() ??
			this.conjoined('tense', () => this.eatT()) ??
			makeNull('T')
		);
	}

	// Aspcon -> null {% makeCovertLeaf('Asp') %}
	// Aspcon -> Asp {% id %}
	// Aspcon -> Asp_prefix {% id %}
	// Aspcon -> Asp Conjunction Aspcon {% makeConn %}
	private expectAspcon(): Tree {
		return (
			this.eatAsp_prefix() ??
			this.conjoined('aspect', () => this.eatAsp()) ??
			makeNull('Asp')
		);
	}

	// AdjunctPcon -> AdjunctPfoc {% id %}
	// AdjunctPcon -> AdjunctPfoc Conjunction AdjunctPcon {% makeConn %}
	// AdjunctPfoc -> AdjunctP {% id %}
	// AdjunctPfoc -> Focus AdjunctP {% makeBranch('FocusP') %}
	private AdjunctPcon = () =>
		this.conjoined('adjunct phrase', () =>
			this.focusable(() => this.eatAdjunctP()),
		);

	// Vlast<T> -> Verb ConjunctionT1 Vlast<T> {% makeConn %}
	// Vlast<oiv> -> Voiv {% id %}
	// Vlast<verb> -> Verb {% id %}
	// -> see eatSerial

	// V1 -> Verb {% id %}
	// V1 -> Verb ConjunctionT1 V1 {% makeConn %}
	private eatV1 = () =>
		this.conjoined(
			'V',
			() => this.eatVerb(),
			() => this.eatConjunctionT1(),
		);

	// Verb -> Prefix Verb {% makePrefixP %}
	// Verb -> V {% id %}
	// Verb -> ShuP {% id %}
	// ShuP -> Shu Word {% makeBranch('shuP') %}
	// TeoP -> MoP Teo {% makeBranch('teoP') %}
	// MoP -> Mo Text {% makeBranch('moP') %}
	// MiP -> Mi Word {% makeBranch('mıP') %}
	private eatVerb(): Tree | undefined {
		const prefix = this.eatPrefix();
		if (prefix) {
			const inner = this.eatVerb();
			if (!inner) {
				throw this.error(
					`I expected a verb after the prefix '${prefix.source}'.`,
				);
			}
			return makePrefixP([prefix, inner]);
		}
		return this.eatTeoP() ?? this.eatShuP() ?? this.eatMiP() ?? this.eatV();
	}

	private eatTeoP(): Tree | undefined {
		if (this.peek()?.type !== 'text_quote') return undefined;
		const moP = this.expectMoP();
		const teo = this.eatTeo();
		if (!teo) {
			throw this.error('mo must be terminated by teo.');
		}
		return this.makeBranch('teoP', moP, teo);
	}

	private expectMoP(): Tree {
		const mo = this.eatMo()!;
		const text = this.eatText();
		if (!text) throw this.error('mo must be followed by text.');
		return this.makeBranch('moP', mo, text);
	}

	private eatShuP(): Tree | undefined {
		const shu = this.eatShu();
		if (!shu) return undefined;
		const next = this.next();
		if (!next) throw this.error('mı must be followed by another word.');
		const word = makeLeaf('word')([next, []]);
		return this.makeBranch('shuP', shu, word);
	}

	private eatMiP(): Tree | undefined {
		const mi = this.eatMi();
		if (!mi) return undefined;
		const next = this.next();
		if (!next) throw this.error('mı must be followed by another word.');
		const word = makeLeaf('word')([next, []]);
		return this.makeBranch('mıP', mi, word);
	}

	private eatCPrelcon = () => this.conjoined('CPrel', () => this.eatCPrel());

	private eatNaConjunction(na_type: string): Tree | undefined {
		const na = this.eatPrefixLeaf(na_type);
		if (!na) return undefined;
		const V = this.eatV();
		if (!V) throw this.error('na- must be followed by a verb.');
		return this.makeBranch('&(naP)', na, V);
	}

	private eatAdjunct = () => this.eatLeaf('preposition', 'Adjunct');
	private eatAsp = () => this.eatLeaf('aspect', 'Asp');
	private eatAsp_prefix = () => this.eatLeaf('prefix_aspect', 'Asp');
	private eatConjunction = () =>
		this.eatLeaf('conjunction', '&') ??
		this.eatNaConjunction('prefix_conjunctionizer');
	private eatConjunctionT1 = () =>
		this.eatLeaf('conjunction_in_t1', '&') ??
		this.eatNaConjunction('prefix_conjunctionizer_in_t1');
	private eatConjunctionT4 = () =>
		this.eatLeaf('conjunction_in_t4', '&') ??
		this.eatNaConjunction('prefix_conjunctionizer_in_t4');
	private eatBi = () => this.eatLeaf('topic_marker', 'Topic');
	private eatC = () => this.eatLeaf('complementizer', 'C');
	private eatCrel = () =>
		this.eatLeaf('relative_clause_complementizer', 'Crel');
	private eatCsub = () => this.eatLeaf('subordinating_complementizer', 'C');
	private eatCincorp = () => this.eatLeaf('incorporated_complementizer', 'C');
	private eatEvA = () => this.eatLeaf('event_accessor', 'EvA');
	private eatFocus = () => this.eatLeaf('focus_particle', 'Focus');
	private eatGo = () => this.eatLeaf('retroactive_cleft', '𝘷');
	private eatInterjection = () => this.eatLeaf('interjection', 'Interjection');
	private eatKi = () => this.eatLeaf('adjective_marker', '𝘢');
	private eatMi = () => this.eatLeaf('name_verb', 'mı');
	private eatMo = () => this.eatLeaf('text_quote', 'mo');
	private eatModal = () => this.eatLeaf('modality', 'Modal');
	private eatModalT4 = () => this.eatLeaf('modality_with_complement', 'Modal');
	private eatNa = () => this.eatLeaf('cleft_verb', '𝘷');
	private eatPrefix = () =>
		this.eatPrefixLeaf('prefix') ??
		this.eatPrefixLeaf('focus_particle_prefix_form');
	private eatRoi = () => this.eatLeaf('plural_coordinator', '&');
	private eatShu = () => this.eatLeaf('word_quote', 'shu');
	private eatSA = () => this.eatLeaf('illocution', 'SA');
	private eatΣ = () => this.eatLeaf('polarity', 'Σ');
	private eatV = () => this.eatLeaf('predicate', 'V');
	private eatVoiv = () => this.eatLeaf('predicatizer', 'V');
	private eatT = () => this.eatLeaf('tense', 'T');
	private eatT_prefix = () => this.eatLeaf('prefix_tense', 'T');
	private eatText = () => this.eatLeaf('text', 'text');
	private eatTeo = () => this.eatLeaf('end_quote', 'teo');
	private eatWord = () => this.eatLeaf('word', 'word');
	private eatVocative = () => this.eatLeaf('vocative', 'Vocative');

	// VocativeP -> Vocative Argument {% makeBranch('VocativeP') %}
	// Vocative -> %vocative {% makeLeaf('Vocative') %}
	// VocArgument -> Argument {% id %}
	// VocArgument -> VocativeP {% id %}

	private eatVocativeP(): Tree | undefined {
		const vocative = this.eatVocative();
		if (!vocative) return undefined;
		const argument = this.eatArgument();
		if (!argument) throw this.error('I expected an argument after hóı.');
		return this.makeBranch('VocativeP', vocative, argument);
	}

	private eatVocArgument(): Tree | undefined {
		return this.eatArgument() ?? this.eatVocativeP();
	}

	/* Parenthetical -> %start_parenthetical Fragment %end_parenthetical {% id %}*/
}
