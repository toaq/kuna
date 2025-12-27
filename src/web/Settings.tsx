import { type ReactNode, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { Button } from './Button';
import BoxesIcon from './icons/BoxesIcon';
import DenotedIcon from './icons/DenotedIcon';
import GlossIcon from './icons/GlossIcon';
import TextIcon from './icons/TextIcon';
import TokensIcon from './icons/TokensIcon';
import TreeIcon from './icons/TreeIcon';
import { InspectContext } from './inspect';

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

export interface SettingsProps {
	onSubmit: (configuration: Configuration) => void;
	dismissExplanation: () => void;
}

export function Settings(props: SettingsProps) {
	const [text, setText] = useLocalStorage<string>('input', 'De cháq da.');
	// const [treeFormat, setTreeFormat] = useLocalStorage<TreeFormat>(
	// 	'tree-format',
	// 	'png-latex',
	// );
	const [roofLabels, setRoofLabels] = useState('');
	const [trimNulls, setTrimNulls] = useState(false);
	const [showMovement, setShowMovement] = useState(false);
	// const [meaningCompact, setMeaningCompact] = useState(false);
	const [lastMode, setLastMode] = useLocalStorage<Mode>(
		'mode-1',
		'syntax-tree',
	);
	const [boxesFormat, setBoxesFormat] = useLocalStorage<Mode>(
		'boxes-format',
		'boxes-flat',
	);

	const [formulaFormat, setFormulaFormat] = useLocalStorage<Mode>(
		'formula-format-1',
		'formula-math',
	);

	const [raw, setRaw] = useState(false);

	const { setInspectee, setInspecteePath } = useContext(InspectContext);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Control') {
				setRaw(true);
			}
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === 'Control') {
				setRaw(false);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	function render(mode: Mode) {
		setInspectee(undefined);
		setInspecteePath(undefined);
		setLastMode(mode);
		if (mode) {
			props.onSubmit({
				text: text,
				treeFormat: 'react',
				roofLabels,
				trimNulls,
				showMovement,
				meaningCompact: false,
				mode,
			});
		}
	}

	let modeSettings: ReactNode;
	switch (lastMode) {
		case 'boxes-flat':
		case 'boxes-nest':
		case 'boxes-split': {
			modeSettings = (
				<div>
					<label htmlFor="select-boxes-format">Boxes format: </label>
					<select
						id="select-boxes-format"
						value={boxesFormat}
						onChange={e => {
							setBoxesFormat(e.target.value as Mode);
							render(e.target.value as Mode);
						}}
					>
						<option value="boxes-flat">Flat</option>
						<option value="boxes-nest">Nested</option>
						<option value="boxes-split">Split</option>
					</select>
				</div>
			);
			break;
		}
		case 'syntax-tree':
		case 'semantics-tree':
		case 'semantics-tree-compact':
		case 'raw-tree':
			modeSettings = (
				<div className="flex flex-col gap-1">
					{/* <div>
						<label>Tree format: </label>
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
					</div> */}
					<div>
						<label htmlFor="shrink-input">Shrink: </label>
						<input
							id="shrink-input"
							type="text"
							value={roofLabels}
							onChange={e => setRoofLabels(e.target.value)}
							placeholder={'DP QP'}
						/>
					</div>
					<div>
						<label className="flex gap-1 align-baseline">
							<input
								className="w-4 h-4"
								type="checkbox"
								checked={trimNulls}
								onChange={e => setTrimNulls(e.target.checked)}
							/>
							Trim nulls
						</label>
					</div>
					<div>
						<label className="flex gap-1 align-baseline">
							<input
								className="w-4 h-4"
								type="checkbox"
								checked={showMovement}
								onChange={e => setShowMovement(e.target.checked)}
							/>
							Show movement
						</label>
					</div>
				</div>
			);
			break;

		case 'gloss':
		case 'technical-gloss':
			modeSettings = <div />;
			break;

		case 'formula-math':
		case 'formula-text':
		case 'formula-latex':
			modeSettings = (
				<div>
					<label htmlFor="formula-format">Formula format: </label>
					<select
						id="formula-format"
						value={formulaFormat}
						onChange={e => {
							setFormulaFormat(e.target.value as Mode);
							render(e.target.value as Mode);
						}}
					>
						<option value="formula-math">MathML</option>
						<option value="formula-text">Text</option>
						<option value="formula-latex">LaTeX</option>
					</select>
				</div>
			);
			break;

		case 'english':
			modeSettings = <div />;
			break;

		case 'gf1':
		case 'gf2':
			modeSettings = <div />;
			break;

		case 'tokens':
			modeSettings = <div />;
			break;

		case 'help':
			modeSettings = <div />;
			break;
	}

	return (
		<div className="px-4 py-2 flex gap-2">
			<textarea
				rows={3}
				value={text}
				spellCheck={false}
				placeholder={'Kuq súq sá kuna doa'}
				onChange={e => {
					setText(e.target.value);
					props.dismissExplanation();
				}}
				onKeyDown={e => {
					if (e.ctrlKey && e.key === 'Enter') {
						e.preventDefault();
						render(lastMode);
					}
				}}
			/>
			<div className="flex flex-col gap-1">
				<div className="flex gap-1">
					<Button
						icon={<TreeIcon />}
						onClick={() => render(raw ? 'raw-tree' : 'syntax-tree')}
					>
						{raw ? '*Tree' : 'Tree'}
					</Button>
					<Button
						icon={<DenotedIcon />}
						onClick={() => render('semantics-tree')}
					>
						Denoted
					</Button>
					<Button
						icon={<TextIcon title="Formula" text="λ()" />}
						onClick={() => render(formulaFormat)}
					>
						Formula
					</Button>
				</div>
				<div className="flex gap-1">
					<Button icon={<TokensIcon />} onClick={() => render('tokens')}>
						Tokens
					</Button>
					<Button icon={<GlossIcon />} onClick={() => render('gloss')}>
						Gloss
					</Button>
					<Button icon={<BoxesIcon />} onClick={() => render(boxesFormat)}>
						Boxes
					</Button>
				</div>
			</div>
			<div className="mode-settings">{modeSettings}</div>
		</div>
	);
}
