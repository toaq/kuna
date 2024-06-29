import classNames from 'classnames';
import _ from 'lodash';
import { ReactElement, useEffect, useRef, useState } from 'react';
import { useDarkMode } from 'usehooks-ts';

import { boxify } from '../modes/boxes';
import { trimTree } from '../tree/trim';
import { treeToEnglish } from '../english/tree';
import { recover } from '../syntax/recover';
import { Glosser } from '../morphology/gloss';
import { parse } from '../modes/parse';
import { denote } from '../semantics/denote';
import { toLatex, toPlainText } from '../semantics/render';
import { textual_tree_from_json } from '../modes/textual-tree';
import { drawTreeToCanvas } from '../tree/draw';

import { ToaqTokenizer } from '../morphology/tokenize';
import { denotationRenderLatex, denotationRenderText } from '../tree/place';
import { Boxes } from './Boxes';
import { Tokens } from './Tokens';
import { TreeBrowser } from './TreeBrowser';
import { themes } from '../tree/theme';
import { GfTarget, GfTranslator } from '../gf';
import GfResult from './GfResult';
import { Expr } from '../semantics/model';
import { Configuration, Mode, Settings } from './Settings';

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
}

export function Output(props: OutputProps) {
	const darkMode = useDarkMode();
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
	const math = props.configuration.mode.startsWith('logical-form');
	const treeImg = useRef<HTMLImageElement>(null);
	const trees = parse(text);
	const parseCount = trees.length;
	useEffect(() => {
		if (parseIndex >= parseCount) setParseIndex(0);
	}, [parseIndex, setParseIndex, parseCount]);

	const needsParse =
		mode !== 'tokens' && mode !== 'gloss' && mode !== 'technical-gloss';
	if (needsParse && parseCount === 0) {
		return (
			<div className={classNames('card', 'output', 'error')}>No parse</div>
		);
	}

	function getBoxes(strategy: 'flat' | 'nest' | 'split'): ReactElement {
		const tree = trees[parseIndex];
		const outputs = boxify(tree);
		const divs = outputs.map((b, i) => (
			<Boxes key={i} {...b} cpStrategy={strategy} />
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
					<pre>{textual_tree_from_json(tree).replace(/\x1b\[\d+m/g, '')}</pre>
				);
			case 'png-latex':
			case 'png-text':
				drawTreeToCanvas({
					themeName: darkMode.isDarkMode ? 'dark' : 'light',
					tall: mode.includes('semantics'),
					tree,
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
					/>
				);
			case 'json':
				return <pre>{JSON.stringify(tree, undefined, 1)}</pre>;
			case 'react': {
				const themeName = darkMode.isDarkMode ? 'dark' : 'light';
				return (
					<TreeBrowser
						tree={tree}
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
			<div className="gloss-output">
				{new Glosser(easy).glossSentence(text).map((g, i) => (
					<div className="gloss-item" key={i}>
						<div className="gloss-toaq">{g.toaq}</div>
						<div className="gloss-english">{g.english}</div>
					</div>
				))}
			</div>
		);
	}

	function getLogicalForm(
		renderer: (e: Expr, compact?: boolean) => string,
	): ReactElement {
		let expr: any = denote(recover(trees[parseIndex])).denotation;
		if (!expr) return <>No denotation</>;
		return <>{renderer(expr, meaningCompact)}</>;
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
			case 'logical-form':
				return getLogicalForm(toPlainText);
			case 'logical-form-latex':
				return getLogicalForm(toLatex);
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

	let latestOutput;
	try {
		latestOutput = getOutput();
	} catch (e) {
		latestOutput = <span className="error">{errorString(e)}</span>;
	}

	return (
		<>
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
