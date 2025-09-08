import { type FC, useMemo, useState } from 'react';
import useMeasure from 'react-use-measure';
import { keyFor } from '../../core/misc';
import { toJsx } from '../../semantics/render';
import { SiteleqType } from '../../semantics/render/siteleq';
import { type CompositionMode, modeToString } from '../../semantics/types';
import type { PlacedTree } from '../../tree/place';
import type { RichSceneLabel } from '../../tree/scene';
import { TreeLabel } from './TreeLabel';

const CompositionStepsSlider: FC<{ mode: CompositionMode }> = ({ mode }) => {
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
		return <div className="italic text-neutral-500">No composition steps</div>;
	}

	const step = steps[stepIndex] ?? steps[0];
	const lastModeString = modeToString(steps[steps.length - 1]);
	const modeString = modeToString(step);

	const [ref, bounds] = useMeasure();
	const [leftRef, leftBounds] = useMeasure();
	const [rightRef, rightBounds] = useMeasure();
	const [outRef, outBounds] = useMeasure();

	const leftPoint = leftBounds.left - bounds.left + leftBounds.width / 2;
	const rightPoint = rightBounds.left - bounds.left + rightBounds.width / 2;
	const midPoint = (leftPoint + rightPoint) / 2;
	const outOffset = midPoint - outBounds.width / 2;

	return (
		<div className="flex flex-col items-start w-fit" ref={ref}>
			<div
				className="flex flex-col items-center relative"
				ref={outRef}
				style={{
					left: Math.max(0, outOffset),
				}}
			>
				<div className="py-1 px-3 bg-neutral-100 dark:bg-slate-800 w-fit rounded">
					<SiteleqType t={step.out} />
				</div>
				<div className="mt-2">
					<span className="opacity-10">
						{lastModeString.slice(0, lastModeString.length - modeString.length)}
					</span>
					{modeString}
				</div>
			</div>
			<svg
				className="mb-2 relative"
				style={{ left: Math.max(0, -outOffset) }}
				height={30}
				role="presentation"
			>
				<path
					d={`M ${leftPoint} 30 L ${midPoint} 0 L ${rightPoint} 30`}
					stroke="currentColor"
					fill="transparent"
				/>
			</svg>
			<div
				className="flex gap-4 relative"
				style={{ left: Math.max(0, -outOffset) }}
			>
				<div
					className="flex items-center py-1 px-3 bg-neutral-100 dark:bg-slate-800 rounded"
					ref={leftRef}
				>
					<SiteleqType t={step.left} />
				</div>
				<div
					className="flex items-center py-1 px-3 bg-neutral-100 dark:bg-slate-800 rounded"
					ref={rightRef}
				>
					<SiteleqType t={step.right} />
				</div>
			</div>
			<div className="flex flex-col w-full mt-6">
				<span className="text-sm text-neutral-500 dark:text-slate-400 dark">
					Composition step {stepIndex + 1} / {steps.length}
				</span>
				<input
					type="range"
					min={0}
					max={steps.length - 1}
					value={stepIndex}
					onChange={e => setStepIndex(Number(e.target.value))}
					className="w-48"
				/>
			</div>
		</div>
	);
};

type Ctx = { measureText: (text: string, font: string) => { width: number } };

export function InspectNode(props: {
	tree: PlacedTree<Ctx>;
	breadcrumbs: (string | RichSceneLabel)[];
}) {
	const { tree, breadcrumbs } = props;

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
			<p className="mt-2 py-2 px-4 text-lg bg-neutral-100 dark:bg-slate-800 w-fit rounded">
				<span className="color-word">{tree.source}</span>
			</p>
			{tree.denotation?.denotation && (
				<>
					{'mode' in tree && tree.mode ? (
						<>
							<h3 className="text-lg mt-4 mb-2 font-bold">Types</h3>
							<CompositionStepsSlider key={keyFor(tree)} mode={tree.mode} />
						</>
					) : (
						<>
							<h3 className="text-lg mt-4 mb-2 font-bold">Type</h3>
							<div className="mt-2 py-1 px-3 bg-neutral-100 dark:bg-slate-800 w-fit rounded">
								<SiteleqType t={tree.denotation.denotation.type} />
							</div>
						</>
					)}

					<h3 className="text-lg mt-4 mb-2 font-bold">Denotation</h3>
					<div className="mt-2 py-1 px-3 bg-neutral-100 dark:bg-slate-800 w-fit rounded">
						{toJsx(tree.denotation.denotation)}
					</div>
				</>
			)}
		</div>
	);
}
