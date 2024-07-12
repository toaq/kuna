import { useEffect, useRef, useState } from 'react';
import './Sentences.css';
import { useDarkMode } from 'usehooks-ts';
import { Impossible } from '../core/error';
import { Tone } from '../morphology/tone';
import type { Label, Leaf, Tree } from '../tree';
import { drawTreeToCanvas } from '../tree/draw';
import { moveUp } from '../tree/movement';
import { denotationRenderLatex } from '../tree/place';

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

function makeLeaf(label: string, text: string): Leaf {
	return {
		label: label.replace(/\^|\_\d+/g, '') as any,
		source: '',
		word: {
			covert: false,
			index: 0,
			bare: text,
			tone: Tone.T1,
			entry: undefined,
			text: text,
		},
		roof: label.includes('^'),
	};
}

function parseTreepad(source: string, position: number): Tree {
	let pos = position;
	while (/\s/.test(source[pos - 1])) pos -= 1;
	const stack: Tree[] = [];
	let mode: 'default' | 'expecting label' = 'default';
	const regex = /\[|\]|<\w+>|[^\s\[\]]+/gu;
	const movementTargets: Record<string, Leaf> = {};

	for (const token of source.matchAll(regex)) {
		const lexeme = shortcuts[token[0]] ?? token[0];
		const selected = pos >= token.index && pos <= token.index + lexeme.length;
		const display = selected ? `[${lexeme}]` : lexeme;
		if (lexeme === '[') {
			mode = 'expecting label';
			stack.push({
				children: [],
				label: '[]' as any,
				source: '',
			});
		} else if (lexeme === ']') {
			const top = stack.pop();
			if (!top) throw new Error('unmatched ]');
			const last = stack.at(-1);
			if (!last) return top;
			if (!('children' in last)) throw new Impossible();
			if (pos === token.index + 1) top.label = `${top.label}›` as any;
			last.children.push(top);
		} else if (lexeme.startsWith('<')) {
			const top = stack.at(-1);
			if (!top) throw new Error('no subtree to move');
			if ('children' in top) throw new Error('can only move leaves');
			const id = lexeme.replaceAll(/[<>]/g, '');
			moveUp(top as Leaf, movementTargets[id] as Leaf);
		} else if (mode === 'expecting label') {
			const top = stack.at(-1);
			if (!top) throw new Impossible();
			const match = lexeme.match(/_(\w+)/);
			if (match) {
				movementTargets[match[1]] = top as Leaf;
				top.label = display.replace(/_(\w+)/, '') as Label;
			} else {
				top.label = display as Label;
			}
			mode = 'default';
		} else {
			const top = stack.at(-1);
			if (!top) throw new Error('leaf without tree');
			if ('word' in top) {
				if (top.word.covert) throw new Impossible();
				top.word.text += ` ${lexeme}`;
				if (selected) {
					top.word.text = `[${top.word.text.replaceAll(/[\[\]]/g, '')}]`;
				}
			} else if ('children' in top) {
				if (top.children.length === 0) {
					const leaf = makeLeaf(top.label, display);
					for (const k in top) delete (top as any)[k];
					for (const k in leaf) (top as any)[k] = (leaf as any)[k];
				} else {
					throw new Error(
						`can't add leaf text "${lexeme}" to branch "${top.label}"`,
					);
				}
			} else throw new Impossible();
		}
	}
	while (stack.length >= 1) {
		const top = stack.pop();
		if (!top) throw new Impossible();
		const last = stack.at(-1);
		if (!last) return top;
		if (!('children' in last)) throw new Impossible();
		last.children.push(top);
	}
	throw new Error('no tree');
}

export function Treepad() {
	const darkMode = useDarkMode();
	const [source, setSource] = useState('');
	const [pos, setPos] = useState(0);
	const [error, setError] = useState('');
	const treeImg = useRef<HTMLImageElement>(null);

	useEffect(() => {
		let tree: Tree | undefined;
		try {
			tree = parseTreepad(source, pos);
			setError('');
		} catch (e) {
			setError(String(e));
		}
		if (tree) {
			drawTreeToCanvas({
				themeName: darkMode.isDarkMode ? 'dark' : 'light',
				tall: false,
				tree,
				renderer: denotationRenderLatex,
				showMovement: true,
				compact: false,
				truncateLabels: [],
			}).then(canvas => {
				setTimeout(() => {
					if (treeImg.current) {
						treeImg.current.src = canvas.toDataURL();
					}
				}, 0);
			});
		}
	}, [source, pos, darkMode]);
	return (
		<div
			style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
		>
			<div className="card" style={{ maxWidth: '35em' }}>
				<h1 style={{ textAlign: 'center' }}>Treepad</h1>
				<p>
					You can use this tool to create syntax trees from bracketed text.
					<pre>[TP [^DP This tool] [T' [T 0] [VP [V is] [A useful]]]]</pre>
				</p>
				<textarea
					value={source}
					placeholder={''}
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
			) : (
				<img
					ref={treeImg}
					style={{
						maxWidth: '90vw',
						maxHeight: '90vh',
						objectFit: 'contain',
					}}
					src={''}
					aria-label="Tree diagram"
				/>
			)}
		</div>
	);
}
