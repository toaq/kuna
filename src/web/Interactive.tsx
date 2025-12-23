import { useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import type { ReactNode } from 'react';
import { Button } from './Button';
import { DeleteButton } from './DeleteButton';
import { ErrorBoundary } from './ErrorBoundary';
import { Inspector } from './Inspector';
import { Output } from './Output';
import type { Configuration } from './Settings';
import { InspectContext } from './inspect';

export interface Interaction {
	id: number;
	command: string;
	configuration?: Configuration;
}

export function ShowInteraction(props: {
	interaction: Interaction;
	current: boolean;
	isDarkMode: boolean;
	setInspectee: (inspectee: ReactNode) => void;
	setCommand: (command: string) => void;
	onSubmit: (input: string) => void;
	delete?: () => void;
}) {
	return (
		<div className="relative gap-2 mx-4 mt-4 p-4 w-full border-gray-300">
			<div className="flex flex-row gap-2 items-baseline">
				({props.interaction.id})
				<input
					type="text"
					className="!bg-transparent !border-t-0 !border-x-0 !border-b-2 focus:!border-blue focus:outline-none"
					value={props.interaction.command}
					onChange={e => {
						props.setCommand(e.currentTarget.value);
					}}
					onKeyDown={e => {
						if (e.key === 'Enter') {
							props.onSubmit(e.currentTarget.value);
						}
					}}
				/>
				{props.delete ? <DeleteButton onClick={props.delete} /> : null}
			</div>
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
	);
}

export function Interactive(props: { isDarkMode: boolean }) {
	const [dismissed, setDismissed] = useLocalStorage(
		'explanationDismissed',
		false,
	);

	const [inspectee, setInspectee] = useState<ReactNode>();
	const [inspecteePath, setInspecteePath] = useState<string>();
	const [currentCommand, setCurrentCommand] = useState<string>('');
	const [pastInteractions, setPastInteractions] = useState<Interaction[]>();
	const [currentId, setCurrentId] = useState<number>(1);
	const interactionsRef = useRef<HTMLDivElement>(null);

	const baseConfiguration: Configuration = {
		treeFormat: 'react',
		roofLabels: '',
		trimNulls: false,
		showMovement: false,
		meaningCompact: true,
		mode: 'semantics-tree',
		text: '',
	};

	return (
		<InspectContext.Provider
			value={{
				inspectee,
				setInspectee,
				inspecteePath,
				setInspecteePath,
			}}
		>
			<div className="h-full flex">
				<div className="h-full flex-1 overflow-auto" ref={interactionsRef}>
					<div className="flex flex-col items-start overflow-hidden">
						{!dismissed && (
							<div className="mx-4 my-2 border rounded max-w-prose py-2 px-4 flex flex-col gap-2 items-start">
								<p>
									This is a parser for the constructed language{' '}
									<a href="https://toaq.net/">Toaq</a>. It can interpret Toaq
									sentences and convert them to a variety of output formats.
								</p>
								<p>
									Write some Toaq in the textbox below — like{' '}
									<strong>Cho jí ní zu da!</strong> — then click one of the
									buttons to see the output.
								</p>
								<Button onClick={() => setDismissed(true)}>Dismiss</Button>
							</div>
						)}
						{pastInteractions?.map((interaction, index) => (
							<ShowInteraction
								key={interaction.id}
								interaction={interaction}
								current={false}
								isDarkMode={props.isDarkMode}
								setInspectee={setInspectee}
								setCommand={command =>
									setPastInteractions(
										pastInteractions?.map((interaction, i) =>
											i === index ? { ...interaction, command } : interaction,
										),
									)
								}
								onSubmit={(command: string) => {
									setPastInteractions(
										pastInteractions?.map((interaction, i) =>
											i === index
												? {
														...interaction,
														configuration: {
															...baseConfiguration,
															text: command,
														},
													}
												: interaction,
										),
									);
								}}
								delete={() => {
									setPastInteractions(
										pastInteractions?.filter((_, i) => i !== index),
									);
								}}
							/>
						))}
						<ShowInteraction
							interaction={{
								id: currentId,
								command: currentCommand,
								configuration: undefined,
							}}
							current={true}
							isDarkMode={props.isDarkMode}
							setInspectee={setInspectee}
							setCommand={command => setCurrentCommand(command)}
							onSubmit={command => {
								setPastInteractions([
									...(pastInteractions ?? []),
									{
										id: currentId,
										command: command,
										configuration: { ...baseConfiguration, text: command },
									},
								]);
								setCurrentCommand('');
								setCurrentId(currentId + 1);
								setTimeout(() => {
									if (interactionsRef.current) {
										interactionsRef.current.scrollTop =
											interactionsRef.current.scrollHeight;
									}
								}, 0);
							}}
						/>
					</div>
				</div>
				<Inspector />
			</div>
		</InspectContext.Provider>
	);
}
