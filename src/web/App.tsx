import { useDarkMode } from 'usehooks-ts';
import { Interactive } from './Interactive';
import { Sentences } from './Sentences';
import { Treepad } from './Treepad';
import './App.css';
import { NavLink, Route, Routes } from 'react-router-dom';

export function App() {
	const darkMode = useDarkMode();

	return (
		<div className={darkMode.isDarkMode ? 'kuna dark-mode' : 'kuna'}>
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
			</header>
			<Routes>
				<Route path="/" element={<Interactive />} />
				<Route path="/sentences" element={<Sentences />} />
				<Route path="/treepad" element={<Treepad />} />
			</Routes>
		</div>
	);
}
