import type { SVGProps } from 'react';
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={16}
		height={16}
		viewBox="0 0 16 16"
		{...props}
	>
		<title>Syntax tree</title>
		<g fill="none" stroke="currentColor" strokeWidth={2}>
			<path d="M1,6 l5,-3 l5,3" />
			<path d="M5,12 l5,-3 l5,3" />
		</g>
	</svg>
);
export default SvgComponent;
