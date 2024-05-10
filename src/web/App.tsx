import { useDarkMode } from 'usehooks-ts';
import { Main } from './Main';
import { Sentences } from './Sentences';
import './App.css';
import { NavLink, Route, Routes } from 'react-router-dom';

export function App() {
	const darkMode = useDarkMode();

	return (
		<div className={darkMode.isDarkMode ? 'kuna dark-mode' : 'kuna'}>
			<header>
				<img src="../favicon.ico" height="24" />
				<h1>kuna</h1>
				<nav style={{ marginLeft: 10 }}>
					<NavLink to="/">Interactive</NavLink>
					<NavLink to="/sentences">Sentences</NavLink>
				</nav>
				<button style={{ marginLeft: 'auto' }} onClick={darkMode.toggle}>
					Theme
				</button>
			</header>
			<Routes>
				<Route path="/" element={<Main />} />
				<Route path="/sentences" element={<Sentences />} />
			</Routes>
		</div>
	);
}
