import { useMemo, useState } from 'react';
import { keyFor } from '../../core/misc';
import { toJsx, typeToPlainText } from '../../semantics/render';
import { SiteleqType } from '../../semantics/render/siteleq';
import { type CompositionMode, modeToString } from '../../semantics/types';
import type { PlacedTree } from '../../tree/place';
import {
	type RichSceneLabel,
	type Scene,
	type SceneNode,
	SceneTextStyle,
	type Unplaced,
} from '../../tree/scene';
import type { Theme } from '../../tree/theme';
import { TreeBrowser } from './TreeBrowser';
import { TreeLabel } from './TreeLabel';

// Helper function to create a Scene containing all three types arranged as a tree
function createCompositionScene(
	leftType: any,
	rightType: any,
	outType: any,
): Scene<any, Unplaced> {
	const leftText = typeToPlainText(leftType);
	const rightText = typeToPlainText(rightType);
	const outText = typeToPlainText(outType);
	const makeNode = (label: string, children: SceneNode<any, Unplaced>[]) => {
		return {
			label,
			categoryLabel: label,
			fullCategoryLabel: label,
			denotation: undefined,
			mode: undefined,
			roof: false,
			text: undefined,
			textStyle: SceneTextStyle.Plain,
			gloss: undefined,
			children,
			source: label,
			id: undefined,
			placement: undefined,
		};
	};

	const leftNode: SceneNode<any, Unplaced> = makeNode(leftText, []);
	const rightNode: SceneNode<any, Unplaced> = makeNode(rightText, []);
	const rootNode: SceneNode<any, Unplaced> = makeNode(outText, [
		leftNode,
		rightNode,
	]);

	return { root: rootNode, arrows: [] };
}

export function CompositionStepsSlider({
	mode,
	theme,
}: {
	mode: CompositionMode;
	theme: Theme;
}) {
	const steps = useMemo(() => {
		const steps: CompositionMode[] = [];
		let m = mode;
		while ('from' in m) {
			steps.push(m);
			m = m.from;
		}
		steps.push(m);
		steps.reverse();
		return steps;
	}, [mode]);
	const [stepIndex, setStepIndex] = useState(steps.length - 1);

	if (!steps || steps.length === 0) {
		return <div className="italic text-slate-500">No composition steps</div>;
	}

	const step = steps[stepIndex] ?? steps[0];
	const lastModeString = modeToString(steps[steps.length - 1]);
	const modeString = modeToString(step);

	const compositionScene = createCompositionScene(
		step.left,
		step.right,
		step.out,
	);

	return (
		<div className="flex flex-col items-start gap-2 w-fit">
			<div className="flex flex-row items-center gap-2 w-full">
				<input
					type="range"
					min={0}
					max={steps.length - 1}
					value={stepIndex}
					onChange={e => setStepIndex(Number(e.target.value))}
					className="w-48"
				/>
				<span className="text-sm text-slate-500">
					Step {stepIndex + 1} / {steps.length}
				</span>
			</div>

			<div className="text-center">
				<span className="opacity-10">
					{lastModeString.slice(0, lastModeString.length - modeString.length)}
				</span>
				{modeString}
			</div>

			{/* Type visualization */}
			<div className="mt-4">
				<div className="border border-slate-300 dark:border-slate-600 rounded p-2">
					<TreeBrowser
						scene={compositionScene}
						compactDenotations={false}
						theme={theme}
						truncateLabels={[]}
						skew={0}
						interactive={false}
						grayOut={false}
					/>
				</div>
			</div>
		</div>
	);
}

type Ctx = { measureText: (text: string, font: string) => { width: number } };

export function InspectNode(props: {
	tree: PlacedTree<Ctx>;
	breadcrumbs: (string | RichSceneLabel)[];
	theme: Theme;
}) {
	const { tree, breadcrumbs, theme } = props;

	return (
		<div className="mt-8 mb-16 w-fit">
			<h2 className="text-2xl my-2 font-bold">
				{tree.fullCategoryLabel ?? <TreeLabel label={tree.categoryLabel} />}
			</h2>
			<div style={{ display: 'inline-flex' }}>
				<div style={{ display: 'inline-flex', opacity: 0.4 }}>
					{breadcrumbs.flatMap((crumb, i) => [
						// biome-ignore lint/suspicious/noArrayIndexKey: static data
						<span key={i}>
							<TreeLabel label={crumb} forceNormalWeight={true} />
						</span>,
						'\xa0>\xa0',
					])}
				</div>
				<TreeLabel label={tree.categoryLabel} forceNormalWeight={true} />
			</div>
			<p className="mt-2 py-2 px-4 text-lg bg-slate-100 dark:bg-slate-800 w-fit rounded">
				<span className="color-word">{tree.source}</span>
			</p>
			{tree.denotation?.denotation && (
				<>
					<h3 className="text-lg mt-4 mb-2 font-bold">Type</h3>
					<div className="mt-2 py-1 px-3 bg-slate-100 dark:bg-slate-800 w-fit rounded">
						<SiteleqType t={tree.denotation.denotation.type} />
					</div>

					{'mode' in tree && tree.mode && (
						<>
							<h3 className="text-lg mt-4 mb-2 font-bold">Composition mode</h3>
							<div className="mt-2 py-1 px-3 bg-slate-100 dark:bg-slate-800 w-fit rounded">
								{modeToString(tree.mode)}
							</div>
							<h3 className="text-lg mt-4 mb-2 font-bold">Composition steps</h3>
							<CompositionStepsSlider
								key={keyFor(tree)}
								mode={tree.mode}
								theme={theme}
							/>
						</>
					)}

					<h3 className="text-lg mt-4 mb-2 font-bold">Denotation</h3>
					<div className="mt-2 py-1 px-3 bg-slate-100 dark:bg-slate-800 w-fit rounded">
						{toJsx(tree.denotation.denotation)}
					</div>
				</>
			)}
		</div>
	);
}
