import classNames from 'classnames';
import _ from 'lodash';
import { ReactElement, useEffect, useRef, useState } from 'react';
import { useDarkMode, useLocalStorage } from 'usehooks-ts';

import { boxify } from '../boxes';
import { compact as compactTree } from '../compact';
import { treeToEnglish } from '../english/tree';
import { fix } from '../fix';
import { Glosser } from '../gloss';
import { parse } from '../parse';
import { denote } from '../semantics/denote';
import { toLatex, toPlainText } from '../semantics/render';
import { textual_tree_from_json } from '../textual-tree';
import { Tree } from '../tree';
import { drawTreeToCanvas, Theme } from '../tree/draw';

import {
	compact as compactDenotation,
	CompactExpr,
} from '../semantics/compact';
import { ToaqTokenizer } from '../tokenize';
import { denotationRenderLatex, denotationRenderText } from '../tree/place';
import { Boxes } from './Boxes';
import { Tokens } from './Tokens';
import { TreeBrowser } from './TreeBrowser';

type TreeMode =
	| 'syntax-tree'
	| 'compact-tree'
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
	| 'logical-form'
	| 'logical-form-latex'
	| 'english'
	| 'tokens';
type TreeFormat = 'png-latex' | 'png-text' | 'textual' | 'json' | 'react';

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

export interface MainProps {
	input?: string;
	mode?: Mode;
}

