import nearley from 'nearley';
import { Ungrammatical, isKunaError } from '../core/error';
import grammar from '../grammar';
import type { Tree } from '../tree';

export function parse(sentence: string): Tree[] {
	try {
		const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
		parser.feed(sentence);
		return parser.results as Tree[];
	} catch (e) {
		if (isKunaError(e)) throw e;
		const message = `${e}`;
		// Abbreviate nearleyjs's enormous error messages.
		if (/based on:/.test(message)) {
			throw new Ungrammatical(
				message
					.replace(/token based on:(\n .+)*/gm, '')
					.replace(/^A /gm, '    - a ')
					.replace(/_/g, ' '),
			);
		}
		throw new Ungrammatical(message);
	}
}
