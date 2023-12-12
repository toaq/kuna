import { test, expect } from 'vitest';
import { parse } from '../parse';
import { fix } from '../fix';
import { denote } from './denote';
import { Expr } from './model';
import { toPlainText } from './render';
import { Impossible } from '../error';

function forEachFreeVariableUsage(e: Expr, fn: (index: number) => void) {
	const sub = (...es: Expr[]) => {
		for (const e of es) forEachFreeVariableUsage(e, fn);
	};

	switch (e.head) {
		case 'variable':
			fn(e.index);
			break;
		case 'verb':
			sub(...e.args, e.event, e.world);
			break;
		case 'lambda': {
			const fnInner = (i: number) => fn(i - 1);
			forEachFreeVariableUsage(e.body, fnInner);
			if (e.restriction !== undefined)
				forEachFreeVariableUsage(e.restriction, fnInner);
			break;
		}
		case 'apply':
			sub(e.fn, e.argument);
			break;
		case 'presuppose':
			sub(e.body, e.presupposition);
			break;
		case 'infix':
			sub(e.left, e.right);
			break;
		case 'polarizer':
			sub(e.body);
			break;
		case 'quantifier': {
			const fnInner = (i: number) => fn(i - 1);
			forEachFreeVariableUsage(e.body, fnInner);
			if (e.restriction !== undefined)
				forEachFreeVariableUsage(e.restriction, fnInner);
			break;
		}
		case 'constant':
		case 'quote':
			sub();
			break;
		default:
			throw new Impossible('This switch statement should be exhaustive');
	}
}

function d(sentence: string): string {
	const trees = parse(sentence);
	expect(trees.length).toBe(1);
	const [tree] = trees;

	const { denotation } = denote(fix(tree));
	if (denotation === null) throw new Impossible('Null denotation');
	const denotationText = toPlainText(denotation);

	// Verify that no free variables are unused
	const freeVariablesUsed = denotation.context.map(() => false);
	forEachFreeVariableUsage(denotation, i => (freeVariablesUsed[i] = true));
	freeVariablesUsed.forEach((used, i) => {
		if (!used)
			throw new Error(
				`The free variable of type ${denotation.context[i]} at index ${i} in ${denotationText} is unused`,
			);
	});

	return denotationText;
}

test('it denotes a nullary verb', () => {
	expect(d('Ruqshua')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ ruqshua.𝘸(𝘦'))(𝘦)\"",
	);
});

test('it denotes an unaccusative verb', () => {
	expect(d('Nuo páqda')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ nuo.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ paqda.𝘸(a)(𝘦')))(𝘦) | animate(a)\"",
	);
});

test('it denotes an unergative verb', () => {
	expect(d('Marao páqda')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ AGENT(𝘦')(𝘸) = a ∧ marao.𝘸(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ paqda.𝘸(a)(𝘦')))(𝘦) | animate(a)\"",
	);
});

test('it denotes a transtive verb', () => {
	expect(d('Chuq nháo súshı')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ AGENT(𝘦')(𝘸) = nháo ∧ chuq.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ sushı.𝘸(a)(𝘦')))(𝘦) | inanimate(a)\"",
	);
});

test('it denotes a ditranstive verb', () => {
	expect(d('Do jí nháo súshı')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ AGENT(𝘦')(𝘸) = jí ∧ do.𝘸(nháo, a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ sushı.𝘸(a)(𝘦')))(𝘦) | inanimate(a)\"",
	);
});

