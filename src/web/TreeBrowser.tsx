import { useState } from 'react';
import { DTree } from '../semantics/model';
import { Tree, treeText } from '../tree';
import { getLabel } from '../tree/place';
import { toPlainText } from '../semantics/render';
import './TreeBrowser.css';

export function Node(props: { tree: Tree | DTree; expanded: boolean }) {
	const { tree, expanded } = props;
	return (
		<div className="tree-node">
			<div className="tree-label">{getLabel(tree)}</div>
			{'denotation' in tree && tree.denotation && (
				<div className="tree-denotation">{toPlainText(tree.denotation)}</div>
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

export function TreeBrowser(props: { tree: Tree | DTree }) {
	const { tree } = props;
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
				<Node tree={tree} expanded={expanded} />
			</div>
			{expanded ? (
				<div className="tree-children">
					{children.map((c, i) => (
						<TreeBrowser tree={c} key={c.label + i} />
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
