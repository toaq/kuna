import { Leaf, Branch, Tree, Label } from './tree';

export type Quantifier = 'exists' | 'forall';

export type Formula =
	| { type: 'lambda'; v: string; body: Formula }
	| { type: 'q'; q: Quantifier; v: string; body: Formula }
	| { type: 'variable'; name: string }
	| { type: 'apply'; func: Formula; args: Formula[] }
	| { type: 'verb'; name: string }
	| { type: 'constant'; name: string }
	| { type: 'and'; left: Formula; right: Formula }
	| { type: 'role'; role: string; event: Formula; actor: Formula };

export function λ(v: string, body: Formula): Formula {
	return { type: 'lambda', v, body };
}

export function v(name: string): Formula {
	return { type: 'variable', name };
}

export function app(func: Formula, ...args: Formula[]): Formula {
	return { type: 'apply', func, args };
}

export function substitute(src: string, tgt: Formula, ctx: Formula): Formula {
	switch (ctx.type) {
		case 'lambda': {
			return { ...ctx, body: substitute(src, tgt, ctx.body) };
		}
		case 'q': {
			return { ...ctx, body: substitute(src, tgt, ctx.body) };
		}
		case 'variable': {
			return ctx.name === src ? tgt : ctx;
		}
		case 'apply': {
			const func = substitute(src, tgt, ctx.func);
			const args = ctx.args.map(x => substitute(src, tgt, x));
			return func.type === 'lambda' && args.length === 1
				? apply(func, args[0])
				: {
						...ctx,
						func: substitute(src, tgt, ctx.func),
						args: ctx.args.map(x => substitute(src, tgt, x)),
				  };
		}
		case 'and': {
			return {
				...ctx,
				left: substitute(src, tgt, ctx.left),
				right: substitute(src, tgt, ctx.right),
			};
		}
		case 'role': {
			return {
				...ctx,
				event: substitute(src, tgt, ctx.event),
				actor: substitute(src, tgt, ctx.actor),
			};
		}
		default:
			return ctx;
	}
}

export function apply(left: Formula, right: Formula): Formula {
	if (left.type !== 'lambda') return v('a');
	return substitute(left.v, right, left.body);
}

export function formulaToLatex(formula: Formula): string {
	switch (formula.type) {
		case 'lambda': {
			return '\\lambda ' + formula.v + '.' + formulaToLatex(formula.body);
		}
		case 'q': {
			return (
				'\\' + formula.q + ' ' + formula.v + '.' + formulaToLatex(formula.body)
			);
		}
		case 'variable': {
			return formula.name;
		}
		case 'apply': {
			return (
				formulaToLatex(formula.func) +
				'(' +
				formula.args.map(formulaToLatex).join(',') +
				')'
			);
		}
		case 'verb': {
			return '\\textbf{' + formula.name + '}';
		}
		case 'constant': {
			return '\\textrm{' + formula.name + '}';
		}
		case 'and': {
			return (
				'(' +
				formulaToLatex(formula.left) +
				' \\wedge ' +
				formulaToLatex(formula.right) +
				')'
			);
		}
		case 'role': {
			return (
				'\\textsc{' +
				formula.role +
				'}(' +
				formulaToLatex(formula.event) +
				')=' +
				formulaToLatex(formula.actor)
			);
		}
	}
}

export function formulaToText(formula: Formula): string {
	switch (formula.type) {
		case 'lambda': {
			return 'λ' + formula.v + '. ' + formulaToText(formula.body);
		}
		case 'q': {
			const q = formula.q === 'forall' ? '∀' : '∃';
			return q + formula.v + ': ' + formulaToText(formula.body);
		}
		case 'variable': {
			return formula.name;
		}
		case 'apply': {
			const f = formulaToText(formula.func);
			const xs = formula.args.map(formulaToText).join(',');
			return `${f}(${xs})`;
		}
		case 'verb':
		case 'constant': {
			return formula.name;
		}
		case 'and': {
			const l = formulaToText(formula.left);
			const r = formulaToText(formula.right);
			return `(${l} ∧ ${r})`;
		}
		case 'role': {
			const r = formula.role;
			const e = formulaToText(formula.event);
			const a = formulaToText(formula.actor);
			return `${r}(${e}) = ${a}`;
		}
	}
}

export interface DLeaf extends Leaf {
	denotation: Formula;
	presuppositions: Formula[];
}

export interface DBranch {
	label: Label;
	left: DTree;
	right: DTree;
	denotation: Formula;
	presuppositions: Formula[];
}

export type DTree = DLeaf | DBranch;

export function denote(tree: Tree): DTree {
	if ('children' in tree) throw new Error('denoting unfixed tree?');
	if ('word' in tree) {
		if (tree.label === 'V') {
			if (typeof tree.word === 'string') throw new Error();
			const entry = tree.word.entry;
			if (!entry) throw new Error();
			if (entry.type !== 'predicate') throw new Error();
			const arity = entry.frame.split(' ').length;
			const verb: Formula = { type: 'verb', name: entry.toaq };
			return {
				...tree,
				denotation:
					arity === 3
						? λ('y', λ('x', λ('e', app(app(verb, v('x'), v('y')), v('e')))))
						: λ('x', λ('e', app(app(verb, v('x')), v('e')))),
				presuppositions: [],
			};
		} else if (tree.label === 'DP') {
			if (typeof tree.word === 'string') throw new Error();
			const entry = tree.word.entry;
			if (!entry) throw new Error();
			return {
				...tree,
				denotation: { type: 'constant', name: entry.toaq },
				presuppositions: [],
			};
		} else if (tree.label === '𝑣0') {
			return { ...tree, denotation: v('-'), presuppositions: [] };
		} else if (tree.label === '𝑣') {
			return {
				...tree,
				denotation: λ(
					'x',
					λ('e', {
						type: 'role',
						role: 'agent',
						event: v('e'),
						actor: v('x'),
					}),
				),
				presuppositions: [],
			};
		} else if (tree.label === 'Asp') {
			return {
				...tree,
				denotation: λ(
					'P',
					λ('t', {
						type: 'q',
						q: 'exists',
						v: 'e',
						body: app(v('P'), v('e')),
					}),
				),
				presuppositions: [],
			};
		} else if (tree.label === 'T') {
			return { ...tree, denotation: v('t'), presuppositions: [] };
		} else {
			return { ...tree, denotation: v('?'), presuppositions: [] };
		}
	} else {
		const left = denote(tree.left);
		const right = denote(tree.right);
		let denotation: Formula;
		if (tree.label === 'VP' || tree.label === 'AspP') {
			denotation = apply(left.denotation, right.denotation);
		} else if (tree.label === 'SAP') {
			denotation = left.denotation;
		} else if (tree.label === 'CP') {
			denotation = right.denotation;
		} else if (tree.label === '𝑣P' && left.label === '𝑣0') {
			denotation = right.denotation;
		} else if (tree.label === '𝑣P' || tree.label === 'TP') {
			denotation = apply(right.denotation, left.denotation);
		} else if (tree.label === "𝑣'") {
			// Event Identification
			denotation = λ(
				'x',
				λ('e', {
					type: 'and',
					left: apply(apply(left.denotation, v('x')), v('e')),
					right: apply(right.denotation, v('e')),
				}),
			);
		} else {
			denotation = v('?');
		}
		return {
			label: tree.label,
			left,
			right,
			denotation,
			presuppositions: [],
		};
	}
}
