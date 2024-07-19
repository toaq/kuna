import { expect, test } from 'vitest';
import { makeGloss } from './build-data';

test('it extracts glosses from Toadua definitions', () => {
	expect(makeGloss('▯ is brillig.')).toEqual('brillig');
	expect(makeGloss('▯ is a slithy tove.')).toEqual('slithy tove');
	expect(makeGloss('▯ gyres/gimbles.')).toEqual('gyres');
	expect(makeGloss('▯ are mimsy.')).toEqual('mimsy');
	expect(makeGloss('▯ is the Jabberwock.')).toEqual('Jabberwock');
	expect(makeGloss('▯ is the Jabberwock; ▯ is xyz.')).toEqual('Jabberwock');
	expect(makeGloss('▯ is the Jabberwock, and etc.')).toEqual('Jabberwock');
	expect(makeGloss('▯ is a vorpal blade to ▯.')).toEqual('vorpal blade');
	expect(makeGloss('‘galumph’; ▯ chortled in his joy.')).toEqual('galumph');
	expect(makeGloss("'galumph'; ▯ chortled in his joy.")).toEqual('galumph');
	expect(makeGloss('▯ came whiffling through the tulgey wood.')).toEqual(
		'came whiffling through the tulgey wood',
	);

	// detıao
	expect(
		makeGloss(
			'▯ and ▯ go beautifully together; ▯ nicely suits / fits / looks good on ▯.',
		),
	).toEqual('nicely suits');
});
