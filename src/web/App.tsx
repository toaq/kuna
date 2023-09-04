import { ReactElement, FormEvent, useState, useEffect } from 'react';
import './App.css';
import { parse } from '../parse';
import { toEnglish } from '../english';
import { initializeDictionary } from '../dictionary';
import { pngDrawTree } from '../draw-tree';
import { fix } from '../fix';
import { denote } from '../semantics/denote';

export function App() {
	const [outputMode, setOutputMode] = useState<string>('tree-png');
	const [inputText, setInputText] = useState<string>('Poq jí da.');
	const [latestOutput, setLatestOutput] = useState<ReactElement>(
		<>Output will appear here.</>,
	);
	const [fixEnabled, setFixEnabled] = useState(false);
	const [denoteEnabled, setDenoteEnabled] = useState(false);
	useEffect(() => {
		initializeDictionary();
	});
	function get(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (outputMode === 'english') {
			setLatestOutput(<>{toEnglish(inputText)}</>);
		} else if (outputMode === 'tree-png') {
			const trees = parse(inputText);
			if (trees.length === 1) {
				const theme = 'light';
				let tree = trees[0];
				if (fixEnabled) {
					tree = fix(tree);
					if (denoteEnabled) tree = denote(tree as any);
				}
				const canvas = pngDrawTree(tree, theme);
				const url = canvas.toDataURL();
				setLatestOutput(<img style={{ maxHeight: '500px' }} src={url} />);
			}
		}
	}
	return (
		<div className="kuna">
			<h1>Kuna</h1>
			<div className="card settings">
				<form onSubmit={get}>
					<label>
						Output mode:&nbsp;
						<select
							value={outputMode}
							onChange={e => setOutputMode(e.target.value)}
						>
							<option value="english">English</option>
							<option value="tree-png">Tree</option>
						</select>
					</label>
					<label>
						<input
							type="checkbox"
							checked={fixEnabled}
							onChange={e => {
								if (fixEnabled) {
									setDenoteEnabled(false);
								}
								setFixEnabled(!fixEnabled);
							}}
						></input>
						Restore deep structure
					</label>
					<label>
						<input
							type="checkbox"
							checked={denoteEnabled}
							onChange={e => {
								if (!denoteEnabled) {
									setFixEnabled(true);
								}
								setDenoteEnabled(!denoteEnabled);
							}}
						></input>
						Show semantics
					</label>
					<textarea
						rows={3}
						value={inputText}
						onChange={e => setInputText(e.target.value)}
					/>
					<button type="submit">Submit</button>
				</form>
			</div>
			<div className="card output">{latestOutput}</div>
		</div>
	);
}
