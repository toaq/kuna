import { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import { keyFor } from '../../core/misc';
import { toJsx } from '../../semantics/render';
import type { DTree, Expr } from '../../semantics/types';
import type { Tree } from '../../tree';
import { type PlacedTree, TreePlacer, boundingRect } from '../../tree/place';
import {
	type RichSceneLabel,
	type RichSceneLabelPiece,
	sceneLabelToString,
	toScene,
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

	return (
		<div className="tree-node">
			<div className="tree-node-contents" id={`node-${key}`}>
				<div className="tree-label">
					<TreeLabel label={tree.label} />
				</div>
				{tree.text && (
					<div className="tree-word" style={{ color: options.theme.wordColor }}>
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

export function TreeBrowser(props: {
	tree: Tree | DTree;
	compactDenotations: boolean;
	theme: Theme;
	truncateLabels: string[];
}) {
	const { tree, compactDenotations, theme, truncateLabels } = props;

	const canvas = document.createElement('canvas');
	const canvasCtx = canvas.getContext('2d');
	if (!canvasCtx) throw new Error('Could not make canvas context');
	const ctx: Ctx = {
		measureText(text: string, font?: string) {
			canvasCtx.font = font ?? '14px Fira Sans';
			return canvasCtx.measureText(text);
		},
	};

	const denotationRenderer = (expr: Expr) => ({
		draw: async () => {},
		width: () => 0,
		height: () => 0,
		source: '',
		denotation: expr,
	});
	const placer = new TreePlacer(ctx, denotationRenderer, { theme });
	const scene = toScene(tree, false, truncateLabels);
	const placed = placer.placeScene(scene);
	const layerHeight = 'denotation' in tree ? 70 : 50;
	const rect = boundingRect(placed);
	console.log(placed);

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
					left={-rect.left - placed.placement.width / 2}
					top={0}
					tree={placed}
					options={{ compactDenotations, theme, truncateLabels, layerHeight }}
				/>
			</div>
		</div>
	);
}
