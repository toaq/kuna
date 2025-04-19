// This is an implementation of the cubic-time, "shared packed parse forest"
// based Earley parser described in _Recognition is not parsing — SPPF-style
// parsing from cubic recognisers_ by Elizabeth Scott and Adrian Johnstone,
// Science of Computer Programming 75 (2010) 55–70.
//
// Specifically, EarleyParser().parse() is a translation of the pseudocode
// algorithm on page 60.
//
// https://www.sciencedirect.com/science/article/pii/S0167642309000951
//
// Note that they index the input string from 1, but we index from 0.

export type Symbol<T, N> = { terminal: T } | { nonterminal: N };

export interface Rule<T, N> {
	head: N;
	body: Symbol<T, N>[];
}
export interface Grammar<T, N> {
	start: N;
	rules: Rule<T, N>[];
}

export interface SppfNode<T, N> {
	symbol: Symbol<T, N> | { ruleNumber: number; passed: number };
	startIndex: number;
	endIndex: number;
	families: SppfNode<T, N>[][];
}

export interface EarleyItem<T, N> {
	ruleNumber: number;
	passed: number;
	originPosition: number;
	sppfNode: SppfNode<T, N> | null;
}

export class EarleyParser<T, N> {
	constructor(
		public grammar: Grammar<T, N>,
		private showTerminal: (terminal: T) => string,
	) {}

	private showSymbol(symbol: Symbol<T, N>): string {
		return 'terminal' in symbol
			? this.showTerminal(symbol.terminal)
			: String(symbol.nonterminal);
	}

	/**
	 * Turn an Earley item into a string like '(S → a•A b B, 0)'
	 */
	public showItem(item: EarleyItem<T, N>): string {
		const rule = this.grammar.rules[item.ruleNumber];
		const pre = rule.body
			.slice(0, item.passed)
			.map(this.showSymbol.bind(this))
			.join(' ');
		const post = rule.body
			.slice(item.passed)
			.map(this.showSymbol.bind(this))
			.join(' ');
		return `(${rule.head} → ${pre}•${post}, ${item.originPosition})`;
	}

