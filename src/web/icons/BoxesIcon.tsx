import type { SVGProps } from 'react';
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={16}
		height={16}
		viewBox="0 0 16 16"
		{...props}
	>
		<title>Boxes</title>
		<g fill="none" stroke="currentColor" strokeWidth={2}>
			<path d="M1,3 l14,0 l0,10 l-14,0 l0,-6 l6,0 l0,6 l-6,0 Z" />
		</g>
	</svg>
);
export default SvgComponent;