export function Main(props: MainProps) {
	const darkMode = useDarkMode();
	const [parseCount, setParseCount] = useState(0);
	const [parseIndex, setParseIndex] = useState(0);
	const [inputText, setInputText] = useLocalStorage<string>(
		'input',
		'De cháq da.',
	);
	const [explanationDismissed, setExplanationDismissed] = useLocalStorage(
		'explanationDismissed',
		false,
	);

	const [latestMode, setLatestMode] = useState<Mode | undefined>(props.mode);
	const [latestOutput, setLatestOutput] = useState<ReactElement>(
		<>Output will appear here.</>,
	);
	const math = latestMode?.startsWith('logical-form');
	const treeImg = useRef<HTMLImageElement>(null);
	const [meaningCompact, setMeaningCompact] = useState(false);

	const [treeFormat, setTreeFormat] = useState<TreeFormat>('png-latex');
	useEffect(() => {
		if (props.mode) generate(props.mode);
		else if (latestMode) generate(latestMode);
	}, [
		darkMode.isDarkMode,
		props.input,
		props.mode,
		treeFormat,
		parseIndex,
		meaningCompact,
	]);

	function getInput(): string {
		return props.input ?? inputText;
	}

	function parseInput(): Tree {
		const trees = parse(getInput());
		if (trees.length === 0) throw new Error('No parse');
		setParseCount(trees.length);
		if (parseIndex >= trees.length) {
			setParseIndex(0);
			return trees[0];
		}
		return trees[parseIndex];
	}

	function getBoxes(strategy: 'flat' | 'nest' | 'split'): ReactElement {
		const tree = parseInput();
		const outputs = boxify(tree);
		const divs = outputs.map((b, i) => (
			<Boxes key={i} {...b} cpStrategy={strategy} />
		));
		return <>{divs}</>;
	}

	function getTree(mode: TreeMode): ReactElement {
		let tree = parseInput();
		if (mode !== 'raw-tree') tree = fix(tree);
		if (mode === 'compact-tree') tree = compactTree(tree);
		if (mode.includes('semantics')) tree = denote(tree as any);
		switch (treeFormat) {
			case 'textual':
				return (
					<pre>{textual_tree_from_json(tree).replace(/\x1b\[\d+m/g, '')}</pre>
				);
			case 'png-latex':
			case 'png-text':
				const theme = darkMode.isDarkMode ? 'dark' : 'light';
				const baseRenderer =
					treeFormat === 'png-latex'
						? denotationRenderLatex
						: denotationRenderText;
				const renderer =
					mode === 'semantics-tree-compact'
						? (e: CompactExpr, t: Theme) =>
								baseRenderer(compactDenotation(e), t)
						: baseRenderer;
				const tall = mode.includes('semantics');
				drawTreeToCanvas({ theme, tall, tree, renderer }).then(canvas => {
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
					/>
				);
			case 'json':
				return <pre>{JSON.stringify(tree, undefined, 1)}</pre>;
			case 'react':
				return <TreeBrowser tree={tree} />;
		}
	}

	function getGloss(easy: boolean): ReactElement {
		setParseCount(1);
		return (
			<div className="gloss-output">
				{new Glosser(easy).glossSentence(getInput()).map((g, i) => (
					<div className="gloss-item" key={i}>
						<div className="gloss-toaq">{g.toaq}</div>
						<div className="gloss-english">{g.english}</div>
					</div>
				))}
			</div>
		);
	}

	function getLogicalForm(
		renderer: (e: CompactExpr) => string,
		compact: boolean,
	): ReactElement {
		let expr: any = denote(fix(parseInput())).denotation;
		if (!expr) return <>No denotation</>;
		if (compact) expr = compactDenotation(expr);
		return <>{renderer(expr)}</>;
	}

	function getEnglish(): ReactElement {
		const tree = parseInput();
		return <>{treeToEnglish(tree).text}</>;
	}

	function getTokens(): ReactElement {
		setParseCount(1);
		const tokenizer = new ToaqTokenizer();
		tokenizer.reset(getInput());
		return <Tokens tokens={tokenizer.tokens} />;
	}

	function getOutput(mode: Mode): ReactElement {
		switch (mode) {
			case 'boxes-flat':
				return getBoxes('flat');
			case 'boxes-nest':
				return getBoxes('nest');
			case 'boxes-split':
				return getBoxes('split');
			case 'syntax-tree':
			case 'compact-tree':
			case 'semantics-tree':
			case 'semantics-tree-compact':
			case 'raw-tree':
				return getTree(mode);
			case 'gloss':
				return getGloss(true);
			case 'technical-gloss':
				return getGloss(false);
			case 'logical-form':
				return getLogicalForm(toPlainText, meaningCompact);
			case 'logical-form-latex':
				return getLogicalForm(toLatex, meaningCompact);
			case 'english':
				return getEnglish();
			case 'tokens':
				return getTokens();
		}
	}

	function generate(mode: Mode): void {
		setLatestMode(mode);
		try {
			setLatestOutput(getOutput(mode));
		} catch (e) {
			setLatestOutput(<span className="error">{errorString(e)}</span>);
		}
	}

	return (
		<>
			{!explanationDismissed && (
				<div className="card explanation">
					<p>
						This is a parser for the constructed language{' '}
						<a href="https://toaq.net/">Toaq</a>. It can interpret Toaq
						sentences and convert them to a variety of output formats.
					</p>
					<p>
						Write some Toaq in the textbox below, then click one of the buttons
						to see the output.
					</p>
					<button
						className="dismiss"
						onClick={() => setExplanationDismissed(true)}
					>
						Dismiss
					</button>
				</div>
			)}
			{!props.input && (
				<div className="card settings">
					<textarea
						rows={3}
						value={inputText}
						onChange={e => {
							setInputText(e.target.value);
							setExplanationDismissed(true);
						}}
					/>
					<div className="toggles">
						<label>
							Tree format:
							<select
								onChange={e => setTreeFormat(e.target.value as TreeFormat)}
							>
								<option value="png-latex">Image (LaTeX)</option>
								<option value="png-text">Image (plain text)</option>
								<option value="textual">Text art</option>
								<option value="json">JSON</option>
								<option value="react">React</option>
							</select>
						</label>
					</div>
					<div className="buttons">
						<div className="button-group">
							<div className="button-group-name">Debug</div>
							<button onClick={() => generate('tokens')}>Tokens</button>
							<button onClick={() => generate('raw-tree')}>Raw tree</button>
						</div>
						<div className="button-group">
							<div className="button-group-name">Tree</div>
							<button onClick={() => generate('syntax-tree')}>Syntax</button>
							<button onClick={() => generate('compact-tree')}>
								Simplified
							</button>
							<button onClick={() => generate('semantics-tree')}>
								Denoted
							</button>
							<button onClick={() => generate('semantics-tree-compact')}>
								Compact
							</button>
						</div>
						<div className="button-group">
							<div className="button-group-name">Boxes</div>
							<button onClick={() => generate('boxes-flat')}>Flat</button>
							<button onClick={() => generate('boxes-nest')}>Nested</button>
							<button onClick={() => generate('boxes-split')}>Split</button>
						</div>
						<div className="button-group">
							<div className="button-group-name">Gloss</div>
							<button onClick={() => generate('gloss')}>Friendly</button>
							<button onClick={() => generate('technical-gloss')}>
								Technical
							</button>
						</div>
						<div className="button-group">
							<div className="button-group-name">Translate</div>
							<button onClick={() => generate('english')}>English</button>
						</div>
						<div className="button-group">
							<div className="button-group-name">Meaning</div>
							<button onClick={() => generate('logical-form')}>Text</button>
							<button onClick={() => generate('logical-form-latex')}>
								LaTeX
							</button>
							<label>
								<input
									type="checkbox"
									checked={meaningCompact}
									onChange={e => setMeaningCompact(e.target.checked)}
								/>
								Compact
							</label>
						</div>
					</div>
				</div>
			)}
			{parseCount > 1 ? (
				<div className="card center">
					<div className="error">
						Kuna found multiple parses for this sentence.
					</div>
					<div className="parses">
						{_.range(parseCount).map(i => (
							<button
								key={i}
								className={parseIndex === i ? 'current' : ''}
								onClick={() => setParseIndex(i)}
							>
								{i + 1}
							</button>
						))}
					</div>
					<div className={classNames('output', { math })}>{latestOutput}</div>
				</div>
			) : (
				<div className={classNames('card', 'output', { math })}>
					{latestOutput}
				</div>
			)}
		</>
	);
}
