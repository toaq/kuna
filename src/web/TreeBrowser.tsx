import { useState } from 'react';
import { DTree } from '../semantics/model';
import { Tree } from '../tree';
import { PlacedTree, TreePlacer, get_mathjax_svg } from '../tree/place';
import { toLatex } from '../semantics/render';
import './TreeBrowser.css';
import { MathJax } from 'better-react-mathjax';
import { CompactExpr, compact } from '../semantics/compact';
import { Theme } from '../tree/theme';

export function Denotation(props: {
	denotation: CompactExpr;
	compact: boolean;
	theme: Theme;
}) {
	const expr = props.compact ? compact(props.denotation) : props.denotation;
	return (
		<MathJax
			className="tree-formula"
			hideUntilTypeset="every"
			style={{ color: props.theme.denotationColor }}
		>
			{'$$\\LARGE ' + toLatex(expr) + '$$'}
		</MathJax>
	);
}

export function Node(props: {
	tree: PlacedTree<Ctx>;
	expanded: boolean;
	compactDenotations: boolean;
	theme: Theme;
}) {
	const { tree, compactDenotations, theme } = props;
	return (
		<div className="tree-node">
			<div className="tree-node-contents">
				<div className="tree-label">{tree.label}</div>
				{'denotation' in tree && tree.denotation && (
					<Denotation
						denotation={tree.denotation.denotation}
						compact={compactDenotations}
						theme={theme}
					/>
				)}
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
	);
}

type Ctx = { measureText: (text: string) => { width: number } };

export function Subtree(props: {
	tree: PlacedTree<Ctx>;
	width: number;
	compactDenotations: boolean;
	theme: Theme;
	lineDx?: number;
}) {
	const [expanded, setExpanded] = useState(false);

	const { tree, width, compactDenotations, theme } = props;
	const children = 'children' in tree ? tree.children : [];
	const d = 'children' in tree ? tree.distanceBetweenChildren : 0;

	return (
		<div
			className="tree-subtree"
			style={{ minWidth: width, maxWidth: width, position: 'relative' }}
		>
			{props.lineDx && (
				<div
					className="tree-line"
					style={{
						position: 'absolute',
						background: theme.textColor,
						width: 1,
						height: Math.hypot(20, props.lineDx) + 1,
						transformOrigin: '0.5px 0.5px',
						transform: `rotate(${Math.atan2(props.lineDx, -20)}rad)`,
					}}
				></div>
			)}
			<div style={{ cursor: 'pointer' }} onClick={() => setExpanded(false)}>
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
							key={c.label + i}
							compactDenotations={compactDenotations}
							theme={theme}
						/>
					))}
				</div>
			) : children.length ? (
				<div className="tree-roof" onClick={() => setExpanded(true)}>
					<svg
						height="8"
						width="100%"
						preserveAspectRatio="none"
						viewBox="0 0 50 10"
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
}) {
	const { tree, compactDenotations, theme } = props;
	const canvas = document.createElement('canvas');
	const canvasCtx = canvas.getContext('2d');
	const ctx: Ctx = {
		measureText(text: string) {
			return canvasCtx!.measureText(text);
		},
	};

	const denotationRenderer = (denotation: CompactExpr, theme: Theme) => ({
		draw: async () => {},
		width: (ctx: Ctx) =>
			Number(
				get_mathjax_svg(
					toLatex(compactDenotations ? compact(denotation) : denotation),
				).width.replace(/ex$/, ''),
			) * 6,
		height: (ctx: Ctx) => 1,
		denotation,
	});
	const placer = new TreePlacer(ctx, theme, denotationRenderer);
	const placed = placer.placeTree(tree);
	return (
		<Subtree
			width={placed.width}
			tree={placed}
			compactDenotations={compactDenotations}
			theme={theme}
		/>
	);
}
