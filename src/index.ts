import { toDocument } from './latex';
import * as fs from 'fs';
import { alignGlossSentence } from './gloss';
import yargs from 'yargs';
import { pngGlossSentence } from './png-gloss';
import { Tree } from './tree';
import { fix } from './fix';
import { compact } from './compact';
import { pngDrawTree } from './draw-tree';
import { parse } from './parse';
import { initializeDictionary } from './dictionary';
import { textual_tree_from_json } from './textual-tree';
import { testSentences } from './test-sentences';
import { denote } from './semantics/denote';

initializeDictionary();

function getTrees(argv: {
	sentence: string | undefined;
	surface: boolean | undefined;
	semantics: boolean | undefined;
	compact: boolean | undefined;
}): Tree[] {
	let trees = parse(argv.sentence!);
	if (argv.semantics) {
		trees = trees.map(fix).map(denote);
	} else if (!argv.surface) {
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
	.option('surface', {
		type: 'boolean',
		describe: 'View surface-level parse',
		default: false,
	})
	.option('semantics', {
		type: 'boolean',
		describe: 'Annotate parse tree with semantics',
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
			yargs.option('light', {
				type: 'boolean',
				describe: 'Light theme',
			});
		},

		function (argv) {
			const trees = getTrees(argv);
			if (trees.length === 0) {
				console.error('No parse.');
				return;
			}
			if (trees.length > 1) {
				console.warn(
					`Ambiguous parse; showing first of ${trees.length} parses.`,
				);
			}
			const theme = argv.light ? 'light' : 'dark';
			fs.writeFileSync(argv.output as string, pngDrawTree(trees[0], theme));
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
		() => {},
		function () {
			testSentences();
		},
	)
	.strict()
	.demandCommand()
	.help().argv;
