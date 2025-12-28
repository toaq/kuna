import { type CSSProperties, useContext } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InspectContext } from './inspect';

const naturalWidth = 350;
const minWidth = 180;

export function Inspector() {
	const { inspectee, setInspectee, setInspecteePath } =
		useContext(InspectContext);
	const sidebarRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [isResizing, setIsResizing] = useState(false);
	const [width, setWidth] = useState(naturalWidth);
	const hideInspectee = isResizing && width < minWidth;

	const startResizing = useCallback(() => {
		document.body.classList.toggle('moving', true);
		setIsResizing(true);
	}, []);

	const stopResizing = useCallback(() => {
		document.body.classList.toggle('moving', false);
		setIsResizing(false);
		if (hideInspectee) {
			setInspectee(undefined);
			setInspecteePath(undefined);
		}
	}, [hideInspectee, setInspectee, setInspecteePath]);

	const resize = useCallback(
		(mouseMoveEvent: { clientX: number }) => {
			if (isResizing && sidebarRef.current) {
				const newWidth =
					sidebarRef.current.getBoundingClientRect().right -
					mouseMoveEvent.clientX;
				setWidth(newWidth);
			}
		},
		[isResizing],
	);

	useEffect(() => {
		window.addEventListener('mousemove', resize);
		window.addEventListener('mouseup', stopResizing);
		return () => {
			window.removeEventListener('mousemove', resize);
			window.removeEventListener('mouseup', stopResizing);
		};
	}, [resize, stopResizing]);

	useEffect(() => {
		if (inspectee && contentRef.current) {
			const contentWidth = contentRef.current.scrollWidth;
			const maxWidth = window.innerWidth * 0.75;
			setWidth(Math.min(Math.max(contentWidth + 72, naturalWidth), maxWidth));
		}
	}, [inspectee]);

	return (
		<div
			className="inspector sticky md:overflow-x-hidden overflow-y-auto md:my-2 md:min-w-[32px] md:w-[var(--sidebar-width)] max-md:max-h-[80svh] shadow-lg max-md:rounded-t-2xl md:rounded-l-2xl md:border-l-2 border-y-1 border-neutral-200 bg-white dark:border-gray-800 dark:bg-gray-900 transition-[opacity,width] [.moving_&]:transition-none"
			style={
				{
					'--sidebar-width': `${inspectee && !hideInspectee ? width : 32}px`,
				} as unknown as CSSProperties
			}
			ref={sidebarRef}
			onMouseDown={e => {
				const rect = e.currentTarget.getBoundingClientRect();
				if (Math.abs(e.clientX - rect.left) < 20) e.preventDefault();
			}}
		>
			{inspectee && !hideInspectee && (
				<div className="ps-6">
					<div className="md:w-1000 md:overflow-hidden">
						<div className="w-fit" ref={contentRef}>
							{inspectee}
						</div>
					</div>
					<button
						type="button"
						className="cursor-pointer absolute top-4 end-0 p-4 bg-white dark:bg-gray-900"
						onClick={() => {
							setInspectee(undefined);
							setInspecteePath(undefined);
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width={12}
							height={12}
							viewBox="0 0 16 16"
						>
							<title>Close</title>
							<g fill="none" stroke="currentColor" strokeWidth={2}>
								<path d="M1,1 L14,14 M1,14 L14,1" />
							</g>
						</svg>
					</button>
				</div>
			)}
			{inspectee && (
				<div
					className="max-md:hidden start-0 top-0 bottom-0 w-6 absolute cursor-ew-resize rounded-l-2xl border-l-1 border-transparent hover:border-current [.moving_&]:border-current transition-colors"
					onMouseDown={startResizing}
				/>
			)}
		</div>
	);
}
