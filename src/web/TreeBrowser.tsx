import type { DTree } from '../semantics/model';
import { toJsx, typeToPlainText } from '../semantics/render';
import { type Tree, treeChildren } from '../tree';
import './TreeBrowser.css';
import type { Theme } from '../tree/theme';

export function TreeBrowser(props: {
	tree: Tree | DTree;
	compactDenotations: boolean;
	theme: Theme;
	truncateLabels: string[];
}) {
	const tree = props.tree;
	const type =
		'denotation' in tree && tree.denotation.type
			? ` : ${typeToPlainText(tree.denotation.type)}`
			: '';
	return (
		<ul>
			<li>
				<strong>{props.tree.label}</strong>
				{type}{' '}
				{'denotation' in tree ? (
					<span className="effects-denotation">{toJsx(tree.denotation)}</span>
				) : undefined}
			</li>

			{treeChildren(tree).map((c, i) => (
				<TreeBrowser
					// biome-ignore lint/suspicious/noArrayIndexKey: rendering static tree
					key={i}
					tree={c}
					compactDenotations={props.compactDenotations}
					theme={props.theme}
					truncateLabels={props.truncateLabels}
				/>
			))}
		</ul>
	);
}
