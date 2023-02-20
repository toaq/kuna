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

export function showFormula(formula: Formula): string {
	switch (formula.type) {
		case 'lambda': {
			return '\\lambda ' + formula.v + '.' + showFormula(formula.body);
		}
		case 'q': {
			return (
				'\\' + formula.q + ' ' + formula.v + '.' + showFormula(formula.body)
			);
		}
		case 'variable': {
			return formula.name;
		}
		case 'apply': {
			return (
				showFormula(formula.func) +
				'(' +
				formula.args.map(showFormula).join(',') +
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
				showFormula(formula.left) +
				' \\wedge ' +
				showFormula(formula.right) +
				')'
			);
		}
		case 'role': {
			return (
				'\\textsc{' +
				formula.role +
				'}(' +
				showFormula(formula.event) +
				')=' +
				showFormula(formula.actor)
			);
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
						? λ(
								'y_d',
								λ(
									'x_d',
									λ('e_d', app(app(verb, v('x_d'), v('y_d')), v('e_d'))),
								),
						  )
						: λ('x_t', λ('e_t', app(app(verb, v('x_t')), v('e_t')))),
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
					'x_v',
					λ('e_v', {
						type: 'role',
						role: 'agent',
						event: v('e_v'),
						actor: v('x_v'),
					}),
				),
				presuppositions: [],
			};
		} else if (tree.label === 'Asp') {
			return {
				...tree,
				denotation: λ(
					'P_A',
					λ('t_A', {
						type: 'q',
						q: 'exists',
						v: 'e_A',
						body: app(v('P_A'), v('e_A')),
					}),
				),
				presuppositions: [],
			};
		} else if (tree.label === 'T') {
			return { ...tree, denotation: v('t_T'), presuppositions: [] };
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
				'x_i',
				λ('e_i', {
					type: 'and',
					left: apply(apply(left.denotation, v('x_i')), v('e_i')),
					right: apply(right.denotation, v('e_i')),
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
