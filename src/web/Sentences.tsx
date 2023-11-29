import _ from 'lodash';
import { useState } from 'react';
import { parse } from '../parse';
import { Tree } from '../tree';
import { Main } from './Main';
import './Sentences.css';

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

const parses = allSentences.map(countParses);

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
						{allSentences.map(
							(s, i) =>
								(!onlyFailures || parses[i] !== 1) && (
									<tr
										key={s}
										className={
											'parses-' +
											parses[i] +
											(s === selected ? ' selected' : '')
										}
										onClick={() => setSelected(s)}
									>
										<td className="sentence-number">{i + 1}</td>
										<td className="parse-count">{parses[i]}</td>
										<td className="sentence-text">{s}</td>
									</tr>
								),
						)}
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
