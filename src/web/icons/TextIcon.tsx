import type { SVGProps } from 'react';
const SvgComponent = (
	props: { title: string; text: string } & SVGProps<SVGSVGElement>,
) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={16}
		height={16}
		viewBox="0 0 16 16"
		{...props}
	>
		<title>{props.title}</title>
		<text
			fill="currentColor"
			fontWeight="bold"
			textAnchor="middle"
			letterSpacing={0}
			y={13}
			x={8}
		>
			{props.text}
		</text>
	</svg>
);
export default SvgComponent;
