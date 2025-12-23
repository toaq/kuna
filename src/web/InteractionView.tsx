import { type ReactNode, useState } from 'react';
import { DeleteButton } from './DeleteButton';
import { ErrorBoundary } from './ErrorBoundary';
import { Output } from './Output';
import type { Configuration } from './Settings';

export interface Interaction {
	id: number;
	command: string;
	configuration?: Configuration;
}

const paletteCommands: [string, string][] = [
	['boxes', 'Visualize grammar'],
	['tokens', 'Show a table of tokens'],
	['tree', 'Show a denotation tree'],
	['gloss', 'Translate each word'],
];

const hints = [
	'Enter some Toaq',
	'Try “/boxes De cháq”',
	'Enter some Toaq',
	'Try “/gloss Toe ji2 ke2 zeo”',
	'Enter some Toaq',
	'Try “/tokens bu nai fi nuo”',
];

export function InteractionView(props: {
	interaction: Interaction;
	current: boolean;
	isDarkMode: boolean;
	setInspectee: (inspectee: ReactNode) => void;
	setCommand: (command: string) => void;
	onSubmit: (input: string) => void;
	delete?: () => void;
	scrollToBottom?: () => void;
}) {
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [paletteIndex, setPaletteIndex] = useState<number>();
	const [deleting, setDeleting] = useState(false);

	return (
		<div
			className={`grid !transition-all duration-200 ${deleting ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}
		>
			<div className="relative overflow-hidden gap-2 mx-4 mt-4 p-4 w-full border-gray-300">
				<div className="flex flex-row gap-2 items-baseline">
					({props.interaction.id})
					<input
						placeholder={hints[props.interaction.id % hints.length]}
						type="text"
						className="!bg-transparent !border-t-0 !border-x-0 !border-b-2 focus:!border-blue focus:outline-none field-sizing-content"
						value={props.interaction.command}
						onChange={e => {
							props.setCommand(e.currentTarget.value);
							if (e.currentTarget.value.match(/^\/[a-z-]*$/) !== null) {
								setPaletteOpen(true);
								const i = paletteCommands.findIndex(([command]) =>
									command.startsWith(e.currentTarget.value.slice(1)),
								);
								if (i !== -1) setPaletteIndex(i);
								else if (paletteIndex === undefined) setPaletteIndex(0);
								props.scrollToBottom?.();
							} else {
								setPaletteOpen(false);
								setPaletteIndex(undefined);
							}
						}}
						onKeyDown={e => {
							if (e.key === 'ArrowUp') {
								e.preventDefault();
								setPaletteIndex(
									paletteIndex === undefined ? 0 : paletteIndex - 1,
								);
							} else if (e.key === 'ArrowDown') {
								e.preventDefault();
								setPaletteIndex(
									paletteIndex === undefined ? 0 : paletteIndex + 1,
								);
							} else if (
								paletteOpen &&
								(e.key === 'Tab' || e.key === 'Enter') &&
								paletteIndex !== undefined
							) {
								e.preventDefault();
								props.setCommand(`/${paletteCommands[paletteIndex][0]} `);
								setPaletteIndex(undefined);
								setPaletteOpen(false);
							} else if (e.key === 'Enter') {
								props.onSubmit(e.currentTarget.value);
							}
						}}
					/>
					{props.delete ? (
						<DeleteButton
							onClick={() => {
								setDeleting(true);
								setTimeout(() => {
									props.delete?.();
								}, 200);
							}}
						/>
					) : null}
				</div>
				{paletteOpen ? (
					<div className="z-20 bg-white dark:bg-gray-900 w-fit mt-2 border border-gray-400">
						<div className="flex flex-col gap-0">
							{paletteCommands.map(([command, description], index) => (
								// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled elsewhere
								<div
									key={command}
									className={`px-2 py-1 !duration-0 ${index === paletteIndex ? 'bg-blue/20 dark:bg-blue/40' : ''}`}
									onClick={() => {
										props.setCommand(`/${command} `);
										setPaletteIndex(undefined);
										setPaletteOpen(false);
									}}
								>
									<strong className="w-16 inline-block">/{command}</strong>{' '}
									{description}
								</div>
							))}
						</div>
					</div>
				) : props.current ? (
					<div className="h-40" />
				) : null}
				{props.interaction.configuration && (
					<ErrorBoundary>
						<Output
							configuration={props.interaction.configuration}
							isDarkMode={props.isDarkMode}
							inspect={props.setInspectee}
						/>
					</ErrorBoundary>
				)}
			</div>
		</div>
	);
}
