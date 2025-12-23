import { type CSSProperties, useContext } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InspectContext } from './inspect';

const minSidebarWidth = 350;

export function Inspector() {
	const { inspectee, setInspectee, setInspecteePath } =
		useContext(InspectContext);
	const sidebarRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [isResizing, setIsResizing] = useState(false);
	const [sidebarWidth, setSidebarWidth] = useState(minSidebarWidth);

	const startResizing = useCallback(() => {
		document.body.classList.toggle('moving', true);
		setIsResizing(true);
	}, []);

	const stopResizing = useCallback(() => {
		document.body.classList.toggle('moving', false);
		setIsResizing(false);
	}, []);

	const resize = useCallback(
		(mouseMoveEvent: { clientX: number }) => {
			if (isResizing && sidebarRef.current) {
				setSidebarWidth(
					sidebarRef.current.getBoundingClientRect().right -
						mouseMoveEvent.clientX,
				);
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
			const maxSidebarWidth = window.innerWidth * 0.75;
			setSidebarWidth(
				Math.min(Math.max(contentWidth + 72, minSidebarWidth), maxSidebarWidth),
			);
		}
	}, [inspectee]);

	const open = sidebarWidth >= 100;

	return (
		<div
			className="inspector sticky md:overflow-x-hidden overflow-y-auto md:my-2 md:min-w-[50px] md:w-[var(--sidebar-width)] max-md:max-h-[calc(80svh)] shadow-lg max-md:rounded-t-2xl md:rounded-l-2xl md:border-l-2 border-y-1 border-neutral-200 bg-white dark:border-gray-800 dark:bg-gray-900 transition-[opacity,width] [.moving_&]:transition-none"
			style={
				{
					'--sidebar-width': `${open && inspectee ? sidebarWidth : 50}px`,
				} as unknown as CSSProperties
			}
			ref={sidebarRef}
			onMouseDown={e => {
				const rect = e.currentTarget.getBoundingClientRect();
				if (Math.abs(e.clientX - rect.left) < 20) e.preventDefault();
			}}
		>
			{open && inspectee ? (
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
			) : inspectee ? (
				<button
					type="button"
					className="[writing-mode:vertical-lr] pl-3 h-full text-center cursor-pointer"
					onClick={() => setSidebarWidth(400)}
				>
					Expand
				</button>
			) : undefined}
			{inspectee ? (
				<div
					className="max-md:hidden start-0 top-0 bottom-0 w-6 absolute cursor-ew-resize rounded-l-2xl border-l-1 border-transparent hover:border-current [.moving_&]:border-current transition-colors"
					onMouseDown={startResizing}
				/>
			) : undefined}
		</div>
	);
}
