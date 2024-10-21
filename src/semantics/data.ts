import type { CovertValue } from '../tree';
import {
	Cont,
	type Expr,
	type ExprType,
	Fn,
	IO,
	Int,
	Pl,
	Qn,
	Ref,
	agent,
	and,
	app,
	closed,
	equals,
	int,
	lex,
	ref,
	unref,
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

export const covertResumptive = ref(
	{ type: 'covert resumptive' },
	λ(Int(Pl('e')), closed, (x, s) => s.var(x)),
);

export const pronouns = new Map<string, ExprType>([
	...personalPronouns.map(toaq => [toaq, IO(Int(Pl('e')))] as const),
]);

export const pronominalTenses = new Set(['tuom', 'naı', 'jıa', 'pu']);

export const covertSigma = λ('t', closed, (t, s) => s.var(t));

export const determiners = new Map<
	string,
	(wrap: (inner: ExprType) => ExprType) => ExprType
>([
	['sá', wrap => Fn(Fn(Int(Pl('e')), 't'), Cont(wrap(Int(Pl('e')))))],
	['tú', wrap => Fn(Fn(Int(Pl('e')), 't'), Cont(wrap(Int(Pl('e')))))],
	['sía', wrap => Fn(Fn(Int(Pl('e')), 't'), Cont(wrap(Int(Pl('e')))))],
	['hí', wrap => Fn(Fn(Int(Pl('e')), 't'), Qn(wrap(Int(Pl('e')))))],
	['ké', wrap => Fn(Fn(Int(Pl('e')), 't'), IO(wrap(Int(Pl('e')))))],
	['hú', wrap => Fn(Fn(Int(Pl('e')), 't'), IO(wrap(Int(Pl('e')))))],
	['ní', wrap => Fn(Fn(Int(Pl('e')), 't'), IO(wrap(Int(Pl('e')))))],
	['nánı', wrap => Fn(Fn(Int(Pl('e')), 't'), IO(wrap(Int(Pl('e')))))],
]);

export const covertCrel = λ(
	Ref({ type: 'covert resumptive' }, 't'),
	closed,
	(predicate, s) =>
		λ(Int(Pl('e')), s, (arg, s) => app(unref(s.var(predicate)), s.var(arg))),
);
