import { useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import type { ReactNode } from 'react';
import { Button } from './Button';
import { Inspector } from './Inspector';
import { InteractionView } from './InteractionView';
import type { Interaction } from './InteractionView';
import type { Configuration } from './Settings';
import TreeIcon from './icons/TreeIcon';
import { InspectContext } from './inspect';

declare const __COMMIT_HASH__: string;
declare const __COMMIT_DATE__: string;

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
				<div
					className="h-full flex-1 overflow-auto scroll-smooth"
					ref={interactionsRef}
				>
					<div className="flex flex-col items-start overflow-hidden">
						<div className="mr-4 ml-8 mt-8">
							<div className="flex flex-row items-top">
								<div>
									<TreeIcon className="mr-3 mt-[2px] h-4 w-4" />
								</div>
								<div>
									Kuna Meırıe, a Toaq Delta parser
									<br />
									version {__COMMIT_HASH__} (
									{new Date(Number(__COMMIT_DATE__) * 1000).toLocaleDateString(
										'en-US',
										{ year: 'numeric', month: 'short', day: 'numeric' },
									)}
									)<br />
									Type <b>/help</b> for more information.
								</div>
							</div>
						</div>
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
							<InteractionView
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
						<InteractionView
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
							scrollToBottom={() => {
								setTimeout(() => {
									if (interactionsRef.current) {
										// Scroll smoothly
										interactionsRef.current.scrollTo({
											top: interactionsRef.current.scrollHeight,
											behavior: 'smooth',
										});
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
