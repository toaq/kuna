import type { SVGProps } from 'react';
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={16}
		height={16}
		viewBox="0 0 16 16"
		{...props}
	>
		<title>Denoted tree</title>
		<g fill="none" stroke="currentColor" strokeWidth={2}>
			<path d="M1,7 l5,-3 l5,2 m-8,-5 l6,0" />
			<path d="M6,15 l5,-3 l5,2 m-8,-5 l6,0" />
		</g>
	</svg>
);
export default SvgComponent;
