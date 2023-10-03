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
			sub();
			break;
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

test('it denotes an intranstive verb', () => {
	expect(d('Nuo páqda')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ nuo.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ paqda.𝘸(a)(𝘦')))(𝘦) | animate(a)\"",
	);
});

test('it denotes a transtive verb', () => {
	expect(d('Chuq nháo súshı')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ AGENT(𝘦')(𝘸) = nháo ∧ chuq.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ sushı.𝘸(a)(𝘦')))(𝘦) | inanimate(a)\"",
	);
});

test('it denotes a ditranstive verb', () => {
	expect(d('Do jí nháo súshı')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ AGENT(𝘦')(𝘸) = jí ∧ do.𝘸(a, nháo)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ sushı.𝘸(a)(𝘦')))(𝘦) | inanimate(a)\"",
	);
});

test('it denotes the assertive speech act', () => {
	expect(d('De nháo da')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ de.𝘸(nháo)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the performative speech act', () => {
	expect(d('Hıo jí súq ka')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ karuaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ hıo.𝘸(súq)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the optative speech act', () => {
	expect(d('Fa súq jéarıaq ba')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ baruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ AGENT(𝘦')(𝘸) = súq ∧ fa.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ jearıaq.𝘸(a)(𝘦')))(𝘦) | inanimate(a)\"",
	);
});

