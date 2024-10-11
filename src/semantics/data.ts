import type { CovertValue } from '../tree';
import {
	type Expr,
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

export const pronouns = new Map([
	['jí', IO(Int('e'))],
	['súq', IO(Int('e'))],
	['nháo', IO(Int('e'))],
	['súna', IO(Int(Pl('e')))],
	['nhána', IO(Int(Pl('e')))],
	['súho', IO(Int(Pl('e')))],
	['úmo', IO(Int(Pl('e')))],
	['íme', IO(Int(Pl('e')))],
	['áma', IO(Int(Pl('e')))],
]);

export const pronominalTenses = new Set(['tuom', 'naı', 'jıa', 'pu']);

export const covertSigma = λ('t', closed, (t, s) => s.var(t));
