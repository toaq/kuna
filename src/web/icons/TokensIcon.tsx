import type { SVGProps } from 'react';
const SvgComponent = (props: SVGProps<SVGSVGElement>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={16}
		height={16}
		viewBox="0 0 16 16"
		{...props}
	>
		<title>Tokens</title>
		<g fill="none" stroke="currentColor" strokeWidth={2}>
			<path d="M2,4 l10,0" />
			<path d="M2,8 l8,0" />
			<path d="M2,12 l12,0" />
		</g>
	</svg>
);
export default SvgComponent;
