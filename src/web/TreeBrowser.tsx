import { useState } from 'react';
import type { DTree, Expr } from '../semantics/model';
import { toMathml } from '../semantics/render';
import type { Tree } from '../tree';
import { type PlacedTree, TreePlacer, boundingRect } from '../tree/place';
import './TreeBrowser.css';
import { Tooltip } from 'react-tooltip';
import { keyFor } from '../core/misc';
import type { Theme } from '../tree/theme';

export function Node(props: {
	tree: PlacedTree<Ctx>;
	expanded: boolean;
	compactDenotations: boolean;
	theme: Theme;
}) {
	const { tree, compactDenotations, theme } = props;
	const mathml = `<pre style="color:${theme.wordColor};font-family:inherit; margin: 0">${tree.source.trim() || '∅'}</pre>${
		'denotation' in tree && tree.denotation
			? `<hr style="border:1px solid #8884";/><div style="margin-top:0.5em">${toMathml(tree.denotation.denotation, compactDenotations)}</div>`
			: ''
	}`;
	return (
		<>
			<div className="tree-node">
				<div
					className="tree-node-contents"
					data-tooltip-id="denotation"
					data-tooltip-html={mathml}
				>
					<div className="tree-label">{tree.label}</div>
					{'word' in tree && (
						<>
							<div className="tree-word" style={{ color: theme.wordColor }}>
								{tree.word}
							</div>
							{tree.word && tree.gloss ? (
								<div className="tree-gloss">{tree.gloss}</div>
							) : undefined}
						</>
					)}
				</div>
			</div>
		</>
	);
}

type Ctx = { measureText: (text: string) => { width: number } };

export function Subtree(props: {
	tree: PlacedTree<Ctx>;
	width: number | string;
	compactDenotations: boolean;
	theme: Theme;
	truncateLabels: string[];
	lineDx?: number;
}) {
	const shouldTruncate = props.truncateLabels.some(x =>
		props.tree.label.startsWith(`${x} `),
	);
	const [expanded] = useState(!shouldTruncate);

	const { tree, width, compactDenotations, theme, truncateLabels } = props;
	const children = 'children' in tree ? tree.children : [];
	const d = 'children' in tree ? tree.distanceBetweenChildren : 0;

	return (
		<div
			className="tree-subtree"
			style={{
				width: width,
				position: 'absolute',
				left: `${props.lineDx}px`,
			}}
		>
			{props.lineDx !== undefined && (
				<div
					className="tree-line"
					style={{
						pointerEvents: 'none',
						position: 'absolute',
						background: theme.textColor,
						width: 1,
						height: Math.hypot(20, props.lineDx) + 1,
						transformOrigin: '0.5px 0.5px',
						transform: `rotate(${Math.atan2(props.lineDx, -20)}rad)`,
					}}
				/>
			)}
			<div>
				<Node
					tree={tree}
					expanded={expanded}
					compactDenotations={compactDenotations}
					theme={theme}
				/>
			</div>
			{expanded ? (
				<div className="tree-children">
					{children.map((c, i) => (
						<Subtree
							lineDx={((1 - children.length) / 2 + i) * d}
							width={d}
							tree={c}
							key={keyFor(c)}
							compactDenotations={compactDenotations}
							theme={theme}
							truncateLabels={truncateLabels}
						/>
					))}
				</div>
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
		</div>
	);
}

export function TreeBrowser(props: {
	tree: Tree | DTree;
	compactDenotations: boolean;
	theme: Theme;
	truncateLabels: string[];
}) {
	const { tree, compactDenotations, theme, truncateLabels } = props;
	const canvas = document.createElement('canvas');
	const canvasCtx = canvas.getContext('2d');
	const ctx: Ctx = {
		measureText(text: string) {
			return canvasCtx!.measureText(text);
		},
	};

	const denotationRenderer = (denotation: Expr) => {
		return {
			draw: async () => {},
			width: () => 0,
			height: () => 0,
			denotation,
		};
	};
	const placer = new TreePlacer(ctx, denotationRenderer, { theme });
	const placed = placer.placeTree(tree);
	const rect = boundingRect(placed);
	return (
		<div
			style={{
				background: theme.backgroundColor,
				width: rect.right - rect.left + 80,
				height: rect.layers * 40 + 80,
				padding: '40px',
				position: 'relative',
			}}
		>
			<div
				style={{
					transform: `translateX(${-rect.left}px)`,
				}}
			>
				<Subtree
					width={`${rect.right - rect.left}px`}
					tree={placed}
					compactDenotations={compactDenotations}
					theme={theme}
					truncateLabels={truncateLabels}
				/>
			</div>

			<Tooltip
				id="denotation"
				delayHide={0}
				delayShow={0}
				style={{
					background: theme.tipBackgroundColor,
					color: theme.textColor,
					textAlign: 'center',
					transition: 'none',
				}}
				border={`1px solid ${theme.textColor}`}
				opacity="1"
			/>
		</div>
	);
}
