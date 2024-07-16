import * as fs from 'node:fs';
import KDL from 'kdljs';
import yargs from 'yargs';
import { toEnglish } from './english/tree';
import { formatTreeAsKdl } from './modes/kdl';
import { toDocument } from './modes/latex';
import { parse } from './modes/parse';
import { pngGlossSentence } from './modes/png-gloss';
import { testSentences } from './modes/test-sentences';
import { textual_tree_from_json } from './modes/textual-tree';
import { Glosser } from './morphology/gloss';
import { ToaqTokenizer } from './morphology/tokenize';
import { denote } from './semantics/denote';
import type { DTree } from './semantics/model';
import {
	jsonStringifyCompact,
	toJson,
	toLatex,
	toPlainText,
} from './semantics/render';
import { recover } from './syntax/recover';
import type { Tree } from './tree';
import { drawTreeToCanvas } from './tree/draw';
import { denotationRenderText } from './tree/place';
import { trimTree } from './tree/trim';

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

		argv => {
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
		argv => {
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

		argv => {
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

		async argv => {
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
			const canvas = await drawTreeToCanvas(trees[0], {
				themeName: theme,
				tall: argv.semantics,
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

		argv => {
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

		argv => {
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

		argv => {
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
		argv => {
			const trees = getTrees(argv);
			console.log(`${trees.length} parses`);
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

		argv => {
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
		argv => {
			testSentences((argv as any).failures as boolean, toEnglish);
		},
	)
	.command(
		'english',
		'Machine-translate to English',
		yargs => {
			yargs.demandOption('sentence');
		},
		argv => {
			console.log(toEnglish(argv.sentence!));
		},
	)
	.strict()
	.demandCommand()
	.help().argv;
