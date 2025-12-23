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

const paletteCommands: {
	name: string;
	description: string;
	instant?: boolean;
}[] = [
	{ name: 'boxes', description: 'Visualize grammar' },
	{ name: 'formula', description: 'Interpret Toaq text' },
	{ name: 'gloss', description: 'Translate each word' },
	{ name: 'help', description: 'Show help', instant: true },
	{ name: 'tokens', description: 'Show a table of tokens' },
	{ name: 'tree', description: 'Show a syntax tree' },
];

const hints = [
	'Enter some Toaq',
	'Try: /boxes De cháq',
	'Enter some Toaq',
	'Try: /gloss Toe ji2 ke2 zeo',
	'Enter some Toaq',
	'Try: /tokens bu nai fi nuo',
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
			<div className="relative gap-2 mx-4 mt-4 p-4 w-full border-gray-300">
				<div className="flex flex-row gap-2 items-baseline">
					({props.interaction.id})
					<input
						placeholder={hints[props.interaction.id % hints.length]}
						type="text"
						className="!bg-transparent !border-t-0 !border-x-0 !border-b-2 focus:!border-blue focus:outline-none field-sizing-content min-w-[calc(100svw-120px)] md:min-w-80"
						value={props.interaction.command}
						onChange={e => {
							props.setCommand(e.currentTarget.value);
							if (e.currentTarget.value.match(/^\/[a-z-]*$/) !== null) {
								setPaletteOpen(true);
								const i = paletteCommands.findIndex(command =>
									command.name.startsWith(e.currentTarget.value.slice(1)),
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
								const completion = `/${paletteCommands[paletteIndex].name} `;
								props.setCommand(completion);
								setPaletteIndex(undefined);
								setPaletteOpen(false);
								if (paletteCommands[paletteIndex].instant) {
									props.onSubmit(completion);
								}
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
							{paletteCommands.map(({ name, description }, index) => (
								// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled elsewhere
								<div
									key={name}
									className={`px-2 py-1 !duration-0 ${index === paletteIndex ? 'bg-blue/20 dark:bg-blue/40' : ''}`}
									onClick={() => {
										props.setCommand(`/${name} `);
										setPaletteIndex(undefined);
										setPaletteOpen(false);
									}}
								>
									<strong className="w-16 inline-block">/{name}</strong>{' '}
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
