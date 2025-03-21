import type { SVGProps } from 'react';
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={16}
		height={16}
		viewBox="0 0 16 16"
		{...props}
	>
		<title>Gloss</title>
		<g fill="none" stroke="currentColor" strokeWidth={2}>
			<path d="M1,6 l3,0 m4,0 l5,0" />
			<path d="M1,10 l5,0 m2,0 l7,0" />
		</g>
	</svg>
);
export default SvgComponent;
