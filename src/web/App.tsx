import { useDarkMode } from 'usehooks-ts';
import { Interactive } from './Interactive';
import { Sentences } from './Sentences';
import { Treepad } from './Treepad';
import './App.css';
import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Help } from './Help';
import { Types } from './Types';

export function Top(props: {
	showHelp: boolean;
	setShowHelp: (showHelp: boolean) => void;
}) {
	const darkMode = useDarkMode();
	const navLinkClass = ({ isActive }: { isActive: boolean }) =>
		`${isActive ? 'bg-blue dark:bg-blue-dark font-bold ' : ''}px-3 hover:underline`;

	return (
		<>
			<header className="bg-mio dark:bg-mio-dark flex w-full items-center text-white leading-10 px-3">
				<img src="logo.svg" aria-label="Kúna" width={52} className="mr-3" />
				<nav className="flex">
					<NavLink to="/" className={navLinkClass}>
						Interactive
					</NavLink>
					<NavLink to="/sentences" className={navLinkClass}>
						Sentences
					</NavLink>
					<NavLink to="/treepad" className={navLinkClass}>
						Treepad
					</NavLink>
					<NavLink to="/types" className={navLinkClass}>
						Types
					</NavLink>
				</nav>
				<button
					className="cursor-pointer px-3 hover:underline"
					type="button"
					onClick={darkMode.toggle}
				>
					Theme
				</button>
				<button
					className="cursor-pointer px-3 hover:underline mr-12"
					type="button"
					onClick={() => props.setShowHelp(!props.showHelp)}
				>
					Help
				</button>
			</header>
		</>
	);
}

export function App() {
	const darkMode = useDarkMode();
	const [showHelp, setShowHelp] = useState(false);
	let containerClass = 'kuna w-screen h-screen flex flex-col';
	if (darkMode.isDarkMode) containerClass += ' dark-mode';

	return (
		<div className={containerClass}>
			<Top showHelp={showHelp} setShowHelp={setShowHelp} />
			<main className="flex-1 min-h-0 min-w-0 bg-neutral-50 text-neutral-900 dark:bg-gray-950 dark:text-gray-200">
				{showHelp && <Help closeSelf={() => setShowHelp(false)} />}
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
					<Route
						path="/types"
						element={<Types isDarkMode={darkMode.isDarkMode} />}
					/>
				</Routes>
			</main>
		</div>
	);
}
