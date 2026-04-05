const syntacticCategories: [string, string][] = [
	['Asp', 'aspect'],
	['C', 'complementizer'],
	['D', 'determiner'],
	['EvA', 'event accessor'],
	['SA', 'speech act'],
	['Σ', 'polarity'],
	['T', 'tense'],
	['V', 'verb'],
	['a', 'adjective head'],
	['n', 'noun feature'],
	['v', 'light verb'],
	['&', 'conjunction'],
];

const SyntaxHelp = () => (
	<>
		<h2 className="text-2xl font-bold my-4">Syntax</h2>
		<table>
			<tbody>
				{syntacticCategories.map(([label, definition]) => (
					<tr key={label}>
						<th
							style={{ fontStyle: /^[a-z]/.test(label) ? 'italic' : 'normal' }}
						>
							{label}
						</th>
						<td>{definition}</td>
					</tr>
				))}
			</tbody>
		</table>
	</>
);

const types: [string, string, string][] = [
	['e', 'entity', '𝑎 𝑏 𝑐 𝑑'],
	['i', 'time interval', "𝑡 𝑡' 𝑡''"],
	['s', 'world', "𝑤 𝑤' 𝑤''"],
	['v', 'event', "𝑒 𝑒' 𝑒''"],
	['t', 'truth value', ''],
	['a', 'speech act', ''],
	['x → y', 'function', '𝑃 𝑄 𝑅'],
];

const TypesHelp = () => (
	<>
		<h2 className="text-2xl font-bold my-4">Types</h2>
		<table>
			<tbody>
				{types.map(([typeName, definition, variables]) => (
					<tr key={typeName}>
						<th style={{ fontWeight: 'normal' }}>{typeName}</th>
						<td>{definition}</td>
						<td style={{ fontFamily: 'Fira Math' }}>{variables}</td>
					</tr>
				))}
			</tbody>
		</table>
	</>
);

const effects: [string, string, string][] = [
	['Indef T', 'indefinite reference', '{T}'],
	['Pl T', 'plural constant', '{T}'],
	['Qn D T', 'question with domain', '{D} × (D → T)'],
	['Act T', 'speech act (writes to discourse)', 'T × a'],
	['Dx T', 'deixis (reads discourse state)', 'd → T'],
	['Int T', 'intension (reads world variable)', 's → T'],
	['Cont T', 'continuation', '((T → t) → t)'],
	['Bind V T', 'writes a Toaq variable', 'V × (T × Int Pl e)'],
	['Ref V T', 'reads a Toaq variable', 'V × (Int Pl e → T)'],
];

const EffectsHelp = () => (
	<>
		<h2 className="text-2xl font-bold my-4">Effects</h2>
		<table>
			<tbody>
				{effects.map(([name, explanation, isomorphism]) => (
					<tr key={name}>
						<th style={{ fontWeight: 'normal' }}>{name}</th>
						<td>{explanation}</td>
						<td style={{ fontFamily: 'Fira Math' }}>{isomorphism}</td>
					</tr>
				))}
			</tbody>
		</table>
	</>
);

export function Help(props: { closeSelf: () => void }) {
	return (
		<div className="help relative lg:fixed lg:start-2 lg:bottom-2 bg-white dark:bg-gray-900 z-20 px-8 pb-8 lg:rounded-xl lg:border lg:border-current/10 text-xs print:hidden">
			<button
				className="absolute top-4 end-4 cursor-pointer hover:underline"
				type="button"
				onClick={() => props.closeSelf()}
			>
				Close
			</button>
			<div className="flex gap-8">
				<div className="help-column">
					<SyntaxHelp />
				</div>
				<div className="help-column">
					<TypesHelp />
					<EffectsHelp />
				</div>
			</div>
		</div>
	);
}
