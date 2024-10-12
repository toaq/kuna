import type { CovertValue } from '../tree';
import {
	type Expr,
	type ExprType,
	Fn,
	IO,
	Int,
	Pl,
	agent,
	and,
	app,
	closed,
	equals,
	int,
	lex,
	λ,
} from './model';

export const covertV = lex('raı', Fn('e', Fn('v', Fn('s', 't'))), closed);

export const covertLittleVs: Partial<Record<CovertValue, Expr>> = {
	CAUSE: int(
		λ('s', closed, (w, s) =>
			λ(Fn('v', 't'), s, (pred, s) =>
				λ('e', s, (arg, s) =>
					λ('v', s, (e, s) =>
						app(
							app(
								and(s),
								equals(app(app(agent(s), s.var(e)), s.var(w)), s.var(arg)),
							),
							app(s.var(pred), s.var(e)),
						),
					),
				),
			),
		),
	),
	BE: λ(Fn('v', 't'), closed, (pred, s) => s.var(pred)),
};

const personalPronouns = [
	'jí',
	'súq',
	'nháo',
	'súna',
	'nhána',
	'súho',
	'úmo',
	'íme',
	'áma',
];

export const pronouns = new Map<string, ExprType>([
	...personalPronouns.map(toaq => [toaq, IO(Int(Pl('e')))] as const),
]);

export const pronominalTenses = new Set(['tuom', 'naı', 'jıa', 'pu']);

export const covertSigma = λ('t', closed, (t, s) => s.var(t));
