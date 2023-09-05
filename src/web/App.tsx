import { ReactElement, useState, useEffect } from 'react';
import './App.css';
import { parse } from '../parse';
import { toEnglish } from '../english';
import { initializeDictionary } from '../dictionary';
import { pngDrawTree } from '../draw-tree';
import { fix } from '../fix';
import { denote } from '../semantics/denote';
import { Glosser } from '../gloss';
import { compact } from '../compact';

function errorString(e: any): string {
	const string = String(e);
    // Abbreviate nearleyjs's enormous error messages.
	return string.replace(/Instead, I .*$/ms, '');
}

export function App() {
	const [inputText, setInputText] = useState<string>('Poq jí da.');
	const [latestOutput, setLatestOutput] = useState<ReactElement>(
		<>Output will appear here.</>,
	);
	useEffect(() => {
		initializeDictionary();
	});
	function show(f: () => ReactElement) {
		try {
			setLatestOutput(f());
		} catch (e) {
			setLatestOutput(<span className="error">{errorString(e)}</span>);
		}
	}
	function showEnglish() {
		show(() => <>{toEnglish(inputText)}</>);
	}
	function showGloss(easy: boolean) {
		show(() => (
			<div className="gloss-output">
				{new Glosser(easy).glossSentence(inputText).map((g, i) => (
					<div className="gloss-item" key={i}>
						<div className="gloss-toaq">{g.toaq}</div>
						<div className="gloss-english">{g.english}</div>
					</div>
				))}
			</div>
		));
	}
	function showTree(level: 'raw' | 'fixed' | 'compacted' | 'denoted') {
		show(() => {
			const trees = parse(inputText);
			if (trees.length > 1) {
				return <span>Parse ambiguity ({trees.length} parses).</span>;
			} else if (trees.length === 0) {
				return <span>No parse.</span>;
			}
			const theme = 'light';
			let tree = trees[0];
			if (level !== 'raw') tree = fix(tree);
			if (level === 'compacted') tree = compact(tree);
			if (level === 'denoted') tree = denote(tree as any);
			const canvas = pngDrawTree(tree, theme);
			const url = canvas.toDataURL();
			return <img style={{ maxHeight: '500px' }} src={url} />;
		});
	}
	return (
		<div className="kuna">
			<h1>mí Kuna</h1>
			<div className="card settings">
				<textarea
					rows={3}
					value={inputText}
					onChange={e => setInputText(e.target.value)}
				/>
				<div className="buttons">
					<button onClick={() => showTree('fixed')}>Syntax tree</button>
					<button onClick={() => showTree('compacted')}>Compact tree</button>
					<button onClick={() => showTree('denoted')}>Semantics tree</button>
					<button onClick={() => showTree('raw')}>Raw tree</button>
					<br />
					<button onClick={() => showGloss(true)}>Gloss</button>
					<button onClick={() => showGloss(false)}>Technical gloss</button>
					<button onClick={() => showEnglish()}>English</button>
					<br />
				</div>
			</div>
			<div className="card output">{latestOutput}</div>
		</div>
	);
}
