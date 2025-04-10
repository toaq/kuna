import { keyFor } from '../core/misc';
import { Glosser } from '../morphology/gloss';
import type { ToaqToken } from '../morphology/tokenize';
import './Tokens.css';
import { type Entry, dictionary } from '../morphology/dictionary';

function Token({ token }: { token: ToaqToken }) {
	const entry: Entry | undefined = dictionary.get(token.value);
	const tokenType =
		entry?.type === 'predicate' ? (
			<span>
				verb (<strong>{entry.pronominal_class}</strong> class, ({entry.frame})
				frame)
			</span>
		) : token.type === 'predicate' ? (
			'verb (unrecognized)'
		) : (
			token.type.replace(/_/g, ' ')
		);
	return (
		<tr className="token">
			<td className="token-index">{token.index}</td>
			<td className="token-value">{token.value}</td>
			<td className="token-gloss">
				{new Glosser(true).glossWord(token.value)}
			</td>
			<td className="token-type">{tokenType}</td>
		</tr>
	);
}

export function Tokens(props: { tokens: ToaqToken[] }) {
	return (
		<table className="token-table">
			<thead>
				<tr>
					<th>Index</th>
					<th>Value</th>
					<th>Gloss</th>
					<th>Type</th>
				</tr>
			</thead>
			<tbody>
				{props.tokens.map(token => (
					<Token key={keyFor(token)} token={token} />
				))}
			</tbody>
		</table>
	);
}
