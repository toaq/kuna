import { expect, test } from 'vitest';
import { parse } from '../modes/parse';
import { assertRose, findSubtree } from '../tree';
import { describeSerial } from './frame';
import { segmentSerial } from './serial';

function parseAndSegmentSerial(text: string): string[][] {
	const tree = parse(`báq ${text}`)[0];
	const serial = findSubtree(tree, '*Serialdet')!;
	assertRose(serial);
	const segments = segmentSerial(serial.children);
	return segments.map(s => s.map(w => w.source));
}

test('it segments serials', () => {
	expect(parseAndSegmentSerial('rua')).toEqual([['rua']]);
	expect(parseAndSegmentSerial('du rua')).toEqual([['du', 'rua']]);
	expect(parseAndSegmentSerial('rua de')).toEqual([['rua'], ['de']]);
	expect(parseAndSegmentSerial('rua jaq de')).toEqual([['rua'], ['jaq', 'de']]);
	expect(parseAndSegmentSerial('du rua jaq de')).toEqual([
		['du', 'rua'],
		['jaq', 'de'],
	]);
	expect(parseAndSegmentSerial('du sho jaq de')).toEqual([
		['du', 'sho', 'jaq', 'de'],
	]);
	expect(parseAndSegmentSerial('du jaq kịde')).toEqual([
		['du', 'jaq'],
		['kı-', 'de'],
	]);
	expect(parseAndSegmentSerial('du kịjaq de')).toEqual([
		['du'],
		['kı-', 'jaq', 'de'],
	]);
});

function describe(text: string): [boolean, string] {
	const tree = parse(`báq ${text}`)[0];
	const serial = findSubtree(tree, '*Serialdet')!;
	assertRose(serial);
	const children = serial.children;
	const description = describeSerial(children);
	if (!description) return [false, 'bizarre'];
	const slots = description.slots
		.map(group =>
			group
				.map(
					({ verbIndex, slotIndex }) =>
						`${children[verbIndex].source}${slotIndex + 1}`,
				)
				.join('='),
		)
		.join(' ');
	return [description.didSerialize, slots];
}

test('it describes serials', () => {
	expect(describe('do')).toEqual([false, 'do1 do2 do3']);
	expect(describe('jaq de')).toEqual([true, 'de1']);
	expect(describe('dua de')).toEqual([true, 'dua1 de1']);
	expect(describe('jaq cho')).toEqual([true, 'cho1 cho2']);
	expect(describe('dua cho')).toEqual([true, 'dua1 cho1 cho2']);
	expect(describe('rua jaq de')).toEqual([true, 'rua1']);
	expect(describe('leo baı')).toEqual([true, 'leo1=baı1 baı2']);
	expect(describe('taq cho')).toEqual([true, 'taq1=cho1=cho2']);
	expect(describe('chı do')).toEqual([true, 'chı1 do1 do2 do3']);
	expect(describe('nue do')).toEqual([true, 'nue1=do1 nue2 do2 do3']);
});