test('it denotes speech acts', () => {
	expect(d('De nháo da')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ de.𝘸(nháo)(𝘦'))(𝘦)\"",
	);
	expect(d('Hıo jí súq ka')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ karuaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ hıo.𝘸(súq)(𝘦'))(𝘦)\"",
	);
	expect(d('Fa súq jéarıaq ba')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ baruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ AGENT(𝘦')(𝘸) = súq ∧ fa.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ jearıaq.𝘸(a)(𝘦')))(𝘦) | inanimate(a)\"",
	);
	expect(d('Jıa faq sía huı nha')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nue.w(λ𝘸. ¬∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ huı.𝘸(𝘢)(𝘦'). ∃𝘦'. τ(𝘦') ⊆ t ∧ faq.𝘸(𝘢)(𝘦'))(𝘦) | t > t0\"",
	);
	expect(d('Chuq súq sá raı doa')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ shoe.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ raı.𝘸(𝘢)(𝘦'). ∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = súq ∧ chuq.𝘸(𝘢)(𝘦'))(𝘦)\"",
	);
	expect(d('Aona sá puao ꝡo')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ zaru.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ puao.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ aona.𝘸(𝘢)(𝘦') | inanimate(𝘢)))(𝘦)\"",
	);
});

test('it denotes tenses', () => {
	expect(d('Naı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦) | t ⊆ t0\"",
	);
	expect(d('Pu jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦) | t < t0\"",
	);
	expect(d('Jıa jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦) | t > t0\"",
	);
	expect(d('Pujuı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦) | t <.near t0\"",
	);
	expect(d('Jıajuı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦) | t >.near t0\"",
	);
	expect(d('Sula jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘵. ∃𝘦'. τ(𝘦') ⊆ 𝘵 ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
	expect(d('Mala jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘵 : 𝘵 < t0. ∃𝘦'. τ(𝘦') ⊆ 𝘵 ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
	expect(d('Jela jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘵 : 𝘵 > t0. ∃𝘦'. τ(𝘦') ⊆ 𝘵 ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes aspects', () => {
	expect(d('Tam jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
	expect(d('Chum jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∀𝘸' : IW(𝘸')(𝘸)(t). ∃𝘦'. t ⊆ τ(𝘦') ∧ jaı.𝘸'(jí)(𝘦'))(𝘦)\"",
	);
	expect(d('Luı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') < t ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
	expect(d('Za jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') > t ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
	expect(d('Hoaı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. t ⊆ τ(𝘦') ∧ t > ExpEnd(𝘦') ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
	expect(d('Haı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. t ⊆ τ(𝘦') ∧ t < ExpStart(𝘦') ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
	expect(d('Hıq jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') <.near t ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
	expect(d('Fı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') >.near t ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes tense and aspect prefixes', () => {
	expect(d('Naılụıshıesho jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') < t ∧ shıesho.𝘸(jí)(𝘦'))(𝘦) | t ⊆ t0\"",
	);
});

test('it denotes object incorporation', () => {
	expect(d('Maı tû paı jî jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∀.SING 𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ paı.𝘸(𝘢, jí)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, 𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes exophoric references', () => {
	expect(d('Sao jío')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ sao.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ jıo.𝘸(a)(𝘦')))(𝘦) | inanimate(a)\"",
	);
	expect(d('Sao máq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ sao.𝘸(a)(𝘦'))(𝘦) | inanimate(a)\"",
	);
});

test('it denotes anaphora', () => {
	expect(d('Sá nıaı nä kıaı jí níaı')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ nıaı.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ kıaı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
	expect(d('Sá nıaı nä kıaı jí hó')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ nıaı.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ kıaı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
	expect(d('Sá nıaı nä kıaı jí hụ́sa')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ nıaı.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ kıaı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes a cleft verb', () => {
	expect(d('Sá nıaı nä kıaı jí hóa')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ nıaı.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ kıaı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes determiners', () => {
	expect(d('Maı jí sá poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, 𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
	expect(d('Maı jí tú poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∀.SING 𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, 𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
	expect(d('Maı jí sía poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ¬∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, 𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
	expect(d('Maı jí túq poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∀.CUML 𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, 𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
	expect(d('Maı jí tútu poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∀𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, 𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
	expect(d('Maı jí báq poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. GEN 𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, 𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
	expect(d('Maı jí ní poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(a)(𝘦')))(𝘦) | animate(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦)\"",
	);
	expect(d('Maı jí níjuı poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(a)(𝘦')))(𝘦) | animate(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ tıjuı.w(a, jí)(𝘦)\"",
	);
	expect(d('Maı jí níjao poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(a)(𝘦')))(𝘦) | animate(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ tıjao.w(a, jí)(𝘦)\"",
	);
	expect(d('Maı jí ké poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(a)(𝘦')))(𝘦) | animate(a) | ¬∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)\"",
	);
	expect(d('Maı jí hú poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(jí, a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(a)(𝘦')))(𝘦) | animate(a) | ∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)\"",
	);
});

test('it denotes multiple determiners binding the same variable', () => {
	expect(d('Maı sá poq tú poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t'' ∧ poq.𝘸(𝘢)(𝘦'). (∀.SING 𝘣 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘣)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ maı.𝘸(𝘢, 𝘣)(𝘦') | animate(𝘣)) | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes imperfective aspect + quantification', () => {
	expect(d('Chụmjoaı jí sá deo')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ deo.𝘸(𝘢)(𝘦'). (∀𝘸' : IW(𝘸')(𝘸)(t). (∃𝘦'. t ⊆ τ(𝘦') ∧ AGENT(𝘦')(𝘸') = jí ∧ joaı.𝘸'(𝘢)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ deo.𝘸'(𝘢)(𝘦')) | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes a relative clause', () => {
	expect(d('Joaı jí ké kue, ꝡë hıq noaq jí hóa')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ joaı.𝘸(a)(𝘦') | (∃𝘦'. τ(𝘦') ⊆ t'' ∧ kue.𝘸(a)(𝘦')) ∧ ∃𝘦'. τ(𝘦') <.near t' ∧ AGENT(𝘦')(𝘸) = jí ∧ noaq.𝘸(a)(𝘦')))(𝘦) | inanimate(a) | ¬∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)\"",
	);
});

test('it denotes polarizers', () => {
	// Note the covert T in this example (this used to parse wrong)
	expect(d('Bu geq jí nháo')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ¬∃𝘦'. τ(𝘦') ⊆ t ∧ geq.𝘸(jí, nháo)(𝘦'))(𝘦)\"",
	);
	expect(d('Jeo jela choaq jí súna nha')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nue.w(λ𝘸. †∃𝘵 : 𝘵 > t0. ∃𝘦'. τ(𝘦') ⊆ 𝘵 ∧ choaq.𝘸(jí, súna)(𝘦'))(𝘦)\"",
	);
	// Now try putting a polarizer in a DP
	expect(d('Gaı jí bú jara')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ gaı.𝘸(jí, a)(𝘦') | ¬∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = a ∧ jara.𝘸(𝘦')))(𝘦) | animate(a)\"",
	);
});

test('it denotes adjuncts', () => {
	// Eventive adjuncts
	expect(d('Za nuo tî ní kua jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') > t ∧ (∃𝘦''. tı.𝘸(𝘦', a)(𝘦'')) ∧ nuo.𝘸(jí)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ kua.𝘸(a)(𝘦')))(𝘦) | abstract(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦)\"",
	);
	expect(d('Za nuo jí tî ní kua')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') > t ∧ nuo.𝘸(jí)(𝘦') ∧ ∃𝘦''. tı.𝘸(𝘦', a)(𝘦'') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ kua.𝘸(a)(𝘦')))(𝘦) | abstract(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦)\"",
	);
	// Subject-sharing adjuncts
	expect(d('Saqsu kûq hú toa nháo')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ (∃𝘦''. 𝘦'' o 𝘦' ∧ AGENT(𝘦'')(𝘸) = SUBJ(𝘦')(𝘸) ∧ kuq.𝘸(a)(𝘦'')) ∧ AGENT(𝘦')(𝘸) = nháo ∧ saqsu.𝘸(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ toa.𝘸(a)(𝘦')))(𝘦) | abstract(a) | ∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)\"",
	);
	expect(d('Saqsu nháo kûq hú toa')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = nháo ∧ saqsu.𝘸(𝘦') ∧ ∃𝘦''. 𝘦'' o 𝘦' ∧ AGENT(𝘦'')(𝘸) = SUBJ(𝘦')(𝘸) ∧ kuq.𝘸(a)(𝘦'') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ toa.𝘸(a)(𝘦')))(𝘦) | abstract(a) | ∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)\"",
	);
});

test('it denotes clausal coordination', () => {
	expect(d('Joaı súq báq rua rú sea jí rú luq tú raı')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. GEN 𝘢 : ∃𝘦'. τ(𝘦') ⊆ t'''' ∧ rua.𝘸(𝘢)(𝘦'). (∀.SING 𝘣 : ∃𝘦'. τ(𝘦') ⊆ t''' ∧ raı.𝘸(𝘣)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t'' ∧ AGENT(𝘦')(𝘸) = súq ∧ joaı.𝘸(𝘢)(𝘦')) ∧ (∃𝘦'. τ(𝘦') ⊆ t' ∧ sea.𝘸(jí)(𝘦')) ∧ ∃𝘦'. τ(𝘦') ⊆ t ∧ luq.𝘸(𝘣)(𝘦') | inanimate(𝘢)))(𝘦)\"",
	);
});

test('it denotes adjunct coordination', () => {
	expect(d('Kaı râo núaq rú fêı jí máq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ (∃𝘦''. rao.𝘸(𝘦', c)(𝘦'')) ∧ (∃𝘦''. 𝘦'' o 𝘦' ∧ feı.𝘸(SUBJ(𝘦')(𝘸))(𝘦'')) ∧ AGENT(𝘦')(𝘸) = jí ∧ kaı.𝘸(b, a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ nuaq.𝘸(c)(𝘦')))(𝘦) | inanimate(b) | abstract(c)\"",
	);
	expect(d('Kaı jí máq fêı rá râo núaq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ AGENT(𝘦')(𝘸) = jí ∧ kaı.𝘸(b, a)(𝘦') ∧ ((∃𝘦''. 𝘦'' o 𝘦' ∧ feı.𝘸(SUBJ(𝘦')(𝘸))(𝘦'')) ∨ ∃𝘦''. rao.𝘸(𝘦', c)(𝘦'')) | ∃𝘦'. τ(𝘦') ⊆ t ∧ nuaq.𝘸(c)(𝘦')))(𝘦) | abstract(c) | inanimate(b)\"",
	);
});

test('it denotes argument coordination', () => {
	expect(d('Nuo súq rú jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ nuo.𝘸(súq)(𝘦')) ∧ ∃𝘦'. τ(𝘦') ⊆ t ∧ nuo.𝘸(jí)(𝘦'))(𝘦)\"",
	);
	expect(d('Nuo súq rá jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ nuo.𝘸(súq)(𝘦')) ∨ ∃𝘦'. τ(𝘦') ⊆ t ∧ nuo.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes plural coordination', () => {
	expect(d('Nuo súq róı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ nuo.𝘸(súq & jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes modals', () => {
	expect(d('Shê, ꝡä tı súq máq, nä buja jí súq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∀𝘸' : SHE(𝘸)(𝘸') ∧ ∃𝘦'. τ(𝘦') ⊆ t' ∧ tı.𝘸'(súq, a)(𝘦'). ∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸') = jí ∧ buja.𝘸'(súq)(𝘦'))(𝘦) | inanimate(a)\"",
	);
	expect(d('Dâı, ꝡä tı súq máq, nä buja jí súq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘸' : SHE(𝘸)(𝘸') ∧ ∃𝘦'. τ(𝘦') ⊆ t' ∧ tı.𝘸'(súq, a)(𝘦'). ∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸') = jí ∧ buja.𝘸'(súq)(𝘦'))(𝘦) | inanimate(a)\"",
	);
	expect(d('Âo, ꝡä tı súq máq, nä buja jí súq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∀𝘸' : SHE(𝘸)(𝘸') ∧ ∃𝘦'. τ(𝘦') ⊆ t' ∧ tı.𝘸'(súq, a)(𝘦'). ∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸') = jí ∧ buja.𝘸'(súq)(𝘦') | ¬∃𝘦'. τ(𝘦') ⊆ t' ∧ tı.𝘸(súq, a)(𝘦')))(𝘦) | inanimate(a)\"",
	);
	expect(d('Êa, ꝡä tı súq máq, nä buja jí súq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘸' : SHE(𝘸)(𝘸') ∧ ∃𝘦'. τ(𝘦') ⊆ t' ∧ tı.𝘸'(súq, a)(𝘦'). ∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸') = jí ∧ buja.𝘸'(súq)(𝘦') | ¬∃𝘦'. τ(𝘦') ⊆ t' ∧ tı.𝘸(súq, a)(𝘦')))(𝘦) | inanimate(a)\"",
	);
});

test('it denotes name verbs', () => {
	expect(d('Mı Kenhaq jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ mı.𝘸(jí, “Kenhaq”)(𝘦'))(𝘦)\"",
	);
	expect(d('Mıru Kenhaq jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ mıru.𝘸(jí, “Kenhaq”)(𝘦'))(𝘦)\"",
	);
});

test('it denotes quotes', () => {
	expect(d('Cho jí shú ‹arane›')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ cho.𝘸(jí, a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ eq.𝘸(a, “arane”)(𝘦')))(𝘦) | abstract(a)\"",
	);
	expect(d('Kuq íme mó «Maı jí súq» teo')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ AGENT(𝘦')(𝘸) = íme ∧ kuq.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ eq.𝘸(a, “Maı jí súq”)(𝘦')))(𝘦) | abstract(a)\"",
	);
});

test('it denotes the event accessor', () => {
	expect(d('Kaqgaı jí, é marao súq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ kaqgaı.𝘸(jí, a)(𝘦') | ∃𝘦' : 𝘦' = a. AGENT(𝘦')(𝘸) = súq ∧ marao.𝘸(𝘦')))(𝘦) | animate(a)\"",
	);
	expect(d('Ë marao óguı ráı')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦' : 𝘦' = b. AGENT(𝘦')(𝘸) = a ∧ marao.𝘸(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ raı.𝘸(b)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ oguı.𝘸(a)(𝘦')))(𝘦) | animate(a)\"",
	);
});

test('it denotes focus adverbs', () => {
	expect(d('Shıe tó jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∀𝘢 : A(𝘢)(jí)(𝘸). ¬∃𝘦'. τ(𝘦') ⊆ t ∧ shıe.𝘸(𝘢)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ shıe.𝘸(jí)(𝘦')))(𝘦)\"",
	);
	expect(d('Shıe máo jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ shıe.𝘸(jí)(𝘦') | ∃𝘢 : A(𝘢)(jí)(𝘸). ∃𝘦'. τ(𝘦') ⊆ t ∧ shıe.𝘸(𝘢)(𝘦')))(𝘦)\"",
	);
});

test('it removes redundant presuppositions from binding sites', () => {
	// There should be only one set of presuppositions for the focused DP
	expect(d('Shıe tó gúobe')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∀𝘢 : A(𝘢)(a)(𝘸). ¬∃𝘦'. τ(𝘦') ⊆ t ∧ shıe.𝘸(𝘢)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ shıe.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ guobe.𝘸(a)(𝘦')))(𝘦) | animate(a)\"",
	);
	// Likewise, there should be only one set of presuppositions for each conjunct
	expect(d('Shıe gúobe rú óguı')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ((∃𝘦'. τ(𝘦') ⊆ t ∧ shıe.𝘸(b)(𝘦')) ∧ ∃𝘦'. τ(𝘦') ⊆ t ∧ shıe.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t'' ∧ guobe.𝘸(b)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ oguı.𝘸(a)(𝘦')))(𝘦) | animate(b) | animate(a)\"",
	);
});
