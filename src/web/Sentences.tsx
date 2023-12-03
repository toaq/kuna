import _ from 'lodash';
import { useMemo, useState } from 'react';
import { parse } from '../parse';
import { Main } from './Main';
import './Sentences.css';
import { useInView } from 'react-intersection-observer';

// @ts-ignore
import refgramSentencesTxt from '../../data/sentences/refgram.txt?raw';
// @ts-ignore
import aSentencesTxt from '../../data/sentences/a.txt?raw';

const allSentences: string[] = _.uniq([
	...refgramSentencesTxt.split('\n'),
	...aSentencesTxt.split('\n'),
]);

function countParses(sentence: string): number {
	try {
		return parse(sentence).length;
	} catch {
		return 0;
	}
}

function SentenceRow(props: {
	sentence: string;
	selected: string | undefined;
	setSelected: (sentence: string) => void;
	index: number;
	onlyFailures: boolean;
}) {
	const [ref, inView] = useInView({ triggerOnce: true });
	const [parseCount, setParseCount] = useState<number>();
	useMemo(() => {
		if (inView) {
			setParseCount(countParses(props.sentence));
		}
	}, [inView]);

	if (props.onlyFailures && parseCount === 1) return <></>;
	return (
		<tr
			ref={ref}
			className={
				'parses-' +
				parseCount +
				(props.sentence === props.selected ? ' selected' : '')
			}
			onClick={() => {
				navigator.clipboard.writeText(props.sentence);
				props.setSelected(props.sentence);
			}}
		>
			<td className="sentence-number">{props.index + 1}</td>
			<td className="parse-count">{parseCount}</td>
			<td className="sentence-text">{props.sentence}</td>
		</tr>
	);
}

export function Sentences() {
	const [selected, setSelected] = useState<string>();
	const [onlyFailures, setOnlyFailures] = useState(false);

	return (
		<div className="sentences">
			<div className="card sentence-table-container">
				<label htmlFor="only-failures">
					<input
						id="only-failures"
						type="checkbox"
						checked={onlyFailures}
						onChange={e => setOnlyFailures(e.target.checked)}
					/>{' '}
					Only show failures
				</label>
				<table className="sentence-table">
					<thead>
						<tr>
							<th>No.</th>
							<th>Parses</th>
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
								onlyFailures={onlyFailures}
							/>
						))}
					</tbody>
				</table>
			</div>
			{selected && (
				<div className="sentences-output">
					<Main input={selected} mode="boxes-nest" />
				</div>
			)}
		</div>
	);
}
