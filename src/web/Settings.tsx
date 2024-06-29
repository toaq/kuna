import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useDarkMode, useLocalStorage } from 'usehooks-ts';

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
	| 'logical-form'
	| 'logical-form-latex'
	| 'english'
	| 'gf1'
	| 'gf2'
	| 'tokens';

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

export interface SettingsProps {
	onSubmit: (configuration: Configuration) => void;
	dismissExplanation: () => void;
}

export function Settings(props: SettingsProps) {
	const [advanced, setAdvanced] = useLocalStorage('advanced', false);
	const [test, setText] = useLocalStorage<string>('input', 'De cháq da.');
	const [treeFormat, setTreeFormat] = useLocalStorage<TreeFormat>(
		'tree-format',
		'png-latex',
	);
	const [roofLabels, setRoofLabels] = useState('');
	const [trimNulls, setTrimNulls] = useState(false);
	const [showMovement, setShowMovement] = useState(false);
	const [meaningCompact, setMeaningCompact] = useState(false);
	const [lastMode, setLastMode] = useState<Mode>();
	const darkMode = useDarkMode();

	function submit(mode: Mode) {
		if (mode) {
			props.onSubmit({
				text: test,
				treeFormat,
				roofLabels,
				trimNulls,
				showMovement,
				meaningCompact,
				mode,
			});
		}
	}

	function render(mode: Mode) {
		setLastMode(mode);
		submit(mode);
	}
	useEffect(
		() => lastMode && submit(lastMode),
		[
			treeFormat,
			roofLabels,
			trimNulls,
			showMovement,
			meaningCompact,
			lastMode,
			darkMode.isDarkMode,
		],
	);

	return (
		<div className="card settings" style={{ width: '30em' }}>
			<textarea
				rows={3}
				value={test}
				onChange={e => {
					setText(e.target.value);
					props.dismissExplanation();
				}}
			/>
			<div className="toggles">
				<div>
					<label>
						<input
							type="checkbox"
							checked={advanced}
							onChange={e => setAdvanced(e.target.checked)}
						/>
						Advanced options
					</label>
				</div>
				{advanced && (
					<>
						<div>
							<label>Tree format:</label>
							<select
								value={treeFormat}
								onChange={e => setTreeFormat(e.target.value as TreeFormat)}
							>
								<option value="png-latex">Image (LaTeX)</option>
								<option value="png-text">Image (plain text)</option>
								<option value="react">React (WIP)</option>
								<option value="textual">Text art</option>
								<option value="json">JSON</option>
							</select>
						</div>
						<div>
							<label>Roof labels:</label>
							<input
								type="text"
								value={roofLabels}
								onChange={e => setRoofLabels(e.target.value)}
								placeholder={`DP QP`}
							/>
						</div>
						<div>
							<label>
								<input
									type="checkbox"
									checked={trimNulls}
									onChange={e => setTrimNulls(e.target.checked)}
								/>
								Trim nulls
							</label>
							<label>
								<input
									type="checkbox"
									checked={showMovement}
									onChange={e => setShowMovement(e.target.checked)}
								/>
								Show movement
							</label>
						</div>
					</>
				)}
			</div>
			<div className="buttons">
				{advanced && (
					<div className="button-group">
						<div className="button-group-name">Debug</div>
						<button onClick={() => render('tokens')}>Tokens</button>
						<button onClick={() => render('raw-tree')}>Raw tree</button>
					</div>
				)}
				<div className="button-group">
					<div className="button-group-name">Tree</div>
					<button onClick={() => render('syntax-tree')}>Syntax</button>
					<button onClick={() => render('semantics-tree')}>Denoted</button>
					{advanced && (
						<>
							<button onClick={() => render('semantics-tree-compact')}>
								Compact
							</button>
						</>
					)}
				</div>
				<div className="button-group">
					<div className="button-group-name">Boxes</div>
					<button onClick={() => render('boxes-flat')}>Flat</button>
					<button onClick={() => render('boxes-nest')}>Nested</button>
					<button onClick={() => render('boxes-split')}>Split</button>
				</div>
				<div className="button-group">
					<div className="button-group-name">Gloss</div>
					<button onClick={() => render('gloss')}>Friendly</button>
					<button onClick={() => render('technical-gloss')}>Technical</button>
				</div>
				<div className="button-group">
					<div className="button-group-name">Translate</div>
					<button onClick={() => render('english')}>English</button>
					{advanced && (
						<button onClick={() => render('gf1')}>GF (Quantity)</button>
					)}
					{advanced && (
						<button onClick={() => render('gf2')}>GF (Quality)</button>
					)}
					{!advanced && <button onClick={() => render('gf2')}>GF</button>}
				</div>
				{advanced && (
					<div className="button-group">
						<div className="button-group-name">Meaning</div>
						<button onClick={() => render('logical-form')}>Text</button>
						<button onClick={() => render('logical-form-latex')}>LaTeX</button>
						<label>
							<input
								type="checkbox"
								checked={meaningCompact}
								onChange={e => setMeaningCompact(e.target.checked)}
							/>
							Compact
						</label>
					</div>
				)}
			</div>
		</div>
	);
}
