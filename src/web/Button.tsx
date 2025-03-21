export function Button(props: {
	onClick: () => void;
	icon?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<button className="kuna-button" type="button" onClick={props.onClick}>
			{props.icon}
			{props.children}
		</button>
	);
}
