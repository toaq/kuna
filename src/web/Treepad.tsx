import { useEffect, useRef, useState } from 'react';
import './Sentences.css';
import { useDarkMode } from 'usehooks-ts';
import { Impossible } from '../core/error';
import { Tone } from '../morphology/tone';
import type { Label, Tree } from '../tree';
import { drawTreeToCanvas } from '../tree/draw';
import { denotationRenderLatex } from '../tree/place';

const shortcuts: Record<string, string> = {
	v: '𝘷',
	"v'": "𝘷'",
	vP: '𝘷P',
	n: '𝘯',
	"n'": "𝘯'",
	nP: '𝘯P',
	'0': '∅',
};

function parseTreepad(source: string, position: number): Tree {
	let pos = position;
	while (/\s/.test(source[pos - 1])) pos -= 1;
	const stack: Tree[] = [];
	let mode: 'default' | 'expecting label' = 'default';
	const regex = /\[|\]|[^\s\[\]]+/gu;
	for (const token of source.matchAll(regex)) {
		const lexeme = shortcuts[token[0]] ?? token[0];
		const display =
			pos >= token.index && pos <= token.index + lexeme.length
				? `[${lexeme}]`
				: lexeme;

		if (lexeme === '[') {
			mode = 'expecting label';
			stack.push({
				children: [],
				label: '?' as any,
				source: '',
			});
		} else if (lexeme === ']') {
			const top = stack.pop();
			if (!top) throw new Error('unmatched ]');
			let last = stack.at(-1);
			if (!last) return top;

			if (pos === token.index + 1) top.label = `${top.label} →` as any;
			if (!('children' in last)) {
				last = {
					label: last.label,
					source: '',
					children: [{ ...last, label: '?' as any }],
				};
			}
			last.children.push(top);
		} else if (mode === 'expecting label') {
			const top = stack.at(-1);
			if (!top) throw new Impossible();
			top.label = display as Label;
			mode = 'default';
		} else {
			const top = stack.at(-1);
			if (!top) throw new Error('leaf without tree');
			if ('word' in top) {
				if (top.word.covert) throw new Impossible();
				top.word.text += ` ${display}`;
			} else if ('children' in top) {
				if (top.children.length === 0) {
					stack[stack.length - 1] = {
						label: top.label,
						source: '',
						word: {
							covert: false,
							index: 0,
							bare: display,
							tone: Tone.T1,
							entry: undefined,
							text: display,
						},
					};
				} else {
					throw new Error(
						`can't add leaf text "${lexeme}" to branch "${top.label}"`,
					);
				}
			}
		}
	}
	while (stack.length >= 1) {
		const top = stack.pop();
		let last = stack.at(-1);
		if (!top) throw new Impossible();
		if (!last) return top;
		if (!('children' in last)) {
			last = {
				label: last.label,
				source: '',
				children: [{ ...last, label: '?' as any }],
			};
		}

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
				showMovement: false,
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
				<p>
					You can use this tool to create syntax trees by writing input like:
					<br />
					<code>[TP [DP This] [T' [T 0] [VP [V is] [A useful]]]]</code>
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
