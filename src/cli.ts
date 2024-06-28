import { toDocument } from './modes/latex';
import * as fs from 'fs';
import { Glosser } from './morphology/gloss';
import yargs from 'yargs';
import { pngGlossSentence } from './modes/png-gloss';
import { Tree } from './tree';
import { recover } from './syntax/recover';
import { trimTree } from './tree/trim';
import { drawTreeToCanvas } from './tree/draw';
import { parse } from './modes/parse';
import { textual_tree_from_json } from './modes/textual-tree';
import KDL from 'kdljs';
import { formatTreeAsKdl } from './modes/kdl';
import { testSentences } from './modes/test-sentences';
import { denote } from './semantics/denote';
import { ToaqTokenizer } from './morphology/tokenize';
import { toEnglish } from './english/tree';
import { denotationRenderText } from './tree/place';
import { DTree } from './semantics/model';
import {
	toPlainText,
	toLatex,
	toJson,
	jsonStringifyCompact,
} from './semantics/render';

function getTrees(argv: {
	sentence: string | undefined;
	surface: boolean | undefined;
	semantics: boolean | undefined;
	trim: boolean | undefined;
}): Tree[] {
	let trees = parse(argv.sentence!);
	if (argv.semantics) {
		trees = trees.map(t => recover(t)).map(denote);
	} else if (!argv.surface) {
		trees = trees.map(t => recover(t));
	}
	if (argv.trim) {
		trees = trees.map(trimTree);
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
	.option('movement', {
		type: 'boolean',
		describe: 'Show effects of syntactic movement',
		default: false,
	})
	.option('trim', {
		type: 'boolean',
		describe: 'Remove empty phrases with null heads',
		default: false,
	})
	.option('compact', {
		type: 'boolean',
		describe: 'Use a more compact notation for events',
		default: false,
	})
	.option('easy', {
		type: 'boolean',
		describe: 'Use "easy" glosses like "did" over "PST"',
		default: false,
	})
	.command(
		'tokens-json',
		'List of tokens in JSON format',
		yargs => {
			yargs.demandOption('sentence');
		},

		function (argv) {
			const tokenizer = new ToaqTokenizer();
			tokenizer.reset(argv.sentence as string);
			console.log(JSON.stringify(tokenizer.tokens));
		},
	)
	.command(
		'gloss-ascii',
		'Gloss to aligned ASCII format',
		yargs => {
			yargs.demandOption('sentence');
		},
		function (argv) {
			const glosser = new Glosser(argv.easy);
			console.log(glosser.alignGlossSentence(argv.sentence!));
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
			const imgBuffer = pngGlossSentence(argv.sentence!, { easy: argv.easy });
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

		async function (argv) {
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
			const canvas = await drawTreeToCanvas({
				themeName: theme,
				tall: argv.semantics,
				tree: trees[0],
				renderer: denotationRenderText,
				showMovement: argv.movement,
				compact: argv.compact,
				truncateLabels: [],
			});
			const png = canvas.toBuffer('image/png');
			fs.writeFileSync(argv.output as string, png);
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
		'tree-kdl',
		'List of parse trees in KDL format',
		yargs => {
			yargs.demandOption('sentence');
		},

		function (argv) {
			const trees = getTrees(argv);
			console.log(KDL.format(trees.map(formatTreeAsKdl)));
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
		'denote',
		'Full denotation in given format',
		yargs => {
			yargs.demandOption('sentence');
			yargs.option('format', {
				type: 'string',
				choices: ['text', 'latex', 'json'],
				default: 'text',
			});
		},

		function (argv) {
			const dtrees = getTrees({ ...argv, semantics: true }) as DTree[];
			const format = argv.format as 'text' | 'latex' | 'json';
			const getDenotation = ({ denotation: d }: DTree) => d!;
			switch (format) {
				case 'text':
					for (const dtree of dtrees) {
						console.log(toPlainText(getDenotation(dtree), argv.compact));
					}
					break;
				case 'latex':
					for (const dtree of dtrees) {
						console.log(toLatex(getDenotation(dtree), argv.compact));
					}
					break;
				case 'json':
					console.log(
						jsonStringifyCompact(
							dtrees.map(dtree => toJson(getDenotation(dtree), argv.compact)),
						),
					);
					break;
				default:
					format satisfies never;
			}
		},
	)
	.command(
		'test-sentences',
		'Test parsing many sentences',
		yargs => {
			yargs.option('failures', {
				type: 'boolean',
				describe: 'Only print failures',
			});
		},
		function (argv) {
			testSentences((argv as any).failures as boolean, toEnglish);
		},
	)
	.command(
		'english',
		'Machine-translate to English',
		yargs => {
			yargs.demandOption('sentence');
		},
		function (argv) {
			console.log(toEnglish(argv.sentence!));
		},
	)
	.strict()
	.demandCommand()
	.help().argv;
