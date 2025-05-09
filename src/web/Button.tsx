export function Button(props: {
	onClick: () => void;
	icon?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<button
			className="bg-slate-300 hover:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-500 px-3 py-2 flex items-center gap-2 cursor-pointer rounded"
			type="button"
			onClick={props.onClick}
		>
			{props.icon}
			{props.children}
		</button>
	);
}
