import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { App } from './App';
import { MathJaxContext } from 'better-react-mathjax';

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement,
);
root.render(
	<React.StrictMode>
		<MathJaxContext>
			<HashRouter>
				<App />
			</HashRouter>
		</MathJaxContext>
	</React.StrictMode>,
);
