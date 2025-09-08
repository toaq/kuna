import { useState } from 'react';
import { keyFor } from '../../core/misc';
import { type Expr, modeToString } from '../../semantics/types';
import type { MovementID } from '../../tree';
import {
	type PlacedTree,
	TreePlacer,
	boundingRect,
	movementPoints,
} from '../../tree/place';
import {
	type RichSceneLabel,
	type Scene,
	SceneTextStyle,
	type Unplaced,
	sceneLabelToString,
} from '../../tree/scene';
import type { Theme } from '../../tree/theme';
import './TreeBrowser.css';
import { useContext } from 'react';
import { InspectContext } from '../inspect';
import { InspectNode } from './InspectNode';
import { TreeLabel } from './TreeLabel';

interface TreeBrowserOptions {
	theme: Theme;
	layerHeight: number;
	compactDenotations: boolean;
	truncateLabels: string[];
	skew: number;
	interactive: boolean;
	grayOut: boolean;
}

export function Node(props: {
	tree: PlacedTree<Ctx>;
	expanded: boolean;
	breadcrumbs: (string | RichSceneLabel)[];
	options: TreeBrowserOptions;
}) {
	const { tree, options } = props;
	const key = keyFor(tree);
	const color =
		tree.textStyle === SceneTextStyle.Trace
			? options.theme.traceColor
			: tree.textStyle === SceneTextStyle.MovedHere
				? options.theme.movedWordColor
				: options.theme.wordColor;

	return (
		<div className="tree-node">
			<div className="tree-node-contents" id={`node-${key}`}>
				<div className="tree-label">
					<TreeLabel label={tree.label} />
				</div>
				{tree.text && (
					<div
						className="tree-word  -mb-1"
						style={{
							color,
							textDecoration:
								tree.textStyle === SceneTextStyle.Trace
									? 'line-through'
									: undefined,
						}}
					>
						{tree.text}
					</div>
				)}
				{tree.text && tree.gloss ? (
					<div className="tree-gloss text-xs">{tree.gloss}</div>
				) : undefined}
			</div>
		</div>
	);
}

export function Subtree(props: {
	tree: PlacedTree<Ctx>;
	left: number;
	top: number;
	lineDx?: number;
	options: TreeBrowserOptions;
	path: string;
	breadcrumbs: (string | RichSceneLabel)[];
}) {
	const shouldTruncate = props.options.truncateLabels.some(x =>
		sceneLabelToString(props.tree.label).startsWith(`${x} `),
	);
	const [expanded, setExpanded] = useState(!shouldTruncate);
	const { inspecteePath, setInspecteePath, setInspectee } =
		useContext(InspectContext);
	const { tree, options, breadcrumbs } = props;
	const children = tree.children;
	const childrenDx = tree.placement.childrenDx;
	const lit =
		!options.grayOut || !inspecteePath || props.path.startsWith(inspecteePath);

	return (
		<>
			{props.lineDx !== undefined && (
				<div
					className="tree-line"
					style={{
						left: props.left + tree.placement.width / 2,
						top: props.top - 3,

						pointerEvents: 'none',
						position: 'absolute',
						background: options.theme.textColor,
						width: 1,
						height: Math.hypot(30, props.lineDx) + 1,
						transformOrigin: '0.5px 0.5px',
						transform: `rotate(${Math.atan2(props.lineDx, -30)}rad)`,
						opacity: lit && props.path !== inspecteePath ? 1 : 0.4,
					}}
				/>
			)}
			{props.tree.mode && (
				<div
					style={{
						pointerEvents: 'none',
						position: 'absolute',
						left: props.left + tree.placement.width / 2 - 3,
						top: props.top + 40,
						opacity: lit ? 1 : 0.4,
					}}
				>
					{modeToString(props.tree.mode).at(-1) ?? ' '}
				</div>
			)}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: No keyboard controls */}
			<div
				style={{
					position: 'absolute',
					left: props.left,
					top: props.top,
					opacity: lit ? 1 : 0.4,
				}}
				onClick={
					!options.interactive
						? undefined
						: e => {
								e.preventDefault();
								e.stopPropagation();
								if (inspecteePath === props.path) {
									setInspecteePath(undefined);
									setInspectee(undefined);
								} else {
									setInspecteePath(props.path);
									setInspectee(
										<InspectNode tree={tree} breadcrumbs={breadcrumbs} />,
									);
								}
							}
				}
			>
				<Node
					tree={tree}
					breadcrumbs={breadcrumbs}
					expanded={expanded}
					options={options}
				/>
			</div>
			{expanded ? (
				children.map((child, i) => (
					<Subtree
						left={
							props.left +
							tree.placement.width / 2 +
							childrenDx[i] -
							child.placement.width / 2
						}
						top={props.top + props.options.layerHeight}
						lineDx={childrenDx[i]}
						tree={child}
						key={keyFor(child)}
						options={options}
						path={`${props.path}-${i}`}
						breadcrumbs={[...breadcrumbs, tree.categoryLabel]}
					/>
				))
			) : children.length ? (
				// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
				<div
					className="tree-roof"
					style={{
						position: 'absolute',
						left: props.left,
						top: props.top + 30,
						minWidth: tree.placement.width,
					}}
					onClick={() => setExpanded(!expanded)}
				>
					<div
						className="tree-word"
						style={{ color: options.theme.wordColor, textAlign: 'center' }}
					>
						{tree.source}
					</div>
				</div>
			) : undefined}
		</>
	);
}

