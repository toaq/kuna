import { toDocument } from './latex';
import * as fs from 'fs';
import { alignGlossSentence, glossSentence } from './gloss';
import yargs from 'yargs';
import { pngGlossSentence } from './png-gloss';
import nearley from 'nearley';
import grammar from './grammar';
import { Tree } from './tree';
import { fix } from './fix';

yargs
	.scriptName('kuna')
	.usage('$0 <mode> --sentence "Hıo ka"')
	.option('sentence', {
		type: 'string',
		describe: 'The Toaq sentence to parse',
	})
	.command(
		'gloss-ascii',
		'Gloss to aligned ASCII format',
		yargs => {
			yargs.demandOption('sentence');
		},
		function (argv) {
			console.log(alignGlossSentence(argv.sentence!));
		},
	)
	.command(
		'gloss-png',
		'Gloss to PNG format',
		yargs => {
			yargs.demandOption('sentence');
			yargs.option('output', {
				type: 'string',
				describe: 'Path for PNG output',
				default: 'output.png',
			});
		},

		function (argv) {
			const imgBuffer = pngGlossSentence(argv.sentence!);
			fs.writeFileSync('output.png', imgBuffer);
		},
	)
	.command(
		'stree',
		'Save surface-level grammar tree to LaTeX',
		yargs => {
			yargs.demandOption('sentence');
			yargs.option('output', {
				type: 'string',
				describe: 'Path for LaTeX output',
				default: 'output.tex',
			});
		},
		function (argv: any) {
			const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
			parser.feed(argv.sentence);
			const trees = (parser.results as Tree[]).map(fix);
			// console.dir(trees, { depth: null });

			// const output = expectEOF(
			// 	SAP.parse(preprocess(lexer.parse(argv.sentence)!)),
			// );
			// if (!output.successful) {
			// 	throw new TokenError(output.error.pos, output.error.message);
			// }
			// if (output.candidates.length === 0) {
			// 	throw new TokenError(undefined, 'No result is returned.');
			// }

			console.log(trees.length + ' parses');
			fs.writeFileSync(argv.output, toDocument(trees));
		},
	)
	.strict()
	.demandCommand()
	.help().argv;
