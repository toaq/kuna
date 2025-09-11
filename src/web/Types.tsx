import { type FC, useRef, useState } from 'react';
import { MaybeSiteleqType } from '../semantics/render/siteleq';
import { Button } from './Button';

export const Types: FC<{ isDarkMode: boolean }> = () => {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const outputRef = useRef<HTMLDivElement | null>(null);
	const [type, setType] = useState(undefined);
	return (
		<>
			<input className="w-150" type="text" ref={inputRef} />
			<Button
				onClick={() => {
					setType(JSON.parse(inputRef.current!.value));
					setTimeout(
						() => navigator.clipboard.writeText(outputRef.current!.innerHTML),
						100,
					);
				}}
			>
				Render
			</Button>
			<div ref={outputRef}>
				<MaybeSiteleqType t={type} />
			</div>
		</>
	);
};
