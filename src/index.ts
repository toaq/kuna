import { toDocument } from './latex';
import * as fs from 'fs';
import { alignGlossSentence, glossSentence } from './gloss';
import yargs from 'yargs';
import { pngGlossSentence } from './png-gloss';
import nearley from 'nearley';
import grammar from './grammar';
import { Tree } from './tree';
import { fix } from './fix';
import { denote } from './denote';
import { pngDrawTree } from './draw-tree';
import { parse } from './parse';
import { initializeDictionary } from './dictionary';

initializeDictionary();
import { textual_tree_from_json } from './textual-tree';

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
			fs.writeFileSync(argv.output as string, imgBuffer);
		},
	)
	.command(
		'tree-png',
		'Tree to PNG format',
		yargs => {
			yargs.demandOption('sentence');
			yargs.option('output', {
				type: 'string',
				describe: 'Path for PNG output',
				default: 'output.png',
			});
		},

		function (argv) {
			const trees = parse(argv.sentence!);
			fs.writeFileSync('a.png', pngDrawTree(trees[0]));
			fs.writeFileSync('b.png', pngDrawTree(fix(trees[0])));
			fs.writeFileSync('c.png', pngDrawTree(denote(fix(trees[0]))));
		},
	)
	.command(
		'tree-json',
		'List of parse trees in JSON format',
		yargs => {
			yargs.demandOption('sentence');
		},

		function (argv) {
			const trees = parse(argv.sentence!).map(fix);
			console.log(JSON.stringify(trees));
		},
	)
	.command(
		'ttree',
		'List of parse trees in plain text format',
		yargs => {
			yargs.demandOption('sentence');
		},

		function (argv) {
			const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
			parser.feed(argv.sentence!);
			const trees = (parser.results as Tree[]).map(fix);
			trees.forEach((v: any) => {
				console.log(textual_tree_from_json(v));
			});
		},
	)
	.command(
		'tree-latex',
		'Tree to LaTeX',
		yargs => {
			yargs.demandOption('sentence');
			yargs.option('output', {
				type: 'string',
				describe: 'Path for LaTeX output',
				default: 'output.tex',
			});
		},
		function (argv) {
			const trees = parse(argv.sentence!).map(fix).map(denote);

			console.log(trees.length + ' parses');
			fs.writeFileSync(argv.output as string, toDocument(trees));
		},
	)
	.strict()
	.demandCommand()
	.help().argv;
