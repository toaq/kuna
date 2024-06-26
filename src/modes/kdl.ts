import type KDL from 'kdljs';
import { type Tree, treeChildren } from '../tree';

const toStringRecord = <O extends object>(obj: O) => {
	for (const key in obj) {
		if (!Object.hasOwn(obj, key)) continue;
		if (obj[key] === undefined) delete obj[key];
		else (obj as Record<string, string>)[key] = String(obj[key]);
	}
	return obj as { [k in keyof O]: O[k] extends undefined ? never : string };
};

export interface PartialKdlNode {
	name: string;
	values?: any[];
	properties?: Record<string, unknown>;
	children?: PartialKdlNode[];
	tags?: {
		name?: string;
		values?: any[];
		properties?: Record<string, unknown>;
	};
}

export const kdlNode = (partialNode: PartialKdlNode): KDL.Node => ({
	name: partialNode.name,
	values: toStringRecord(partialNode.values ?? []),
	properties: toStringRecord(partialNode.properties ?? {}),
	children: partialNode.children?.map(kdlNode) ?? [],
	tags: {
		// kdljs type stubs define this type too strictly; the API itself does
		// accept undefined here
		name: partialNode.tags?.name ?? (undefined as unknown as string),
		values: toStringRecord(partialNode.tags?.values ?? []),
		properties: toStringRecord(partialNode.tags?.properties ?? {}),
	},
});

export function formatTreeAsKdl(tree: Tree): KDL.Node {
	const children = treeChildren(tree);
	return kdlNode({
		name: tree.label,
		children: children.map(formatTreeAsKdl),
		values:
			'word' in tree
				? ['value' in tree.word ? tree.word.value : tree.word.text]
				: [],
		properties: {
			binding: tree.binding,
			coindex: tree.coindex,
			...('word' in tree ? { movement: tree.movement } : {}),
		},
	});
}
