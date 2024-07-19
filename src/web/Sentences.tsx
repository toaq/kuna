import { useCallback, useMemo, useState } from 'react';
import { parse } from '../modes/parse';
import './Sentences.css';
import { useInView } from 'react-intersection-observer';

// @ts-ignore
import aSentencesTxt from '../../sentences/a.txt?raw';
// @ts-ignore
import refgramSentencesTxt from '../../sentences/refgram.txt?raw';
import { denote } from '../semantics/denote';
import { recover } from '../syntax/recover';
import { Output } from './Output';
import type { Mode } from './Settings';

const rSentences: string[] = refgramSentencesTxt.split('\n');
const aSentences: string[] = aSentencesTxt.split('\n');
const allSentences: { id: string; sentence: string }[] = [
	...rSentences.map((sentence, i) => ({ id: `R${i + 1}`, sentence })),
	...aSentences.map((sentence, i) => ({ id: `A${i + 1}`, sentence })),
];

type ParseStatus =
	| { status: 'no parse' }
	| { status: 'ambiguous'; count: number }
	| { status: 'fix failed' }
	| { status: 'denote failed' }
	| { status: 'ok' };

function parseStatusScore(status: ParseStatus): number {
	return {
		'no parse': 0,
		ambiguous: 1,
		'fix failed': 2,
		'denote failed': 3,
		ok: 4,
	}[status.status];
}

function checkParse(sentence: string): ParseStatus {
	try {
		const trees = parse(sentence);
		const n = trees.length;
		if (n > 1) return { status: 'ambiguous', count: n };
		if (n === 0) return { status: 'no parse' };
		try {
			const deepStructure = recover(trees[0]);
			try {
				denote(deepStructure);
				return { status: 'ok' };
			} catch {
				return { status: 'denote failed' };
			}
		} catch {
			return { status: 'fix failed' };
		}
	} catch {
		return { status: 'no parse' };
	}
}

const BULLET = '•';
const GREEN = '#55aa00';
const ORANGE = '#ccaa00';
const RED = '#cc4400';
const BLANK = '#88888840';

function ShowParseStatus({ status }: { status: ParseStatus }) {
	const errorText = status.status === 'ambiguous' ? `${status.count}?` : '';
	const bullets = {
		ok: [GREEN, GREEN, GREEN],
		'denote failed': [ORANGE, ORANGE, BLANK],
		'fix failed': [RED, BLANK, BLANK],
		ambiguous: [],
		'no parse': [BLANK, BLANK, BLANK],
	}[status.status];

	return (
		<>
			<span style={{ color: RED }}>{errorText}</span>
			<span className="bullets">
				{bullets.map((color, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: order is stable
					<span key={i} style={{ color }}>
						{BULLET}
					</span>
				))}
			</span>
		</>
	);
}

function SentenceRow(props: {
	sentence: string;
	selected: string | undefined;
	setSelected: (sentence: string) => void;
	id: string;
	showScores: string;
}) {
	const [ref, inView] = useInView({ triggerOnce: true });
	const [parseStatus, setParseStatus] = useState<ParseStatus>();
	useMemo(() => {
		if (inView) {
			setParseStatus(checkParse(props.sentence));
		}
	}, [inView, props.sentence]);

	if (
		parseStatus &&
		!props.showScores.includes(parseStatusScore(parseStatus).toString())
	)
		return <></>;

	const select = useCallback(() => {
		navigator.clipboard.writeText(props.sentence);
		props.setSelected(props.sentence);
	}, [props.sentence, props.setSelected]);

	return (
		<tr
			ref={ref}
			className={props.sentence === props.selected ? ' selected' : ''}
			tabIndex={0}
			onClick={select}
			onKeyUp={e => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					select();
				}
			}}
		>
			<td className="sentence-number">{props.id}</td>
			<td className="parse-status">
				{parseStatus && <ShowParseStatus status={parseStatus} />}
			</td>
			<td className="sentence-text">{props.sentence}</td>
		</tr>
	);
}

export function Sentences(props: { isDarkMode: boolean }) {
	const [selected, setSelected] = useState<string>();
	const [showScores, setShowScores] = useState('01234');
	const [outputMode, setOutputMode] = useState<Mode>('boxes-nest');

	return (
		<div className="sentences">
			<div className="sentences-settings">
				<select
					defaultValue={'boxes-nest'}
					onChange={e => setOutputMode(e.target.value as Mode)}
				>
					<option value="tokens">Tokens</option>
					<option value="raw-tree">Raw tree</option>
					<option value="syntax-tree">Syntax tree</option>
					<option value="trimmed-tree">Trimmed tree</option>
					<option value="semantics-tree">Denoted tree</option>
					<option value="semantics-tree-compact">Compact denoted tree</option>
					<option value="boxes-flat">Boxes (flat)</option>
					<option value="boxes-nest">Boxes (nest)</option>
					<option value="boxes-split">Boxes (split)</option>
					<option value="gloss">Gloss</option>
					<option value="technical-gloss">Technical gloss</option>
					<option value="english">English</option>
					<option value="gf">GF</option>
					<option value="logical-form">Formula (text)</option>
					<option value="logical-form-latex">Formula (LaTeX code)</option>
				</select>
				<select onChange={e => setShowScores(e.target.value)}>
					<option value="01234">Show all sentences</option>
					<option value="0">Show parse failures</option>
					<option value="1">Show ambiguities</option>
					<option value="2">Show fix failures</option>
					<option value="3">Show denote failures</option>
					<option value="4">Show successful parses</option>
				</select>
			</div>
			<main>
				<div className="card sentence-table-container">
					<table className="sentence-table">
						<thead>
							<tr>
								<th>No.</th>
								<th>Status</th>
								<th>Sentence</th>
							</tr>
						</thead>
						<tbody>
							{allSentences.map(s => (
								<SentenceRow
									key={s.id}
									sentence={s.sentence}
									id={s.id}
									selected={selected}
									setSelected={setSelected}
									showScores={showScores}
								/>
							))}
						</tbody>
					</table>
				</div>
				{selected && (
					<div className="sentences-output">
						<Output
							configuration={{
								text: selected,
								treeFormat: 'png-latex',
								roofLabels: '',
								trimNulls: false,
								showMovement: true,
								meaningCompact: true,
								mode: outputMode,
							}}
							isDarkMode={props.isDarkMode}
						/>
					</div>
				)}
			</main>
		</div>
	);
}
