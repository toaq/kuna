import type { EarleyItem, EarleyParser } from '../parse/earley';

export function EarleyTableRow(props: {
	parser: EarleyParser<string, string>;
	i: number;
	row: EarleyItem<string, string>[];
}) {
	return (
		<table>
			<tr>
				<th className="border p-2">{props.i}</th>
			</tr>
			{props.row.map((item, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: rendering static table
				<tr key={i}>
					<td className="border p-2">{props.parser.showItem(item)}</td>
				</tr>
			))}
		</table>
	);
}

export function EarleyTable(props: {
	parser: EarleyParser<string, string>;
	table: EarleyItem<string, string>[][];
}) {
	return (
		<div className="flex flex-row items-start gap-1">
			{props.table.map((row, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: rendering static table
				<EarleyTableRow parser={props.parser} row={row} i={i} key={i} />
			))}
		</div>
	);
}
