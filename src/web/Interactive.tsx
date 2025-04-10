import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import type { ReactNode } from 'react';
import { Button } from './Button';
import { ErrorBoundary } from './ErrorBoundary';
import { Inspector } from './Inspector';
import { Output } from './Output';
import { type Configuration, Settings } from './Settings';
import { InspectContext } from './inspect';

export function Interactive(props: { isDarkMode: boolean }) {
	const [dismissed, setDismissed] = useLocalStorage(
		'explanationDismissed',
		false,
	);

	const [configuration, setConfiguration] = useState<Configuration>();
	const [inspectee, setInspectee] = useState<ReactNode>();
	const [inspecteePath, setInspecteePath] = useState<string>();

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
				<div className="h-full flex-1 overflow-auto">
					<div className="flex flex-col items-start overflow-auto">
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
						<div className="sticky left-0">
							<Settings
								onSubmit={config => setConfiguration(config)}
								dismissExplanation={() => setDismissed(true)}
							/>
						</div>
						<ErrorBoundary>
							{configuration && (
								<Output
									configuration={configuration}
									isDarkMode={props.isDarkMode}
									inspect={setInspectee}
								/>
							)}
						</ErrorBoundary>
					</div>
				</div>
				<Inspector />
			</div>
		</InspectContext.Provider>
	);
}