export type Ctx = {
	measureText: (text: string, font: string) => { width: number };
};

function Arrows<D>(props: {
	theme: Theme;
	scene: Scene<D, undefined>;
	points: Map<MovementID, { x: number; width: number; layer: number }>;
	rect: { left: number; right: number; layers: number };
	layerHeight: number;
}) {
	const { rect, layerHeight, scene, points, theme } = props;
	const x0 = -rect.left;

	return (
		<svg
			width={rect.right - rect.left}
			height={rect.layers * layerHeight}
			style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}
		>
			<title>Movement arrows</title>
			{scene.arrows.flatMap(a => {
				const source = points.get(a.from);
				const target = points.get(a.to);
				if (!source || !target) return undefined;
				const x1 = x0 + source.x;
				const y1 = source.layer * layerHeight + 35;
				const x2 = x0 + target.x;
				const y2 = target.layer * layerHeight + 40;
				const tip = 5;

				return [
					<path
						stroke={theme.movedWordColor}
						fill="none"
						key={`${a.from}_${a.to}`}
						d={`M${x1} ${y1} C${(x1 + x2) / 2} ${y1 + 25}, ${x2} ${y2 + 50}, ${x2} ${y2}`}
					/>,
					<path
						stroke={theme.movedWordColor}
						fill="none"
						key={`${a.from}_${a.to}_tip`}
						d={`M${x2 - tip} ${y2 + tip} L${x2} ${y2} l${tip} ${tip}`}
					/>,
				];
			})}
		</svg>
	);
}

export function TreeBrowser<D extends Expr | string>(props: {
	scene: Scene<D, Unplaced>;
	compactDenotations: boolean;
	theme: Theme;
	truncateLabels: string[];
	skew?: number;
	interactive?: boolean;
	grayOut?: boolean;
}) {
	const { scene, compactDenotations, theme, truncateLabels } = props;

	const canvas = document.createElement('canvas');
	const canvasCtx = canvas.getContext('2d');
	if (!canvasCtx) throw new Error('Could not make canvas context');
	const ctx: Ctx = {
		measureText(text: string, font?: string) {
			canvasCtx.font = font
				? font.replace(/([0-9.]+)em/, (_, u) => `${+u * 14}px`)
				: '14px Fira Sans';
			return canvasCtx.measureText(text);
		},
	};

	const denotationRenderer = (_denotation: any) => ({
		draw: async () => {},
		width: () => 0,
		height: () => 0,
		source: '',
		denotation:
			typeof _denotation === 'string' ? undefined : (_denotation as Expr),
	});

	const placer = new TreePlacer<Ctx, D>(ctx, denotationRenderer, { theme });
	const skew = props.skew ?? 0.22;
	const placed = placer.placeScene(scene, skew);
	const layerHeight =
		typeof scene.root.label === 'string' || scene.root.label.lines.length === 1
			? 60
			: 70;
	const rect = boundingRect(placed);
	const points = movementPoints(placed);
	const x0 = -rect.left;

	return (
		<div>
			<div
				style={{
					width: rect.right - rect.left,
					height: rect.layers * layerHeight,
					margin: '20px 30px',
					position: 'relative',
				}}
			>
				<Subtree
					left={x0 - placed.placement.width / 2}
					top={0}
					tree={placed}
					options={{
						compactDenotations,
						theme,
						truncateLabels,
						layerHeight,
						skew,
						interactive: props.interactive ?? true,
						grayOut: props.grayOut ?? true,
					}}
					path="root"
					breadcrumbs={[]}
				/>
				<Arrows
					theme={theme}
					scene={scene}
					points={points}
					rect={rect}
					layerHeight={layerHeight}
				/>
			</div>
		</div>
	);
}
