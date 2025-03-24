import { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import { keyFor } from '../../core/misc';
import { toJsx } from '../../semantics/render';
import type { Expr } from '../../semantics/types';
import type { MovementID } from '../../tree';
import {
	type PlacedTree,
	TreePlacer,
	boundingRect,
	movementPoints,
} from '../../tree/place';
import {
	type RichSceneLabel,
	type RichSceneLabelPiece,
	type Scene,
	SceneTextStyle,
	type Unplaced,
	sceneLabelToString,
} from '../../tree/scene';
import type { Theme } from '../../tree/theme';
import './TreeBrowser.css';

interface TreeBrowserOptions {
	theme: Theme;
	layerHeight: number;
	compactDenotations: boolean;
	truncateLabels: string[];
}

function TreeLabelPiece({ piece }: { piece: RichSceneLabelPiece }) {
	const style = {
		font: piece.font,
		whiteSpace: 'pre',
	};

	return piece.subscript ? (
		<sub style={style}>{piece.text}</sub>
	) : (
		<span style={style}>{piece.text}</span>
	);
}

function TreeLabel(props: { label: string | RichSceneLabel }) {
	if (typeof props.label === 'string') {
		return props.label;
	}
	return (
		<div>
			{props.label.lines.map((line, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: Layers of label
				<div key={i}>
					{line.pieces.map((piece, j) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Pieces of label
						<TreeLabelPiece key={j} piece={piece} />
					))}
				</div>
			))}
		</div>
	);
}
export function Node(props: {
	tree: PlacedTree<Ctx>;
	expanded: boolean;
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
						className="tree-word"
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
					<div className="tree-gloss">{tree.gloss}</div>
				) : undefined}
			</div>
			{tree.denotation?.denotation && (
				<Tooltip
					anchorSelect={`#node-${key}`}
					clickable
					place="top"
					delayHide={0}
					delayShow={0}
					style={{
						background: options.theme.tipBackgroundColor,
						color: options.theme.tipTextColor,
						textAlign: 'center',
						transition: 'opacity 70ms',
						fontSize: '14px',
						zIndex: 5,
					}}
					opacity="1"
				>
					{toJsx(tree.denotation.denotation)}
				</Tooltip>
			)}
		</div>
	);
}

export function Subtree(props: {
	tree: PlacedTree<Ctx>;
	left: number;
	top: number;
	lineDx?: number;
	options: TreeBrowserOptions;
}) {
	const shouldTruncate = props.options.truncateLabels.some(x =>
		sceneLabelToString(props.tree.label).startsWith(`${x} `),
	);
	const [expanded, setExpanded] = useState(!shouldTruncate);

	const { tree, options } = props;
	const children = tree.children;
	const dist = tree.placement.distanceBetweenChildren;

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
					}}
				/>
			)}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: No keyboard controls */}
			<div
				style={{
					position: 'absolute',
					left: props.left,
					top: props.top,
				}}
				onClick={() => setExpanded(!expanded)}
			>
				<Node tree={tree} expanded={expanded} options={options} />
			</div>
			{expanded ? (
				children.map((child, i) => (
					<Subtree
						left={
							props.left +
							tree.placement.width / 2 +
							((1 - children.length) / 2 + i) * dist -
							child.placement.width / 2
						}
						top={props.top + props.options.layerHeight}
						lineDx={((1 - children.length) / 2 + i) * dist}
						tree={child}
						key={keyFor(child)}
						options={options}
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

type Ctx = { measureText: (text: string, font: string) => { width: number } };

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
}) {
	const { scene, compactDenotations, theme, truncateLabels } = props;

	const canvas = document.createElement('canvas');
	const canvasCtx = canvas.getContext('2d');
	if (!canvasCtx) throw new Error('Could not make canvas context');
	const ctx: Ctx = {
		measureText(text: string, font?: string) {
			canvasCtx.font = font ?? '14px Fira Sans';
			return canvasCtx.measureText(text);
		},
	};

	const denotationRenderer = (denotation: D) => ({
		draw: async () => {},
		width: () => 0,
		height: () => 0,
		source: '',
		denotation:
			typeof denotation === 'string' ? undefined : (denotation as Expr),
	});

	const placer = new TreePlacer<Ctx, D>(ctx, denotationRenderer, { theme });
	const placed = placer.placeScene(scene);
	const layerHeight =
		typeof scene.root.label === 'string' || scene.root.label.lines.length === 1
			? 50
			: 70;
	const rect = boundingRect(placed);
	const points = movementPoints(placed);
	const x0 = -rect.left;

	return (
		<div style={{ background: theme.backgroundColor }}>
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
					options={{ compactDenotations, theme, truncateLabels, layerHeight }}
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
