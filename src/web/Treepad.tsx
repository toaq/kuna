import { useEffect, useState } from 'react';
import './Sentences.css';
import { Impossible } from '../core/error';
import { moveNodeUp } from '../tree/movement';
import {
	type MovementArrow,
	type Scene,
	type SceneNode,
	type Unplaced,
	sceneLabelToString,
} from '../tree/scene';
import { themes } from '../tree/theme';
import { TreeBrowser } from './tree/TreeBrowser';

type Node = SceneNode<string, Unplaced>;

const shortcuts: Record<string, string> = {
	v: '𝘷',
	"v'": "𝘷'",
	vP: '𝘷P',
	n: '𝘯',
	"n'": "𝘯'",
	nP: '𝘯P',
	'0': '∅',
	tone2: '◌́',
	tone4: '◌̂',
	':d2:': '◌́',
	':d4:': '◌̂',
};

function makeLeaf(node: Node, text: string): Node {
	const label = sceneLabelToString(node.label);
	return {
		label: label.replace(/\^|\_\d+/g, '') as any,
		denotation: node.denotation,
		source: text,
		text,
		roof: label.includes('^'),
		children: [],
		placement: undefined,
	};
}

function parseTreepad(
	source: string,
	position: number,
): Scene<string, Unplaced> {
	let pos = position;
	while (/\s/.test(source[pos - 1])) pos -= 1;
	const stack: Node[] = [];
	let mode: 'default' | 'expecting label' = 'default';
	const regex = /\[|\]|<\w+>|\$([^$]+)\$|[^\s\[\]]+/gu;
	const movementTargets: Record<string, Node> = {};
	const arrows: MovementArrow[] = [];

	for (const token of source.matchAll(regex)) {
		const lexeme = shortcuts[token[0]] ?? token[0];
		const selected = pos >= token.index && pos <= token.index + lexeme.length;
		const display = selected ? `[${lexeme}]` : lexeme;
		if (lexeme === '[') {
			mode = 'expecting label';
			stack.push({
				children: [],
				label: '[]',
				source: '',
				placement: undefined,
				roof: false,
			});
		} else if (lexeme === ']') {
			const top = stack.pop();
			if (!top) throw new Error('unmatched ]');
			const last = stack.at(-1);
			if (!last) return { root: top, arrows };
			if (pos === token.index + 1) top.label = `${top.label}→`;
			last.children.push(top);
		} else if (lexeme.startsWith('<')) {
			const top = stack.at(-1);
			if (!top) throw new Error('no subtree to move');
			if (top.children.length) throw new Error('can only move leaves');
			const id = lexeme.replaceAll(/[<>]/g, '');
			arrows.push(moveNodeUp(top, movementTargets[id]));
		} else if (lexeme.startsWith('$')) {
			const latex = token[1];
			const top = stack.at(-1);
			if (!top) throw new Error('no subtree to denote');
			top.denotation = latex;
		} else if (mode === 'expecting label') {
			const top = stack.at(-1);
			if (!top) throw new Impossible();
			const match = lexeme.match(/_(\w+)/);
			if (match) {
				movementTargets[match[1]] = top;
				top.label = display.replace(/_(\w+)/, '');
			} else {
				top.label = display;
			}
			mode = 'default';
		} else {
			const top = stack.at(-1);
			if (!top) throw new Error('leaf without tree');
			if (top.text) {
				top.text += ` ${lexeme}`;
				if (selected) {
					top.text = `[${top.text.replaceAll(/[\[\]]/g, '')}]`;
				}
			} else if (top.children.length === 0) {
				const leaf = makeLeaf(top, display);
				for (const k in top) delete (top as any)[k];
				for (const k in leaf) (top as any)[k] = (leaf as any)[k];
			} else {
				throw new Error(
					`can't add leaf text "${lexeme}" to branch "${top.label}"`,
				);
			}
		}
	}
	while (stack.length >= 1) {
		const top = stack.pop();
		if (!top) throw new Impossible();
		const last = stack.at(-1);
		if (!last) return { root: top, arrows };
		last.children.push(top);
	}
	throw new Error('no tree');
}

export function Treepad(props: { isDarkMode: boolean }) {
	const [source, setSource] = useState('');
	const [pos, setPos] = useState(0);
	const [error, setError] = useState('');
	const [currentScene, setCurrentScene] = useState<Scene<string, Unplaced>>();

	useEffect(() => {
		let scene: Scene<string, Unplaced> | undefined;
		try {
			scene = parseTreepad(source, pos);
			setError('');
		} catch (e) {
			setError(String(e));
		}
		if (scene) {
			setCurrentScene(scene);
		}
	}, [source, pos]);
	return (
		<div
			style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
		>
			<div className="card">
				<h1 style={{ textAlign: 'center' }}>Treepad</h1>
				<p>You can use this tool to create syntax trees from bracketed text.</p>
				<pre style={{ margin: '-4px 0' }}>
					[TP [^DP This tool] [T' [T 0] [VP [V is] [A useful]]]]
				</pre>
				<p>When you're done, take a screenshot of the tree.</p>
				<textarea
					value={source}
					placeholder={''}
					spellCheck={false}
					onClick={e => {
						setPos(e.currentTarget.selectionEnd);
					}}
					onKeyUp={e => {
						setPos(e.currentTarget.selectionEnd);
					}}
					onChange={e => {
						setSource(e.target.value);
						setPos(e.target.selectionEnd);
					}}
				/>
			</div>
			{error ? (
				error
			) : currentScene ? (
				<TreeBrowser
					scene={currentScene}
					compactDenotations={false}
					theme={props.isDarkMode ? themes.dark : themes.light}
					truncateLabels={[]}
				/>
			) : (
				'No tree'
			)}
		</div>
	);
}
