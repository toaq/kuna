import { range } from 'lodash-es';
import { type ReactNode, useMemo, useRef, useState } from 'react';
import { Ungrammatical } from '../core/error';
import { treeToEnglish } from '../english/tree';
import { GfTarget, GfTranslator } from '../gf';
import { boxify } from '../modes/boxes';
import { parse } from '../modes/parse';
import { Glosser } from '../morphology/gloss';
import { ToaqTokenizer } from '../morphology/tokenize';
import {
	EarleyParser,
	type Grammar,
	type Rule,
	type Symb,
} from '../parse/earley';
import { denote } from '../semantics/denote';
import { toJsx, toLatex, toPlainText } from '../semantics/render';
import type { DETree, Expr } from '../semantics/types';
import { getErrors, isUngrammatical } from '../semantics/utils';
import { recover } from '../syntax/recover';
import { Button } from './Button';
import { DeleteButton } from './DeleteButton';
import { ErrorBoundary } from './ErrorBoundary';
import { type KunaOutput, Output } from './Output';

export type TreeMode =
	| 'syntax-tree'
	| 'semantics-tree'
	| 'semantics-tree-compact'
	| 'raw-tree';

export type Mode =
	| 'boxes-flat'
	| 'boxes-nest'
	| 'boxes-split'
	| TreeMode
	| 'gloss'
	| 'technical-gloss'
	| 'formula-math'
	| 'formula-text'
	| 'formula-latex'
	| 'english'
	| 'gf1'
	| 'gf2'
	| 'tokens'
	| 'help'
	| 'earley';

export type TreeFormat =
	| 'png-latex'
	| 'png-text'
	| 'textual'
	| 'json'
	| 'react';

export interface Configuration {
	text: string;
	treeFormat: TreeFormat;
	roofLabels: string;
	trimNulls: boolean;
	showMovement: boolean;
	meaningCompact: boolean;
	mode: Mode;
}

export interface Interaction {
	id: number;
	command: string;
	configuration?: Configuration;
}

const paletteCommands: {
	name: string;
	description: string;
	instant?: boolean;
}[] = [
	{ name: 'boxes', description: 'Visualize grammar' },
	{ name: 'formula', description: 'Interpret Toaq text' },
	{ name: 'gloss', description: 'Translate each word' },
	{ name: 'help', description: 'Show help', instant: true },
	{ name: 'tokens', description: 'Show a table of tokens' },
	{ name: 'tree', description: 'Show a syntax tree' },
];

const hints = [
	'Enter some Toaq',
	'Try: /boxes De cháq',
	'Enter some Toaq',
	'Try: /gloss Toe ji2 ke2 zeo',
	'Enter some Toaq',
	'Try: /tokens bu nai fi nuo',
];

