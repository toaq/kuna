import _ from 'lodash';
import { useMemo, useState } from 'react';
import { parse } from '../parse';
import { Main, Mode } from './Main';
import './Sentences.css';
import { useInView } from 'react-intersection-observer';

// @ts-ignore
import refgramSentencesTxt from '../../data/sentences/refgram.txt?raw';
// @ts-ignore
import aSentencesTxt from '../../data/sentences/a.txt?raw';
import { fix } from '../fix';
import { denote } from '../semantics/denote';

const allSentences: string[] = _.uniq([
	...refgramSentencesTxt.split('\n'),
	...aSentencesTxt.split('\n'),
]);

type ParseStatus =
	| { status: 'no parse' }
	| { status: 'ambiguous'; count: number }
	| { status: 'fix failed' }
	| { status: 'denote failed' }
	| { status: 'ok' };

function parseStatusScore(status: ParseStatus): number {
	return status.status === 'no parse'
		? 0
		: status.status === 'ambiguous'
		? 1
		: status.status === 'fix failed'
		? 2
		: status.status === 'denote failed'
		? 3
		: 4;
}

function checkParse(sentence: string): ParseStatus {
	try {
		const trees = parse(sentence);
		const n = trees.length;
		if (n > 1) return { status: 'ambiguous', count: n };
		if (n === 0) return { status: 'no parse' };
		try {
			const fixed = fix(trees[0]);
			try {
				denote(fixed);
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

function ShowParseStatus(props: { status: ParseStatus }) {
	const b = '•';
	switch (props.status.status) {
		case 'ok':
			return (
				<span className="bullets">
					<span style={{ color: '#55aa00' }}>{b + b + b}</span>
				</span>
			);
		case 'denote failed':
			return (
				<span className="bullets">
					<span style={{ color: '#ccaa00' }}>{b + b}</span>
					<span style={{ color: '#88888840' }}>{b}</span>
				</span>
			);
		case 'fix failed':
			return (
				<span className="bullets">
					<span style={{ color: '#cc4400' }}>{b}</span>
					<span style={{ color: '#88888840' }}>{b + b}</span>
				</span>
			);
		case 'ambiguous':
			return <span style={{ color: '#cc4400' }}>{props.status.count}?</span>;
		case 'no parse':
			return (
				<span className="bullets">
					<span style={{ color: '#88888840' }}>{b + b + b}</span>
				</span>
			);
	}
}

function SentenceRow(props: {
	sentence: string;
	selected: string | undefined;
	setSelected: (sentence: string) => void;
	index: number;
	showScores: string;
}) {
	const [ref, inView] = useInView({ triggerOnce: true });
	const [parseStatus, setParseStatus] = useState<ParseStatus>();
	useMemo(() => {
		if (inView) {
			setParseStatus(checkParse(props.sentence));
		}
	}, [inView]);

	if (
		parseStatus &&
		!props.showScores.includes(parseStatusScore(parseStatus).toString())
	)
		return <></>;
	return (
		<tr
			ref={ref}
			className={props.sentence === props.selected ? ' selected' : ''}
			onClick={() => {
				navigator.clipboard.writeText(props.sentence);
				props.setSelected(props.sentence);
			}}
		>
			<td className="sentence-number">{props.index + 1}</td>
			<td className="parse-status">
				{parseStatus && <ShowParseStatus status={parseStatus} />}
			</td>
			<td className="sentence-text">{props.sentence}</td>
		</tr>
	);
}

export function Sentences() {
	const [selected, setSelected] = useState<string>();
	const [showScores, setShowScores] = useState('01234');
	const [outputMode, setOutputMode] = useState<Mode>('boxes-nest');

	return (
		<div className="sentences">
			<div>
				<select onChange={e => setOutputMode(e.target.value as Mode)}>
					<option value="tokens">Tokens</option>
					<option value="raw-tree">Raw tree</option>
					<option value="syntax-tree">Syntax tree</option>
					<option value="compact-tree">Simplified tree</option>
					<option value="semantics-tree">Denoted tree</option>
					<option value="semantics-tree-compact">Compact denoted tree</option>
					<option value="boxes-flat">Boxes (flat)</option>
					<option value="boxes-nest">Boxes (nest)</option>
					<option value="boxes-split">Boxes (split)</option>
					<option value="gloss">Gloss</option>
					<option value="technical-gloss">Technical gloss</option>
					<option value="english">English</option>
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
							{allSentences.map((s, i) => (
								<SentenceRow
									key={s}
									sentence={s}
									index={i}
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
						<Main input={selected} mode={outputMode} />
					</div>
				)}
			</main>
		</div>
	);
}
