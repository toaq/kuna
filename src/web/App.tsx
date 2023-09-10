import { ReactElement, useEffect, useState } from 'react';
import { useDarkMode, useLocalStorage } from 'usehooks-ts';
import { boxify } from '../boxes';
import { compact } from '../compact';
import { initializeDictionary } from '../dictionary';
import { pngDrawTree } from '../draw-tree';
import { toEnglish } from '../english/tree';
import { fix } from '../fix';
import { Glosser } from '../gloss';
import { parse } from '../parse';
import { denote } from '../semantics/denote';
import { Expr } from '../semantics/model';
import { toLatex, toPlainText } from '../semantics/render';
import { textual_tree_from_json } from '../textual-tree';
import { Tree } from '../tree';
import './App.css';
import { Boxes } from './Boxes';

type TreeMode = 'syntax-tree' | 'compact-tree' | 'semantics-tree' | 'raw-tree';
type Mode =
	| 'boxes'
	| TreeMode
	| 'gloss'
	| 'technical-gloss'
	| 'logical-form'
	| 'logical-form-latex'
	| 'english';
type TreeFormat = 'png' | 'textual' | 'json';

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

export function App() {
	const darkMode = useDarkMode();
	const [inputText, setInputText] = useLocalStorage<string>(
		'input',
		'Poq jí da.',
	);
	const [latestMode, setLatestMode] = useState<Mode>();
	const [latestOutput, setLatestOutput] = useState<ReactElement>(
		<>Output will appear here.</>,
	);
	const [treeFormat, setTreeFormat] = useState<TreeFormat>('png');
	useEffect(initializeDictionary, []);
	useEffect(
		() => latestMode && generate(latestMode),
		[darkMode.isDarkMode, treeFormat],
	);

	function parseInput(): Tree {
		const trees = parse(inputText);
		if (trees.length === 0) throw new Error('No parse');
		if (trees.length > 1) throw new Error('Ambiguous parse');
		return trees[0];
	}

	function getBoxes(): ReactElement {
		const tree = parseInput();
		const boxSentence = boxify(tree);
		return <Boxes sentence={boxSentence} />;
	}

	function getTree(mode: TreeMode): ReactElement {
		let tree = parseInput();
		if (mode !== 'raw-tree') tree = fix(tree);
		if (mode === 'compact-tree') tree = compact(tree);
		if (mode === 'semantics-tree') tree = denote(tree as any);
		switch (treeFormat) {
			case 'textual':
				return (
					<pre>{textual_tree_from_json(tree).replace(/\x1b\[\d+m/g, '')}</pre>
				);
			case 'png':
				const theme = darkMode.isDarkMode ? 'dark' : 'light';
				const canvas = pngDrawTree(tree, theme);
				const url = canvas.toDataURL();
				return <img style={{ maxHeight: '500px' }} src={url} />;
			case 'json':
				return <pre>{JSON.stringify(tree, undefined, 1)}</pre>;
		}
	}

	function getGloss(easy: boolean): ReactElement {
		return (
			<div className="gloss-output">
				{new Glosser(easy).glossSentence(inputText).map((g, i) => (
					<div className="gloss-item" key={i}>
						<div className="gloss-toaq">{g.toaq}</div>
						<div className="gloss-english">{g.english}</div>
					</div>
				))}
			</div>
		);
	}

	function getLogicalForm(renderer: (e: Expr) => string): ReactElement {
		const expr = denote(fix(parseInput())).denotation;
		return <>{expr ? renderer(expr) : 'No denotation'}</>;
	}

	function getEnglish(): ReactElement {
		return <>{toEnglish(inputText)}</>;
	}

	function getOutput(mode: Mode): ReactElement {
		switch (mode) {
			case 'boxes':
				return getBoxes();
			case 'syntax-tree':
			case 'compact-tree':
			case 'semantics-tree':
			case 'raw-tree':
				return getTree(mode);
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
		<div className={darkMode.isDarkMode ? 'kuna dark-mode' : 'kuna'}>
			<h1>mí Kuna</h1>
			<button className="toggle-dark-mode" onClick={darkMode.toggle}>
				Toggle dark mode
			</button>
			<div className="card settings">
				<textarea
					rows={3}
					value={inputText}
					onChange={e => setInputText(e.target.value)}
				/>
				<div className="toggles">
					<label>
						Tree format:
						<select onChange={e => setTreeFormat(e.target.value as TreeFormat)}>
							<option value="png">Image</option>
							<option value="textual">Text art</option>
							<option value="json">JSON</option>
						</select>
					</label>
				</div>
				<div className="buttons">
					<button onClick={() => generate('syntax-tree')}>Syntax tree</button>
					<button onClick={() => generate('compact-tree')}>Compact tree</button>
					<button onClick={() => generate('semantics-tree')}>
						Semantics tree
					</button>
					<button onClick={() => generate('raw-tree')}>Raw tree</button>
					<br />
					<button onClick={() => generate('boxes')}>Boxes</button>
					<button onClick={() => generate('gloss')}>Gloss</button>
					<button onClick={() => generate('technical-gloss')}>
						Technical gloss
					</button>
					<button onClick={() => generate('english')}>English</button>
					<br />
					<button onClick={() => generate('logical-form')}>Logical form</button>
					<button onClick={() => generate('logical-form-latex')}>
						Logical form (LaTeX)
					</button>
				</div>
			</div>
			<div className="card output">{latestOutput}</div>
		</div>
	);
}
