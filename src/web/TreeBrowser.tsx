import { useState } from 'react';
import { DTree, Expr } from '../semantics/model';
import { Tree, treeText } from '../tree';
import { getLabel } from '../tree/place';
import { toLatex } from '../semantics/render';
import './TreeBrowser.css';
import { MathJax } from 'better-react-mathjax';
import { compact } from '../semantics/compact';

export function Denotation(props: { denotation: Expr; compact: boolean }) {
	const expr = props.compact ? compact(props.denotation) : props.denotation;
	return (
		<MathJax className="tree-formula" hideUntilTypeset="every">
			{'$$\\LARGE ' + toLatex(expr) + '$$'}
		</MathJax>
	);
}

export function Node(props: {
	tree: Tree | DTree;
	expanded: boolean;
	compactDenotations: boolean;
}) {
	const { tree, expanded, compactDenotations } = props;
	return (
		<div className="tree-node">
			<div className="tree-label">{getLabel(tree)}</div>
			{'denotation' in tree && tree.denotation && (
				<Denotation denotation={tree.denotation} compact={compactDenotations} />
			)}
			{'word' in tree && (
				<>
					<div className="tree-word">
						{tree.word.covert ? tree.word.value : tree.word.text}
					</div>
					{tree.word.covert ? undefined : (
						<div className="tree-gloss">{tree.word.entry?.gloss}</div>
					)}
				</>
			)}
		</div>
	);
}

export function TreeBrowser(props: {
	tree: Tree | DTree;
	compactDenotations: boolean;
}) {
	const { tree, compactDenotations } = props;
	const children =
		'left' in tree
			? [tree.left, tree.right]
			: 'children' in tree
			? tree.children
			: [];
	const [expanded, setExpanded] = useState(false);
	return (
		<div className="tree-stack">
			<div style={{ cursor: 'pointer' }} onClick={() => setExpanded(false)}>
				<Node
					tree={tree}
					expanded={expanded}
					compactDenotations={compactDenotations}
				/>
			</div>
			{expanded ? (
				<div className="tree-children">
					{children.map((c, i) => (
						<TreeBrowser
							tree={c}
							key={c.label + i}
							compactDenotations={compactDenotations}
						/>
					))}
				</div>
			) : children.length ? (
				<div className="tree-roof" onClick={() => setExpanded(true)}>
					<div className="tree-word">{treeText(tree) || '(expand)'}</div>
				</div>
			) : undefined}
		</div>
	);
}
