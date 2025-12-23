import { useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import type { ReactNode } from 'react';
import { Inspector } from './Inspector';
import { InteractionView } from './InteractionView';
import type { Interaction } from './InteractionView';
import type { Configuration, Mode } from './Settings';
import TreeIcon from './icons/TreeIcon';
import { InspectContext } from './inspect';

declare const __COMMIT_HASH__: string;
declare const __COMMIT_DATE__: string;

export function parseCommand(command: string, lastMode: Mode): Configuration {
	const config: Configuration = {
		treeFormat: 'react',
		roofLabels: '',
		trimNulls: false,
		showMovement: false,
		meaningCompact: false,
		mode: lastMode,
		text: command,
	};

	let m: RegExpMatchArray | null = null;
	m = command.match(/^\/boxes\s+(.*)$/);
	if (m) {
		config.mode = 'boxes-flat';
		config.text = m[1].trim();
	}

	m = command.match(/^\/tree\s+(.*)$/);
	if (m) {
		config.mode = 'semantics-tree';
		config.text = m[1].trim();
	}

	m = command.match(/^\/gloss\s+(.*)$/);
	if (m) {
		config.mode = 'gloss';
		config.text = m[1].trim();
	}

	m = command.match(/^\/tokens\s+(.*)$/);
	if (m) {
		config.mode = 'tokens';
		config.text = m[1].trim();
	}

	m = command.match(/^\/formula\s+(.*)$/);
	if (m) {
		config.mode = 'formula-math';
		config.text = m[1].trim();
	}

	m = command.match(/^\/help/);
	if (m) {
		config.mode = 'help';
		config.text = '';
	}

	return config;
}

export function Interactive(props: { isDarkMode: boolean }) {
	const [inspectee, setInspectee] = useState<ReactNode>();
	const [inspecteePath, setInspecteePath] = useState<string>();
	const [currentCommand, setCurrentCommand] = useState<string>('');
	const [pastInteractions, setPastInteractions] = useState<Interaction[]>();
	const [currentId, setCurrentId] = useState<number>(1);
	const interactionsRef = useRef<HTMLDivElement>(null);
	const [lastMode, setLastMode] = useLocalStorage<Mode>('mode', 'syntax-tree');

	function parseCmd(command: string): Configuration {
		const config = parseCommand(command, lastMode);
		if (config.mode !== 'help') {
			setLastMode(config.mode);
		}
		return config;
	}
	return (
		<InspectContext.Provider
			value={{
				inspectee,
				setInspectee,
				inspecteePath,
				setInspecteePath,
			}}
		>
			<div className="h-full flex flex-col md:flex-row">
				<div
					className="flex-1 overflow-auto scroll-smooth"
					ref={interactionsRef}
				>
					<div className="flex flex-col items-stretch w-full">
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
														configuration: parseCmd(command),
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
										configuration: parseCmd(command),
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
