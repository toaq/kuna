export function DeleteButton(props: {
	onClick: () => void;
}) {
	return (
		<button
			className="hover:bg-neutral-300 dark:hover:bg-gray-700 px-3 py-2 flex items-center gap-2 cursor-pointer rounded"
			type="button"
			onClick={props.onClick}
		>
			✕
		</button>
	);
}
