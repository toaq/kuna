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

function tryParse(sentence: string): Tree[] {
	try {
		return parse(sentence);
	} catch {
		return [];
	}
}

const parses = allSentences.map(tryParse);

export function Sentences() {
	const [selected, setSelected] = useState<string>();
	return (
		<div className="sentences">
			<div className="card sentence-table-container">
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
							<tr
								key={s}
								className={
									'parses-' +
									parses[i].length +
									(s === selected ? ' selected' : '')
								}
								onClick={() => setSelected(s)}
							>
								<td className="sentence-number">{i + 1}</td>
								<td className="parse-count">{parses[i].length}</td>
								<td className="sentence-text">{s}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{selected && (
				<div className="sentences-output">
					<Main input={selected} mode="syntax-tree" />
				</div>
			)}
		</div>
	);
}
