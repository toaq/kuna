import { useDarkMode } from 'usehooks-ts';
import { Interactive } from './Interactive';
import { Sentences } from './Sentences';
import { Treepad } from './Treepad';
import './App.css';
import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Help } from './Help';

export function Top() {
	const darkMode = useDarkMode();
	const [showHelp, setShowHelp] = useState(false);

	return (
		<>
			<header>
				{/* biome-ignore lint/a11y/useAltText: https://github.com/biomejs/biome/issues/3316 */}
				<img src="./favicon.ico" height="24" aria-hidden />
				<h1>kuna</h1>
				<nav style={{ marginLeft: 10 }}>
					<NavLink to="/">Interactive</NavLink>
					<NavLink to="/sentences">Sentences</NavLink>
					<NavLink to="/treepad">Treepad</NavLink>
				</nav>
				<button
					style={{ marginLeft: 'auto' }}
					type="button"
					onClick={darkMode.toggle}
				>
					Theme
				</button>
				<button type="button" onClick={() => setShowHelp(!showHelp)}>
					Help
				</button>
			</header>
			{showHelp && <Help closeSelf={() => setShowHelp(false)} />}
		</>
	);
}

export function App() {
	const darkMode = useDarkMode();

	return (
		<div className={darkMode.isDarkMode ? 'kuna dark-mode' : 'kuna'}>
			<Top />
			<Routes>
				<Route
					path="/"
					element={<Interactive isDarkMode={darkMode.isDarkMode} />}
				/>
				<Route
					path="/sentences"
					element={<Sentences isDarkMode={darkMode.isDarkMode} />}
				/>
				<Route
					path="/treepad"
					element={<Treepad isDarkMode={darkMode.isDarkMode} />}
				/>
			</Routes>
		</div>
	);
}
