import { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import { keyFor } from '../../core/misc';
import type { DTree, Expr } from '../../semantics/model';
import { toJsx } from '../../semantics/render';
import type { Tree } from '../../tree';
import { type PlacedTree, TreePlacer, boundingRect } from '../../tree/place';
import { toScene } from '../../tree/scene';
import type { Theme } from '../../tree/theme';
import './TreeBrowser.css';

function TreeLabel(props: { label: string }) {
	const parts = props.label.split(' : ');

	return parts.length === 2 ? (
		<div className="tree-label">
			<strong>{parts[0]}</strong> : {parts[1]}
		</div>
	) : (
		<div className="tree-label">{props.label}</div>
	);
}

export function Node(props: {
	tree: PlacedTree<Ctx>;
	expanded: boolean;
	compactDenotations: boolean;
	theme: Theme;
}) {
	const { tree, theme } = props;
	const key = keyFor(tree);

	return (
		<>
			<div className="tree-node">
				<div className="tree-node-contents" id={`node-${key}`}>
					<TreeLabel label={tree.label} />
					{tree.text && (
						<div className="tree-word" style={{ color: theme.wordColor }}>
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
							background: theme.tipBackgroundColor,
							color: theme.tipTextColor,
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
		</>
	);
}

export function Subtree(props: {
	tree: PlacedTree<Ctx>;
	left: number;
	top: number;
	compactDenotations: boolean;
	theme: Theme;
	truncateLabels: string[];
	lineDx?: number;
}) {
	const shouldTruncate = props.truncateLabels.some(x =>
		props.tree.label.startsWith(`${x} `),
	);
	const [expanded] = useState(!shouldTruncate);

	const { tree, compactDenotations, theme, truncateLabels } = props;
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
						background: theme.textColor,
						width: 1,
						height: Math.hypot(30, props.lineDx) + 1,
						transformOrigin: '0.5px 0.5px',
						transform: `rotate(${Math.atan2(props.lineDx, -30)}rad)`,
					}}
				/>
			)}
			<div
				style={{
					position: 'absolute',
					left: props.left,
					top: props.top,
				}}
			>
				<Node
					tree={tree}
					expanded={expanded}
					compactDenotations={compactDenotations}
					theme={theme}
				/>
			</div>
			{expanded ? (
				<>
					{children.map((child, i) => (
						<Subtree
							left={
								props.left +
								tree.placement.width / 2 +
								((1 - children.length) / 2 + i) * dist -
								child.placement.width / 2
							}
							top={props.top + 70}
							lineDx={((1 - children.length) / 2 + i) * dist}
							tree={child}
							key={keyFor(child)}
							compactDenotations={compactDenotations}
							theme={theme}
							truncateLabels={truncateLabels}
						/>
					))}
				</>
			) : children.length ? (
				<div className="tree-roof">
					<svg
						height="8"
						width="100%"
						preserveAspectRatio="none"
						viewBox="0 0 50 10"
						role="img"
						aria-label="Roof"
					>
						<path d="M25 0 L50 8 L0 8 Z" fill="none" stroke={theme.textColor} />
					</svg>
					<div className="tree-word">{'(expand)'}</div>
				</div>
			) : undefined}
		</>
	);
}

type Ctx = { measureText: (text: string) => { width: number } };

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
	canvasCtx.font = '14px Fira Sans';
	const ctx: Ctx = {
		measureText(text: string) {
			const widest = Math.max(
				...text.split('\n').map(x => canvasCtx.measureText(x).width),
			);
			return { width: widest };
		},
	};

	const denotationRenderer = (expr: Expr) => {
		return {
			draw: async () => {},
			width: () => 0,
			height: () => 0,
			source: '',
			denotation: expr,
		};
	};
	const placer = new TreePlacer(ctx, denotationRenderer, {
		theme: theme,
	});
	const scene = toScene(tree, false, truncateLabels);
	const placed = placer.placeScene(scene);
	console.log(placed);
	const rect = boundingRect(placed);

	return (
		<div
			style={{
				background: theme.backgroundColor,
			}}
		>
			<div
				style={{
					width: rect.right - rect.left,
					height: rect.layers * 70,
					margin: '20px 30px',
					position: 'relative',
				}}
			>
				<Subtree
					left={-rect.left}
					top={0}
					tree={placed}
					compactDenotations={compactDenotations}
					theme={theme}
					truncateLabels={truncateLabels}
				/>
			</div>
		</div>
	);
}
