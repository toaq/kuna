import type { RichSceneLabel, RichSceneLabelPiece } from '../../tree/scene';

function TreeLabelPiece({
	piece,
	forceNormalWeight,
}: { piece: RichSceneLabelPiece; forceNormalWeight?: boolean }) {
	const font = forceNormalWeight ? piece.font.replace('bold ', '') : piece.font;
	const style = { font, whiteSpace: 'pre' };

	return piece.subscript ? (
		<sub style={style}>{piece.text}</sub>
	) : (
		<span style={style}>{piece.text}</span>
	);
}

export function TreeLabel(props: {
	label: string | RichSceneLabel;
	forceNormalWeight?: boolean;
}) {
	if (typeof props.label === 'string') {
		return props.label;
	}
	return (
		<div className="flex flex-col items-center">
			{props.label.lines.map((line, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: Layers of label
				<div key={i} className="flex flex-row items-baseline">
					{line.pieces.map((piece, j) => (
						<TreeLabelPiece
							// biome-ignore lint/suspicious/noArrayIndexKey: Pieces of label
							key={j}
							piece={piece}
							forceNormalWeight={props.forceNormalWeight}
						/>
					))}
				</div>
			))}
		</div>
	);
}
