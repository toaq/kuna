import { Glosser } from '../morphology/gloss';
import { ToaqToken } from '../morphology/tokenize';
import './Tokens.css';

function Token(props: { token: ToaqToken }) {
	return (
		<tr className="token">
			<td className="token-index">{props.token.index}</td>
			<td className="token-value">{props.token.value}</td>
			<td className="token-gloss">
				{new Glosser(true).glossWord(props.token.value)}
			</td>
			<td className="token-type">{props.token.type.replace(/_/g, ' ')}</td>
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
				{props.tokens.map((token, i) => (
					<Token key={i} token={token} />
				))}
			</tbody>
		</table>
	);
}
