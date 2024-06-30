import { expect, test } from 'vitest';
import { toEnglish } from './tree';

test('it translates Toaq to English', () => {
	expect(toEnglish('Kaqsı élu jí')).toMatchInlineSnapshot(
		'"The elephant watches me."',
	);
	expect(toEnglish('Fıeq jí sá gıaq')).toMatchInlineSnapshot(
		'"I create some music."',
	);
	expect(toEnglish('Faq hí raı?')).toMatchInlineSnapshot('"What happens?"');
	expect(toEnglish('Faq sá gı.')).toMatchInlineSnapshot(
		'"Some good thing happens."',
	);

	expect(toEnglish('Naı nuo jí')).toMatchInlineSnapshot('"I sleep."');
	expect(toEnglish('Pu nuo jí')).toMatchInlineSnapshot('"I slept."');
	expect(toEnglish('Jıa nuo jí')).toMatchInlineSnapshot('"I will sleep."');
	expect(toEnglish('Chum nuo jí')).toMatchInlineSnapshot('"I am sleeping."');
	expect(toEnglish('Pu chum nuo jí')).toMatchInlineSnapshot(
		'"I was sleeping."',
	);
	expect(toEnglish('Jıa chum nuo jí')).toMatchInlineSnapshot(
		'"I will be sleeping."',
	);
	expect(toEnglish('Luı nuo jí')).toMatchInlineSnapshot('"I have slept."');
	expect(toEnglish('Pu luı nuo jí')).toMatchInlineSnapshot('"I had slept."');
	expect(toEnglish('Jıa luı nuo jí')).toMatchInlineSnapshot(
		'"I will have slept."',
	);

	expect(toEnglish('Dua jí, ꝡä soaqche nháo')).toMatchInlineSnapshot(
		'"I know that she is a gardener."',
	);
	expect(toEnglish('Dua jí, mä soaqche nháo')).toMatchInlineSnapshot(
		'"I know if she is a gardener."',
	);
	expect(toEnglish('Ma soaqche nháo?')).toMatchInlineSnapshot(
		'"Is she a gardener?"',
	);
	expect(toEnglish('Bu soaqche nháo.')).toMatchInlineSnapshot(
		'"She isn\'t a gardener."',
	);
});
