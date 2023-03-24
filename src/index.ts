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
import { compact } from './compact';
import { pngDrawTree } from './draw-tree';
import { parse } from './parse';
import { initializeDictionary } from './dictionary';
import { textual_tree_from_json } from './textual-tree';
import { testSentences } from './test-sentences';

initializeDictionary();

function getTrees(argv: {
	sentence: string | undefined;
	dStructure: boolean | undefined;
	semantics: boolean | undefined;
	compact: boolean | undefined;
}): Tree[] {
	let trees = parse(argv.sentence!);
	if (argv.semantics) {
		trees = trees.map(fix).map(denote);
	} else if (argv.dStructure) {
		trees = trees.map(fix);
	}
	if (argv.compact) {
		trees = trees.map(compact);
	}
	return trees;
}

yargs
	.scriptName('kuna')
	.usage('$0 <mode> --sentence "Hıo ka"')
	.option('sentence', {
		type: 'string',
		describe: 'The Toaq sentence to parse',
	})
	.option('d-structure', {
		type: 'boolean',
		describe: 'Transform parse tree to D-structure',
		default: false,
	})
	.option('semantics', {
		type: 'boolean',
		alias: 'denote',
		describe: 'Annotate parse tree with semantics (implies --d-structure)',
		default: false,
	})
	.option('compact', {
		type: 'boolean',
		describe: 'Remove empty phrases with null heads',
		default: false,
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
			const trees = getTrees(argv);
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
			const trees = getTrees(argv);
			console.log(JSON.stringify(trees));
		},
	)
	.command(
		'tree-text',
		'List of parse trees in plain text format',
		yargs => {
			yargs.demandOption('sentence');
		},

		function (argv) {
			const trees = getTrees(argv);
			for (const v of trees) {
				console.log(textual_tree_from_json(v));
			}
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
			const trees = getTrees(argv);
			console.log(trees.length + ' parses');
			fs.writeFileSync(argv.output as string, toDocument(trees));
		},
	)
	.command(
		'test-sentences',
		'Test parsing many sentences',
		yargs => {},
		function (argv) {
			testSentences();
		},
	)
	.strict()
	.demandCommand()
	.help().argv;
