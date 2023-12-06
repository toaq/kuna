import { useState } from 'react';
import { useDarkMode } from 'usehooks-ts';
import { Main } from './Main';
import { Sentences } from './Sentences';
import './App.css';

export function App() {
	const darkMode = useDarkMode();
	const tools = ['Interactive', 'Sentences'];
	const [tool, setTool] = useState('Interactive');

	return (
		<div className={darkMode.isDarkMode ? 'kuna dark-mode' : 'kuna'}>
			<header>
				<h1>mí Kuna</h1>
				<div style={{ marginLeft: 10 }}>
					{tools.map(t => (
						<button
							className={tool === t ? 'current' : ''}
							id={t}
							onClick={() => setTool(t)}
						>
							{t}
						</button>
					))}
				</div>
				<button style={{ marginLeft: 'auto' }} onClick={darkMode.toggle}>
					Toggle theme
				</button>
			</header>
			{tool === 'Sentences' ? <Sentences /> : <Main />}
		</div>
	);
}