test('it denotes the promissive speech act', () => {
	expect(d('Jıa faq sía huı nha')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nue.w(λ𝘸. ¬∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ huı.𝘸(𝘢)(𝘦'). ∃𝘦'. τ(𝘦') ⊆ t ∧ faq.𝘸(𝘢)(𝘦'))(𝘦) | t > t0\"",
	);
});

test('it denotes the permissive speech act', () => {
	expect(d('Chuq súq sá raı doa')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ shoe.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ raı.𝘸(𝘢)(𝘦'). ∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = súq ∧ chuq.𝘸(𝘢)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the admonitive speech act', () => {
	expect(d('Aona sá puao ꝡo')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ zaru.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ puao.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ aona.𝘸(𝘢)(𝘦') | inanimate(𝘢)))(𝘦)\"",
	);
});

test('it denotes the present tense', () => {
	expect(d('Naı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦) | t ⊆ t0\"",
	);
});

test('it denotes the past tense', () => {
	expect(d('Pu jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦) | t < t0\"",
	);
});

test('it denotes the future tense', () => {
	expect(d('Jıa jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦) | t > t0\"",
	);
});

test('it denotes the near past tense', () => {
	expect(d('Pujuı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦) | t <.near t0\"",
	);
});

test('it denotes the near future tense', () => {
	expect(d('Jıajuı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦) | t >.near t0\"",
	);
});

test('it denotes the unrestricted existential tense', () => {
	expect(d('Sula jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘵. ∃𝘦'. τ(𝘦') ⊆ 𝘵 ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the existential past tense', () => {
	expect(d('Mala jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘵 : 𝘵 < t0. ∃𝘦'. τ(𝘦') ⊆ 𝘵 ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the existential future tense', () => {
	expect(d('Jela jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘵 : 𝘵 > t0. ∃𝘦'. τ(𝘦') ⊆ 𝘵 ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the perfective aspect', () => {
	expect(d('Tam jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the imperfective aspect', () => {
	expect(d('Chum jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∀𝘸' : IW(𝘸')(𝘸)(t). ∃𝘦'. t ⊆ τ(𝘦') ∧ jaı.𝘸'(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the retrospective aspect', () => {
	expect(d('Luı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') < t ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the prospective aspect', () => {
	expect(d('Za jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') > t ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the superfective aspect', () => {
	expect(d('Hoaı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. t ⊆ τ(𝘦') ∧ t > ExpEnd(𝘦') ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the subfective aspect', () => {
	expect(d('Haı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. t ⊆ τ(𝘦') ∧ t < ExpStart(𝘦') ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the near retrospective aspect', () => {
	expect(d('Hıq jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') <.near t ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes the near prospective aspect', () => {
	expect(d('Fı jaı jí')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') >.near t ∧ jaı.𝘸(jí)(𝘦'))(𝘦)\"",
	);
});

test('it denotes an exophoric variable reference', () => {
	expect(d('Sao jío')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t' ∧ sao.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t ∧ jıo.𝘸(a)(𝘦')))(𝘦) | inanimate(a)\"",
	);
});

test('it denotes an exophoric animacy reference', () => {
	expect(d('Sao máq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘦'. τ(𝘦') ⊆ t ∧ sao.𝘸(a)(𝘦'))(𝘦) | inanimate(a)\"",
	);
});

test('it denotes a variable anaphor', () => {
	expect(d('Sá nıaı nä kıaı jí níaı')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ nıaı.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ kıaı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes an animacy anaphor', () => {
	expect(d('Sá nıaı nä kıaı jí hó')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ nıaı.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ kıaı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes a cleft verb', () => {
	expect(d('Sá nıaı nä kıaı jí hóa')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ nıaı.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ kıaı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes sá', () => {
	expect(d('Maı jí sá poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes tú', () => {
	expect(d('Maı jí tú poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∀.SING 𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes sía', () => {
	expect(d('Maı jí sía poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ¬∃𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes túq', () => {
	expect(d('Maı jí túq poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∀.CUML 𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes tútu', () => {
	expect(d('Maı jí tútu poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ∀𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes báq', () => {
	expect(d('Maı jí báq poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. GEN 𝘢 : ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(𝘢)(𝘦'). (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(𝘢)(𝘦') | animate(𝘢)))(𝘦)\"",
	);
});

test('it denotes ní', () => {
	expect(d('Maı jí ní poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(a)(𝘦')))(𝘦) | animate(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦)\"",
	);
});

test('it denotes níjuı', () => {
	expect(d('Maı jí níjuı poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(a)(𝘦')))(𝘦) | animate(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ tıjuı.w(a, jí)(𝘦)\"",
	);
});

test('it denotes níjao', () => {
	expect(d('Maı jí níjao poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(a)(𝘦')))(𝘦) | animate(a) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nıka.w(a)(𝘦) | ∃𝘦. τ(𝘦) ⊆ t0 ∧ tıjao.w(a, jí)(𝘦)\"",
	);
});

test('it denotes ké', () => {
	expect(d('Maı jí ké poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(a)(𝘦')))(𝘦) | animate(a) | ¬∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)\"",
	);
});

test('it denotes hú', () => {
	expect(d('Maı jí hú poq')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. (∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ maı.𝘸(a)(𝘦') | ∃𝘦'. τ(𝘦') ⊆ t' ∧ poq.𝘸(a)(𝘦')))(𝘦) | animate(a) | ∃𝘦. τ(𝘦) <.near t0 ∧ meakuq.w(a)(𝘦)\"",
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

test('it denotes bu', () => {
	expect(d('Bu mala geq jí nháo')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ ruaq.w(λ𝘸. ¬∃𝘵 : 𝘵 < t0. ∃𝘦'. τ(𝘦') ⊆ 𝘵 ∧ AGENT(𝘦')(𝘸) = jí ∧ geq.𝘸(nháo)(𝘦'))(𝘦)\"",
	);
});

test('it denotes jeo', () => {
	expect(d('Jeo jıa gaq jí súna nha')).toMatchInlineSnapshot(
		"\"∃𝘦. τ(𝘦) ⊆ t0 ∧ AGENT(𝘦)(w) = jí ∧ nue.w(λ𝘸. †∃𝘦'. τ(𝘦') ⊆ t ∧ AGENT(𝘦')(𝘸) = jí ∧ gaq.𝘸(a, súna)(𝘦'))(𝘦) | t > t0\"",
	);
});