export function InteractionView(props: {
	interaction: Interaction;
	current: boolean;
	isDarkMode: boolean;
	setCommand: (command: string) => void;
	onSubmit: (input: string) => void;
	delete?: () => void;
	scrollToBottom?: () => void;
}) {
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [paletteIndex, setPaletteIndex] = useState<number>();
	const [deleting, setDeleting] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const config = props.interaction.configuration;

	const trees: DETree[] | { output: KunaOutput; star: boolean } =
		useMemo(() => {
			if (config === undefined) return [];
			try {
				const trees = parse(config.text);
				if (trees.length === 0)
					return {
						output: { type: 'error', error: new Ungrammatical('No parse') },
						star: true,
					};
				return trees.map(recover).map(denote);
			} catch (error) {
				return {
					output: {
						type: 'error',
						error,
					},
					star: error instanceof Ungrammatical,
				};
			}
		}, [config]);

	const outputs: { output: KunaOutput; star: boolean }[] = useMemo(() => {
		if (config === undefined) return [];
		const { mode, text } = config;
		const star = 'output' in trees ? trees.star : trees.every(isUngrammatical);

		try {
			if (mode === 'tokens') {
				const tokenizer = new ToaqTokenizer();
				tokenizer.reset(text);
				return [
					{
						output: { type: 'tokens', tokens: tokenizer.tokens },
						star,
					},
				];
			}

			if (mode === 'gloss' || mode === 'technical-gloss')
				return [
					{
						output: {
							type: 'gloss',
							gloss: new Glosser(mode === 'gloss').glossSentence(text),
						},
						star,
					},
				];

			if (mode === 'help') return [{ output: { type: 'help' }, star }];

			if (mode === 'earley') {
				type NT = string;
				type T = string;
				const cleaned = text.replaceAll('->', '→').replaceAll(/\s/g, '');
				const rules = cleaned.split(';');
				const last = rules.pop() as string;
				const inputString: T[] = [...last];
				function parseSymb(s: string): Symb<T, NT> {
					return /^[A-Z]$/.test(s) ? { nonterminal: s } : { terminal: s };
				}
				function parseRule(r: string): Rule<T, NT> {
					return {
						head: r.split('→')[0],
						body: [...r.split('→')[1]].map(s => parseSymb(s)),
					};
				}
				const grammar: Grammar<T, NT> = {
					start: 'S',
					rules: rules.map(r => parseRule(r)),
				};
				const parser = new EarleyParser<T, NT>(grammar, s => s);
				return [
					{
						output: {
							type: 'earley',
							parser,
							table: parser.parse(inputString).table,
						},
						star,
					},
				];
			}
		} catch (error) {
			return [{ output: { type: 'error', error }, star }];
		}

		if ('output' in trees) return [trees];
		return trees.map(tree => {
			const star = isUngrammatical(tree);
			try {
				switch (mode) {
					case 'boxes-flat':
						return {
							output: { type: 'boxes', strategy: 'flat', boxes: boxify(tree) },
							star,
						};
					case 'boxes-nest':
						return {
							output: { type: 'boxes', strategy: 'nest', boxes: boxify(tree) },
							star,
						};
					case 'boxes-split':
						return {
							output: { type: 'boxes', strategy: 'split', boxes: boxify(tree) },
							star,
						};
					case 'syntax-tree':
					case 'semantics-tree':
					case 'semantics-tree-compact':
					case 'raw-tree':
						return {
							output: {
								type: 'tree',
								tree,
								showMovement: config.showMovement,
								meaningCompact: config.meaningCompact,
								roofLabels: config.roofLabels.trim().split(/[\s,]+/),
							},
							star,
						};
					case 'english':
						return {
							output: { type: 'english', english: treeToEnglish(tree).text },
							star,
						};
					case 'gf1':
					case 'gf2': {
						const target =
							mode === 'gf1' ? GfTarget.ResourceDemo : GfTarget.LibraryBrowser;
						const translator = new GfTranslator(target);
						const gf = translator.showGf(translator.treeToGf(tree));
						return { output: { type: 'gf', target, gf }, star };
					}
				}

				// All remaining output modes require a denotation
				if (!('denotation' in tree)) {
					return {
						output: { type: 'error', error: `${getErrors(tree)[0]}` },
						star,
					};
				}
				let renderer: (e: Expr) => ReactNode;
				switch (mode) {
					case 'formula-math':
						renderer = toJsx;
						break;
					case 'formula-text':
						renderer = toPlainText;
						break;
					case 'formula-latex':
						renderer = toLatex;
				}
				return {
					output: { type: 'formula', expr: tree.denotation, renderer },
					star,
				};
			} catch (error) {
				return { output: { type: 'error', error }, star };
			}
		});
	}, [config, trees]);

	const [outputIndex, setOutputIndex] = useState(0);
	if (outputs.length > 0 && outputIndex >= outputs.length) setOutputIndex(0);
	const output = outputs[outputIndex];

	return (
		<div
			className={`grid !transition-all duration-200 ${deleting ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}
		>
			<div className="relative gap-2 p-4 md:p-7 w-full border-gray-300">
				<div className="flex flex-row gap-2 items-baseline">
					({props.interaction.id}) {output?.star && '*'}
					<input
						// biome-ignore lint/a11y/noAutofocus: only field worth focusing
						autoFocus={props.current}
						ref={inputRef}
						placeholder={hints[props.interaction.id % hints.length]}
						type="text"
						className="!bg-transparent !border-t-0 !border-x-0 !border-b-2 focus:!border-blue focus:outline-none field-sizing-content min-w-[calc(100svw-120px)] md:min-w-80 max-w-160"
						value={props.interaction.command}
						onChange={e => {
							props.setCommand(e.currentTarget.value);
							if (e.currentTarget.value.match(/^\/[a-z-]*$/) !== null) {
								setPaletteOpen(true);
								const i = paletteCommands.findIndex(command =>
									command.name.startsWith(e.currentTarget.value.slice(1)),
								);
								if (i !== -1) setPaletteIndex(i);
								else if (paletteIndex === undefined) setPaletteIndex(0);
								props.scrollToBottom?.();
							} else {
								setPaletteOpen(false);
								setPaletteIndex(undefined);
							}
						}}
						onKeyDown={e => {
							if (e.key === 'ArrowUp') {
								e.preventDefault();
								setPaletteIndex(
									paletteIndex === undefined
										? 0
										: (paletteIndex - 1 + paletteCommands.length) %
												paletteCommands.length,
								);
							} else if (e.key === 'ArrowDown') {
								e.preventDefault();
								setPaletteIndex(
									paletteIndex === undefined
										? 0
										: (paletteIndex + 1) % paletteCommands.length,
								);
							} else if (
								paletteOpen &&
								(e.key === 'Tab' || e.key === 'Enter') &&
								paletteIndex !== undefined
							) {
								e.preventDefault();
								const completion = `/${paletteCommands[paletteIndex].name} `;
								props.setCommand(completion);
								setPaletteIndex(undefined);
								setPaletteOpen(false);
								if (paletteCommands[paletteIndex].instant) {
									props.onSubmit(completion);
								}
							} else if (e.key === 'Enter') {
								props.onSubmit(e.currentTarget.value);
							}
						}}
					/>
					{props.delete ? (
						<DeleteButton
							onClick={() => {
								setDeleting(true);
								setTimeout(() => {
									props.delete?.();
								}, 200);
							}}
						/>
					) : null}
				</div>
				{paletteOpen ? (
					<div className="z-20 bg-white dark:bg-gray-900 w-fit mt-2 border border-gray-400">
						<div className="flex flex-col gap-0">
							{paletteCommands.map(({ name, description }, index) => (
								// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled elsewhere
								<div
									key={name}
									className={`px-2 py-1 !duration-0 ${index === paletteIndex ? 'bg-blue/20 dark:bg-blue/40' : ''}`}
									onClick={() => {
										props.setCommand(`/${name} `);
										setPaletteIndex(undefined);
										setPaletteOpen(false);
										inputRef.current?.focus();
									}}
								>
									<strong className="w-16 inline-block">/{name}</strong>{' '}
									{description}
								</div>
							))}
						</div>
					</div>
				) : props.current ? (
					<div className="h-40" />
				) : null}
				{output && (
					<ErrorBoundary>
						<div className="ml-4 mt-2">
							{outputs.length === 1 ? (
								<div className={'px-4 py-2'}>
									<Output
										output={output.output}
										isDarkMode={props.isDarkMode}
									/>
								</div>
							) : (
								<div className="card center ml-4 my-2">
									<div className="mb-2 px-4 py-2">
										❗ Kuna found multiple parses for this sentence.{' '}
										<a
											className="text-blue-500 underline"
											href="https://github.com/toaq/kuna/issues/new"
										>
											Report issue
										</a>
										<div className="flex mt-2 gap-1">
											{range(outputs.length).map(i => (
												<Button key={i} onClick={() => setOutputIndex(i)}>
													{i + 1}
												</Button>
											))}
										</div>
									</div>
									<Output
										output={output.output}
										isDarkMode={props.isDarkMode}
									/>
								</div>
							)}
						</div>
					</ErrorBoundary>
				)}
			</div>
		</div>
	);
}