	/**
	 * Parse a string of terminals, returning a table of Earley items and a
	 * "shared packed parse forest" of all the derivations.
	 */
	public parse(input: T[]): {
		table: EarleyItem<T, N>[][];
		sppf: SppfNode<T, N> | null;
	} {
		const n = input.length;
		const E: EarleyItem<T, N>[][] = Array.from({ length: n + 1 }, () => []);
		let R: EarleyItem<T, N>[] = [];
		let Qprime: EarleyItem<T, N>[] = [];
		let V: SppfNode<T, N>[] = [];

		// for all (S ::= α) ∈ P { if α ∈ ΣN add (S ::= ·α, 0, null) to E0
		//                         if α = a1 α′ add (S ::= ·α, 0, null) to Q′ }
		for (let r = 0; r < this.grammar.rules.length; r++) {
			const rule = this.grammar.rules[r];
			if (rule.head === this.grammar.start) {
				const item = {
					ruleNumber: r,
					passed: 0,
					originPosition: 0,
					sppfNode: null,
				};
				if (rule.body.length === 0 || 'nonterminal' in rule.body[0]) {
					E[0].push(item);
				} else if (rule.body[0].terminal === input[0]) {
					Qprime.push(item);

					// Not part of the original algorithm, and not necessary for
					// making an SPPF, but completes the Earley table:
					E[0].push(item);
				}
			}
		}

		for (let i = 0; i <= n; i++) {
			// At three points in the algorithm, an Earley item is either added
			// to R or to Q or neither depending on some conditions. We extract
			// this step into a small subroutine:
			const update = (item: EarleyItem<T, N>) => {
				const next = this.grammar.rules[item.ruleNumber].body[item.passed];
				if (
					(!next || 'nonterminal' in next) &&
					!E[i].some(
						x =>
							x.ruleNumber === item.ruleNumber &&
							x.passed === item.passed &&
							x.originPosition === item.originPosition &&
							x.sppfNode === item.sppfNode,
					)
				) {
					E[i].push(item);
					R.push(item);
				} else if (next && 'terminal' in next && next.terminal === input[i]) {
					Q.push(item);

					// Not part of the original algorithm, and not necessary for
					// making an SPPF, but completes the Earley table:
					E[i].push(item);
				}
			};

			const H: [N, SppfNode<T, N>][] = [];
			R = [...E[i]];
			const Q = Qprime;
			Qprime = [];

			while (true) {
				// "While R ≠ Ø, remove an element, Λ say, from R"
				const Λ = R.shift();
				if (!Λ) break;
				const rule = this.grammar.rules[Λ.ruleNumber];
				const C = rule.body[Λ.passed];
				if (C && 'nonterminal' in C) {
					// Λ = (B ::= α · C β, h, w)
					const h = Λ.originPosition;
					const w = Λ.sppfNode;
					for (let r = 0; r < this.grammar.rules.length; r++) {
						if (this.grammar.rules[r].head === C.nonterminal) {
							update({
								ruleNumber: r,
								passed: 0,
								originPosition: i,
								sppfNode: null,
							});
						}
					}

					for (const [nt, v] of H) {
						if (C.nonterminal === nt) {
							// if ((C, v) ∈ H)...
							const passed = Λ.passed + 1;
							const y = this.makeNode(Λ.ruleNumber, passed, h, i, w, v, V);
							update({
								ruleNumber: Λ.ruleNumber,
								passed,
								originPosition: h,
								sppfNode: y,
							});
							break;
						}
					}
				} else if (Λ.passed === rule.body.length) {
					// if Λ = (D ::= α·, h, w)...
					const D = rule.head;
					const h = Λ.originPosition;
					let w = Λ.sppfNode;
					if (w === null) {
						// "if there is no node v ∈ V labelled (D, i, i) create one"
						w =
							V.find(
								x =>
									'nonterminal' in x.symbol &&
									x.symbol.nonterminal === D &&
									x.startIndex === i &&
									x.endIndex === i,
							) ?? null;
						if (w === null) {
							w = {
								symbol: { nonterminal: D },
								startIndex: i,
								endIndex: i,
								families: [],
							};
							V.push(w);
						}
						// "if w does not have family (ε) add one"
						if (w.families.every(f => f.length > 0)) w.families.push([]);
					}
					if (h === i) {
						H.push([D, w]);
					}
					for (const e of E[h]) {
						const erule = this.grammar.rules[e.ruleNumber];
						const peek = erule.body[e.passed];
						if (peek && 'nonterminal' in peek && peek.nonterminal === D) {
							const r = e.ruleNumber;
							const k = e.originPosition;
							const z = e.sppfNode;
							const y = this.makeNode(r, e.passed + 1, k, i, z, w, V);
							update({
								ruleNumber: e.ruleNumber,
								passed: e.passed + 1,
								originPosition: k,
								sppfNode: y,
							});
						}
					}
				}
			}

			V = [];
			const v: SppfNode<T, N> = {
				symbol: { terminal: input[i] },
				startIndex: i,
				endIndex: i + 1,
				families: [],
			};
			while (true) {
				// "While Q ≠ Ø, remove an element, Λ say, from Q"
				const Λ = Q.shift();
				if (!Λ) break;
				const rule = this.grammar.rules[Λ.ruleNumber];

				// All the items that end up in this queue should be peeking at
				// the next input terminal.
				const peek = rule.body[Λ.passed];
				if (!('terminal' in peek && peek.terminal === input[i])) {
					throw new Error('Invalid entry in Q');
				}
				const h = Λ.originPosition;
				const w = Λ.sppfNode;
				const j = Λ.passed + 1;
				const y = this.makeNode(Λ.ruleNumber, j, h, i + 1, w, v, V);
				const sym = rule.body[j];
				if (rule.body.length === j || 'nonterminal' in sym) {
					E[i + 1].push({
						ruleNumber: Λ.ruleNumber,
						passed: j,
						originPosition: h,
						sppfNode: y,
					});
				} else if (sym.terminal === input[i + 1]) {
					Qprime.push({
						ruleNumber: Λ.ruleNumber,
						passed: j,
						originPosition: h,
						sppfNode: y,
					});
				}
			}
		}

		// if (S ::= τ ·, 0, w) ∈ En return w
		for (const final of E[n]) {
			const rule = this.grammar.rules[final.ruleNumber];
			if (
				rule.head === this.grammar.start &&
				rule.body.length === final.passed &&
				final.originPosition === 0
			) {
				return { table: E, sppf: final.sppfNode };
			}
		}

		return { table: E, sppf: null };
	}

	private makeNode(
		ruleNumber: number,
		passed: number,
		j: number,
		i: number,
		w: SppfNode<T, N> | null,
		v: SppfNode<T, N>,
		V: SppfNode<T, N>[],
	): SppfNode<T, N> {
		const rule = this.grammar.rules[ruleNumber];
		const s: Symbol<T, N> | { ruleNumber: number; passed: number } =
			rule.body.length === passed
				? { nonterminal: rule.head }
				: { ruleNumber, passed };
		if (passed === 1 && rule.body.length > 1) return v;
		let y =
			V.find(
				x =>
					JSON.stringify(x.symbol) === JSON.stringify(s) &&
					x.startIndex === j &&
					x.endIndex === i,
			) ?? null;
		if (!y) {
			y = { symbol: s, startIndex: j, endIndex: i, families: [] };
			V.push(y);
		}
		if (w === null && !y.families.some(f => f.length === 1 && f[0] === v)) {
			y.families.push([v]);
		}
		if (
			w !== null &&
			!y.families.some(f => f.length === 2 && f[0] === w && f[1] === v)
		) {
			y.families.push([w, v]);
		}
		return y;
	}
}
