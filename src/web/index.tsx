import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { MathJaxContext } from 'better-react-mathjax';
import { App } from './App';

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
