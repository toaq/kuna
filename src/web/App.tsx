import { useState } from 'react';
import { useDarkMode } from 'usehooks-ts';
import { Main } from './Main';
import { Sentences } from './Sentences';
import './App.css';

export function App() {
	const darkMode = useDarkMode();
	const tools = ['Interactive', 'Browse sentences'];
	const [tool, setTool] = useState('Interactive');

	return (
		<div className={darkMode.isDarkMode ? 'kuna dark-mode' : 'kuna'}>
			<h1>mí Kuna</h1>
			<button onClick={darkMode.toggle}>Toggle theme</button>
			<div>
				{tools.map(t => (
					<label key={t} htmlFor={t}>
						<input
							id={t}
							type="radio"
							checked={tool === t}
							onChange={() => setTool(t)}
						/>{' '}
						{t}
					</label>
				))}
			</div>
			{tool === 'Browse sentences' ? <Sentences /> : <Main />}
		</div>
	);
}
