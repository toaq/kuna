import { test, expect } from 'vitest';
import { guessFrameFromDefinition } from './frame';

// prettier-ignore
test('it makes frames from Toadua definitions', () => {
	expect(guessFrameFromDefinition('▯ is a test of ▯.')).toEqual('c c');
    expect(guessFrameFromDefinition('▯ is one thing; ▯ is another thing.')).toEqual('c');
	expect(guessFrameFromDefinition('▯ tells ▯ that ▯ is the case.')).toEqual('c c 0');
	expect(guessFrameFromDefinition('▯ tests out satisfying property ▯.')).toEqual('c 1');
	expect(guessFrameFromDefinition('▯ tests out satisfying ▯.')).toEqual('c 1');
	expect(guessFrameFromDefinition('▯ is less than ▯ in property ▯.')).toEqual('c c 1');
	expect(guessFrameFromDefinition('That ▯ is the case saddens ▯.')).toEqual('0 c');
});
