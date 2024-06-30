/**
 * This tool processes a nearley.js grammar with "generics", such as
 *
 *      Foo<T> -> Bar<T> Hao<T>
 *      Example -> Foo<x>
 *      Mua -> Foo<y>
 *
 * and expands all the generic templates:
 *
 *      Foo_x -> Bar_x Hao_x
 *      Foo_y -> Bar_y Hao_y
 *      Example -> Foo_x
 *      Mua -> Foo_y
 *
 * Foo<A> (uppercase) is treated as a generic rule with a variable "A", and
 * Foo<b> (lowercase) is treated as an instantiation thereof with A = b.
 *
 * It also processes C-style `#ifdef FLAG / #else / #endif` directives.
 *
 * It's not very fancy, and uses regex to get the job done. It expects rules to
 * be contained in one line and only refer to at most one generic variable.
 */

import * as fs from 'node:fs';

interface Definition {
	lineIndex: number;
	line: string;
}

export function preprocess(lines: string[], flags_?: Set<string>): string[] {
	const flags = flags_ ?? new Set();

	const expanded: string[][] = [];

	/** Map from generic types to the lines they were defined on and their source code. */
	const generics = new Map<string, Definition[]>();

	/** Map from type variables to the values they can take on. */
	const genericValues = new Map<string, string[]>();

	/** Merge the domains of two generic type variables. */
	function merge(x: string, y: string) {
		if (x === y) return;
		const vx = genericValues.get(x);
		const vy = genericValues.get(y);
		if (vx && vy) {
			const union = [...new Set([...vx, ...vy])];
			genericValues.set(x, union);
			genericValues.set(y, union);
		} else if (vx) {
			genericValues.set(y, vx);
		} else if (vy) {
			genericValues.set(x, vy);
		} else {
			const empty: string[] = [];
			genericValues.set(x, empty);
			genericValues.set(y, empty);
		}
	}

	let lineIndex = 0;
	const ifdefs: [string, boolean][] = [];

	for (let line of lines) {
		let m: RegExpMatchArray | null;
		m = line.trim().match(/^#ifdef\s+(\w+)\b/);
		if (m !== null) {
			ifdefs.push([m[1], true]);
			continue;
		}
		m = line.trim().match(/^#ifndef\s+(\w+)\b/);
		if (m !== null) {
			ifdefs.push([m[1], false]);
			continue;
		}
		m = line.trim().match(/^#else\b/);
		if (m !== null) {
			ifdefs[ifdefs.length - 1][1] = !ifdefs[ifdefs.length - 1][1];
			continue;
		}
		m = line.trim().match(/^#endif\b/);
		if (m !== null) {
			ifdefs.pop();
			continue;
		}

		if (!ifdefs.every(([flag, value]) => flags.has(flag) === value)) continue;

		// Expand generic instances (Foo<x> -> Foo_x) and remember the values.
		line = line.replace(/(\w+)<([a-z]\w*)>/g, (_, type, value) => {
			genericValues.set(type, genericValues.get(type) || []);
			const arr = genericValues.get(type)!;
			if (!arr.includes(value)) arr.push(value);
			return `${type}_${value}`;
		});

		m = line.trim().match(/^(\w+)<([A-Z]\w*)>/);
		if (m !== null) {
			const typeName = m[1];
			const typeParam = m[2];
			generics.set(typeName, generics.get(typeName) || []);
			generics.get(typeName)!.push({ lineIndex, line });
			const dependencies = line
				.split('->')[1]
				.split(/\s+/)
				.filter(x => x.endsWith(`<${typeParam}>`))
				.map(x => x.split('<')[0]);
			for (const dep of dependencies) merge(typeName, dep);
			expanded.push([]);
		} else {
			expanded.push([line]);
		}
		lineIndex++;
	}
	for (const [t, defs] of generics.entries()) {
		for (const v of genericValues.get(t)!) {
			for (const { lineIndex, line } of defs) {
				expanded[lineIndex].push(line.replace(/<[A-Z]\w*>/g, `_${v}`));
			}
		}
	}
	return expanded.flat();
}

function main(): void {
	const args = process.argv.slice(2);

	if (args.length < 2) {
		console.error(
			'Usage:\n\n' +
				`    export KUNA_FLAGS="FOO BAR"\n` +
				'    npx esr src/grammar-preprocessor.ts input.kuna.ne output.ne\n',
		);
		process.exit(1);
	}

	const inputPath = args[0];
	const outputPath = args[1];
	const flags = new Set(
		[...(process.env.KUNA_FLAGS ?? '').split(/\s+/)].filter(x => x),
	);
	console.log(`🍳 Preprocessing ${inputPath} into ${outputPath} with flags:`, [
		...flags,
	]);

	const contents: string = fs.readFileSync(inputPath, 'utf-8');
	const converted = preprocess(contents.trim().split('\n'), flags);

	fs.writeFileSync(outputPath, `${converted.join('\n')}\n`, 'utf-8');
	console.log('✨ Preprocessing complete.');
}

if (require.main === module) {
	main();
}
