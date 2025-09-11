import { FC, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { SiteleqType } from '../semantics/render/siteleq';
import { Button } from './Button';

export const Types: FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
	const inputRef = useRef<HTMLInputElement>();
	const outputRef = useRef<HTMLDivElement>();
	const [type, setType] = useState(undefined);
	return (
		<>
			<input className="w-150" type="text" ref={inputRef} />
			<Button
				onClick={() => {
					setType(JSON.parse(inputRef.current.value));
					setTimeout(
						() => navigator.clipboard.writeText(outputRef.current.innerHTML),
						100,
					);
				}}
			>
				Render
			</Button>
			<div ref={outputRef}>
				<SiteleqType t={type} />
			</div>
		</>
	);
};
