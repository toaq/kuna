import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import { Output } from './Output';
import { type Configuration, Settings } from './Settings';

export function Interactive() {
	const [dismissed, setDismissed] = useLocalStorage(
		'explanationDismissed',
		false,
	);

	const [configuration, setConfiguration] = useState<Configuration>();

	return (
		<>
			{!dismissed && (
				<div className="card explanation">
					<p>
						This is a parser for the constructed language{' '}
						<a href="https://toaq.net/">Toaq</a>. It can interpret Toaq
						sentences and convert them to a variety of output formats.
					</p>
					<p>
						Write some Toaq in the textbox below, then click one of the buttons
						to see the output.
					</p>
					<button
						className="dismiss"
						type="button"
						onClick={() => setDismissed(true)}
					>
						Dismiss
					</button>
				</div>
			)}
			<Settings
				onSubmit={config => setConfiguration(config)}
				dismissExplanation={() => setDismissed(true)}
			/>
			{configuration && <Output configuration={configuration} />}
		</>
	);
}
