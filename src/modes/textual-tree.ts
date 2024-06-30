import type { Tree } from '../tree';

function ttree_converted(data: Tree): { label: string; branches: any } {
	if ('word' in data) {
		const b = data.word.covert ? data.word.value : data.word.text.toLowerCase();
		return { label: data.label, branches: [b] };
	} else if ('left' in data) {
		return {
			label: data.label,
			branches: [ttree_converted(data.left), ttree_converted(data.right)],
		};
	} else {
		return {
			label: data.label,
			branches: data.children.map(ttree_converted),
		};
	}
}

function is_string(v: any) {
	return Object.prototype.toString.call(v) === '[object String]';
}

function textual_tree_of(data: { label: string; branches: any }, pad = '') {
	let r = '';
	let nl_pad: string;
	const l = data.branches.length;
	if (l == 1 && is_string(data.branches[0])) {
		r += '─• ';
		nl_pad = pad + '   ';
		const label = data.label.replace('\n', '\n' + nl_pad);
		r += '\x1b[0m' + label + '\x1b[94m' + ' ';
		r += data.branches[0].replace('\n', '\n' + nl_pad) + '\x1b[0m\n';
		return r;
	} else {
		r += '─┐ ';
		nl_pad = pad + ' │ ';
		const label = data.label.replace('\n', '\n' + nl_pad);
		r += '\x1b[0m' + label + '\x1b[0m' + '\n';
		data.branches.forEach((e: any, i: number) => {
			let a: string, b: string;
			if (i < l - 1) {
				a = ' ├';
				b = ' │';
			} else {
				a = ' └';
				b = '  ';
			}
			r += pad + a + textual_tree_of(e, pad + b);
		});
		return r;
	}
}

export function textual_tree_from_json(data: any) {
	return textual_tree_of(ttree_converted(data));
}
