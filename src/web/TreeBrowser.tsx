import { useState } from 'react';
import { DTree, Expr } from '../semantics/model';
import { Tree, treeText } from '../tree';
import { TreePlacer, getLabel } from '../tree/place';
import { toLatex } from '../semantics/render';
import './TreeBrowser.css';
import { MathJax } from 'better-react-mathjax';
import { CompactExpr, compact } from '../semantics/compact';
import { Theme } from '../tree/theme';

export function Denotation(props: {
	denotation: Expr;
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
	tree: Tree | DTree;
	expanded: boolean;
	compactDenotations: boolean;
	theme: Theme;
}) {
	const { tree, compactDenotations, theme } = props;
	return (
		<div className="tree-node">
			<div className="tree-node-contents">
				<div className="tree-label">{getLabel(tree)}</div>
				{'denotation' in tree && tree.denotation && (
					<Denotation
						denotation={tree.denotation}
						compact={compactDenotations}
						theme={theme}
					/>
				)}
				{'word' in tree && (
					<>
						<div className="tree-word" style={{ color: theme.wordColor }}>
							{tree.word.covert ? tree.word.value : tree.word.text}
						</div>
						{tree.word.covert ? undefined : (
							<div className="tree-gloss">{tree.word.entry?.gloss}</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}

type Ctx = { measureText: (text: string) => { width: number } };

export function TreeBrowser(props: {
	tree: Tree | DTree;
	compactDenotations: boolean;
	theme: Theme;
}) {
	const { tree, compactDenotations, theme } = props;
	const children =
		'left' in tree
			? [tree.left, tree.right]
			: 'children' in tree
			? tree.children
			: [];
	const [expanded, setExpanded] = useState(false);

	const ctx: Ctx = {
		measureText(text: string) {
			return { width: 50 };
		},
	};

	const denotationRenderer = (denotation: CompactExpr, theme: Theme) => ({
		draw: async (
			ctx: Ctx,
			centerX: number,
			bottomY: number,
			color: string,
		) => {},
		width: (ctx: Ctx) => 50,
		height: (ctx: Ctx) => 20,
	});
	const placed = new TreePlacer(ctx, theme, denotationRenderer);

	return (
		<div className="tree-stack">
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
						<TreeBrowser
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
					<div className="tree-word">{treeText(tree) || '(expand)'}</div>
				</div>
			) : undefined}
		</div>
	);
}
