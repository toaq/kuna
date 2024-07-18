import { expect, test } from 'vitest';
import { parse } from '../modes/parse';
import { assertRose, findSubtree } from '../tree';
import { describeSerial, segmentSerial } from './serial';

function parseAndSegmentSerial(text: string): string[][] {
	const tree = parse(text)[0];
	const serial = findSubtree(tree, '*Serial')!;
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

function parseAndDescribeSerial(text: string): string {
	const tree = parse(text)[0];
	const serial = findSubtree(tree, '*Serial')!;
	assertRose(serial);
	const children = serial.children;
	const description = describeSerial(children);
	if (!description) return 'bizarre';
	return description
		.map(
			({ verbIndex, slotIndex }) =>
				`${children[verbIndex].source}${slotIndex + 1}`,
		)
		.join(' ');
}

test('it describes serials', () => {
	expect(parseAndDescribeSerial('do')).toEqual('do1 do2 do3');
	expect(parseAndDescribeSerial('jaq de')).toEqual('de1');
	expect(parseAndDescribeSerial('dua de')).toEqual('dua1 de1');
	expect(parseAndDescribeSerial('jaq cho')).toEqual('cho1 cho2');
	expect(parseAndDescribeSerial('dua cho')).toEqual('dua1 cho1 cho2');
	expect(parseAndDescribeSerial('rua jaq de')).toEqual('rua1');
	expect(parseAndDescribeSerial('leo baı')).toEqual('leo1 baı2');
	expect(parseAndDescribeSerial('taq cho')).toEqual('taq1');
	expect(parseAndDescribeSerial('chı do')).toEqual('chı1 do1 do2 do3');
});
