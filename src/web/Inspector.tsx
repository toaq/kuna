import { useContext } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { InspectContext } from './inspect';

const minSidebarWidth = 250;

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
				Math.min(Math.max(contentWidth + 48, minSidebarWidth), maxSidebarWidth),
			);
		}
	}, [inspectee]);

	const open = sidebarWidth >= 100;

	return (
		<div
			className="inspector sticky overflow-x-hidden overflow-y-auto shadow bg-white dark:bg-gray-900 transition-[opacity,width] [.moving_&]:transition-none"
			style={{
				width: open && inspectee ? sidebarWidth : 50,
				minWidth: 50,
				opacity: inspectee ? 1 : 1,
			}}
			ref={sidebarRef}
			onMouseDown={e => {
				const rect = e.currentTarget.getBoundingClientRect();
				if (Math.abs(e.clientX - rect.left) < 20) e.preventDefault();
			}}
		>
			{open && inspectee ? (
				<div className="ps-8">
					<div style={{ width: 8000, overflow: 'hidden' }}>
						<div className="w-fit" ref={contentRef}>
							{inspectee}
						</div>
					</div>
					<button
						type="button"
						className="cursor-pointer absolute top-0 end-0 p-4"
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
					className="start-0 top-0 bottom-0 w-3 absolute cursor-ew-resize border-l-1 border-black/25 hover:border-current [.moving_&]:border-current transition-colors"
					onMouseDown={startResizing}
				/>
			) : undefined}
		</div>
	);
}
