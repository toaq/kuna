import classNames from 'classnames';
import _ from 'lodash';
import {
	type ReactElement,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from 'react';

import { treeToEnglish } from '../english/tree';
import { boxify } from '../modes/boxes';
import { parse } from '../modes/parse';
import { textual_tree_from_json } from '../modes/textual-tree';
import { Glosser } from '../morphology/gloss';
import { denote } from '../semantics/denote';
import { toJsx, toLatex, toPlainText } from '../semantics/render';
import { recover } from '../syntax/recover';
import { drawTreeToCanvas } from '../tree/draw';
import { trimTree } from '../tree/trim';

import { keyFor } from '../core/misc';
import { GfTarget, GfTranslator } from '../gf';
import { ToaqTokenizer } from '../morphology/tokenize';
import type { Expr } from '../semantics/types';
import type { Tree } from '../tree';
import { denotationRenderLatex, denotationRenderText } from '../tree/place';
import { toScene } from '../tree/scene';
import { themes } from '../tree/theme';
import { Boxes } from './Boxes';
import { Button } from './Button';
import GfResult from './GfResult';
import type { Configuration } from './Settings';
import { Tokens } from './Tokens';
import { TreeBrowser } from './tree/TreeBrowser';

function errorString(e: any): string {
	const string = String(e);
	console.error(e);
	// Abbreviate nearleyjs's enormous error messages.
	if (/based on:/.test(string)) {
		return string
			.replace(/token based on:(\n .+)*/gm, '')
			.replace(/^A /gm, '    - a ')
			.replace(/_/g, ' ');
	}
	return string;
}

export interface OutputProps {
	configuration: Configuration;
	isDarkMode: boolean;
	inspect: (inspectee: ReactNode) => void;
}

export function Output(props: OutputProps) {
	const [parseIndex, setParseIndex] = useState(0);
	const {
		text,
		treeFormat,
		roofLabels,
		trimNulls,
		showMovement,
		meaningCompact,
		mode,
	} = props.configuration;
	const treeImg = useRef<HTMLImageElement>(null);
	let trees: Tree[];
	let error = 'No parse';
	try {
		trees = parse(text);
	} catch (e) {
		error = `${e}`.replace(/A (\w+) token based on:(\n .+)+/g, (_, x) => x);
		trees = [];
	}
	const parseCount = trees.length;
	useEffect(() => {
		if (parseIndex >= parseCount) setParseIndex(0);
	}, [parseIndex, parseCount]);

	const needsParse =
		mode !== 'tokens' && mode !== 'gloss' && mode !== 'technical-gloss';
	if (needsParse && parseCount === 0) {
		return <div className="mx-4 my-2">{error}</div>;
	}

	function getBoxes(strategy: 'flat' | 'nest' | 'split'): ReactElement {
		const tree = trees[parseIndex];
		const outputs = boxify(tree);
		const divs = outputs.map(b => (
			<Boxes
				key={keyFor(b)}
				{...b}
				cpStrategy={strategy}
				isDarkMode={props.isDarkMode}
			/>
		));
		return <>{divs}</>;
	}

	function getTree(): ReactElement {
		let tree = trees[parseIndex];
		if (mode !== 'raw-tree') tree = recover(tree);
		if (mode.includes('semantics')) tree = denote(tree as any);
		if (trimNulls) tree = trimTree(tree);
		switch (treeFormat) {
			case 'textual':
				return (
					// biome-ignore lint/suspicious/noControlCharactersInRegex: they do actually occur in the output
					<pre>{textual_tree_from_json(tree).replace(/\x1b\[\d+m/g, '')}</pre>
				);
			case 'png-latex':
			case 'png-text':
				drawTreeToCanvas(tree, {
					themeName: props.isDarkMode ? 'dark' : 'light',
					tall: mode.includes('semantics'),
					renderer:
						treeFormat === 'png-latex'
							? denotationRenderLatex
							: denotationRenderText,
					showMovement: showMovement,
					compact: mode === 'semantics-tree-compact',
					truncateLabels: roofLabels.trim().split(/[\s,]+/),
				}).then(canvas => {
					setTimeout(() => {
						if (treeImg.current) {
							treeImg.current.src = canvas.toDataURL();
						}
					}, 0);
				});
				return (
					<img
						ref={treeImg}
						style={{
							maxWidth: '90vw',
							maxHeight: '90vh',
							objectFit: 'contain',
						}}
						src={''}
						aria-label="Tree diagram"
					/>
				);
			case 'json':
				return <pre>{JSON.stringify(tree, undefined, 1)}</pre>;
			case 'react': {
				const themeName = props.isDarkMode ? 'dark' : 'light';
				return (
					<TreeBrowser
						scene={toScene(
							tree,
							showMovement,
							roofLabels.trim().split(/[\s,]+/),
						)}
						key={new Date().toString()}
						compactDenotations={mode === 'semantics-tree-compact'}
						theme={themes[themeName]}
						truncateLabels={roofLabels.trim().split(/[\s,]+/)}
					/>
				);
			}
		}
	}

	function getGloss(easy: boolean): ReactElement {
		return (
			<div className="flex flex-wrap gap-2">
				{new Glosser(easy).glossSentence(text).map((g, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: order is stable
					<div className="gloss-item" key={i}>
						<div className="font-bold">{g.toaq}</div>
						<div className="text-sm">{g.english}</div>
					</div>
				))}
			</div>
		);
	}

	function getLogicalForm(
		renderer: (e: Expr, compact?: boolean) => ReactNode,
	): ReactNode {
		const expr: any = denote(recover(trees[parseIndex])).denotation;
		if (!expr) return 'No denotation';
		return renderer(expr, meaningCompact);
	}

	function getEnglish(): ReactElement {
		const tree = trees[parseIndex];
		return <>{treeToEnglish(tree).text}</>;
	}

	function getGf(target: GfTarget): ReactElement {
		const tree = trees[parseIndex];
		const recovered = recover(tree);
		const translator = new GfTranslator(target);
		const gf = translator.showGf(translator.treeToGf(recovered));
		return <GfResult gf={gf} target={target} />;
	}

	function getTokens(): ReactElement {
		const tokenizer = new ToaqTokenizer();
		tokenizer.reset(text);
		return <Tokens tokens={tokenizer.tokens} />;
	}

	function getOutput(): ReactElement {
		switch (mode) {
			case 'boxes-flat':
				return getBoxes('flat');
			case 'boxes-nest':
				return getBoxes('nest');
			case 'boxes-split':
				return getBoxes('split');
			case 'syntax-tree':
			case 'semantics-tree':
			case 'semantics-tree-compact':
			case 'raw-tree':
				return getTree();
			case 'gloss':
				return getGloss(true);
			case 'technical-gloss':
				return getGloss(false);
			case 'logical-form-math':
				return <>{getLogicalForm(toJsx)}</>;
			case 'logical-form-text':
				return <>{getLogicalForm(toPlainText)}</>;
			case 'logical-form-latex':
				return <>{getLogicalForm(toLatex)}</>;
			case 'english':
				return getEnglish();
			case 'gf1':
				return getGf(GfTarget.ResourceDemo);
			case 'gf2':
				return getGf(GfTarget.LibraryBrowser);
			case 'tokens':
				return getTokens();
		}
	}

	let latestOutput: ReactNode;
	try {
		latestOutput = getOutput();
	} catch (e) {
		latestOutput = <span className="error">{errorString(e)}</span>;
	}

	return (
		<>
			{parseCount > 1 ? (
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
							{_.range(parseCount).map(i => (
								<Button key={i} onClick={() => setParseIndex(i)}>
									{i + 1}
								</Button>
							))}
						</div>
					</div>

					<div
						className={classNames(
							'output',
							`output-${props.configuration.mode}`,
						)}
					>
						{latestOutput}
					</div>
				</div>
			) : (
				<div
					className={classNames(
						'px-4 py-2',
						'output',
						`output-${props.configuration.mode}`,
					)}
				>
					{latestOutput}
				</div>
			)}
		</>
	);
}
