import type { CompositionMode } from '../semantics/compose';
import type { DTree, Expr } from '../semantics/model';
import { typeToPlainText } from '../semantics/render';
import { treeChildren } from './functions';
import type { MovementID } from './movement';
import type { Tree } from './types';

export enum SceneTextStyle {
	/**
	 * Render this node's text normally.
	 */
	Plain = 0,
	/**
	 * Highlight this node's text: it contains a result of syntactic movement.
	 */
	MovedHere = 1,
	/**
	 * Strike through this node's text: its phonological content has moved away.
	 */
	Trace = 2,
}

export interface SceneNode<Denotation, Placement> {
	/**
	 * This node's label, e.g. "DP : e".
	 */
	label: string;
	/**
	 * This node's denotation.
	 */
	denotation?: Denotation;
	/**
	 * Whether to draw a roof at this node. If true, the node should not have
	 * any children.
	 */
	roof: boolean;
	/**
	 * This node's text, e.g. "jí".
	 */
	text?: string;
	/**
	 * The style of this node's text, depending on movement.
	 */
	textStyle?: SceneTextStyle;
	/**
	 * This node's gloss, e.g. "1S".
	 */
	gloss?: string;
	/**
	 * This node's children, if any.
	 */
	children: SceneNode<Denotation, Placement>[];
	/**
	 * This node's source, which may be shown in a tooltip, e.g. "Hao … jí"
	 */
	source: string;
	/**
	 * An ID for this node, it's involved in movement. The tree renderer uses
	 * this to draw arrows.
	 */
	id?: MovementID;
	/**
	 * Placement info (width and distance between children) for this node.
	 */
	placement: Placement;
}

export interface MovementArrow {
	from: MovementID;
	to: MovementID;
}

/**
 * A "scene" is a tree and some movement arrows, ready to be placed/rendered.
 *
 * The idea is that while `Tree` is a Toaq syntax, and tracks things like binary
 * branching and dictionary entries, `Scene` is language-agnostic and
 * describes the kind of tree *diagrams* Kuna draws.
 *
 * * `toScene` turns a Toaq syntax `Tree` into `Scene<Expr, Unplaced>`.
 * * The placement algorithm turns that into `Scene<DrawableDenotation, Placed>`.
 * * This is termed `PlacedTree`, and it's what the renderers know how to render.
 */
export interface Scene<Denotation, Placement> {
	root: SceneNode<Denotation, Placement>;
	arrows: MovementArrow[];
}

export type Unplaced = undefined;
export interface Placed {
	width: number;
	distanceBetweenChildren: number;
}

function modeToString(mode: CompositionMode): string {
	return typeof mode === 'string'
		? mode
		: // @ts-ignore TypeScript can't handle the infinite types here
			mode
				.flat(Number.POSITIVE_INFINITY)
				.join(', ');
}

/**
 * Convert a Toaq syntax tree into a renderable "Scene" for the tree-rendering
 * functions to consume.
 */
export function toScene(
	tree: Tree | DTree,
	showMovement = false,
	roofLabels: string[] = [],
): Scene<Expr, Unplaced> {
	const arrows: MovementArrow[] = [];
	function walk(tree: Tree | DTree): SceneNode<Expr, Unplaced> {
		const denotation =
			'denotation' in tree && tree.denotation ? tree.denotation : undefined;
		const label = denotation
			? `${tree.label} : ${typeToPlainText(denotation.type)}${'mode' in tree && tree.mode ? `\n${modeToString(tree.mode)}` : ''}`
			: tree.label;
		const gloss =
			'word' in tree && !tree.word.covert ? tree.word.entry?.gloss : undefined;
		const roof = roofLabels.includes(label);
		const text = roof
			? tree.source
			: 'word' in tree
				? showMovement && tree.movement?.text
					? tree.movement.text
					: tree.word.covert
						? tree.word.value
						: tree.word.text
				: undefined;
		const children = roof ? [] : treeChildren(tree).map(walk);
		const source = tree.source;

		let textStyle = SceneTextStyle.Plain;
		let id: MovementID | undefined = undefined;
		if ('word' in tree && showMovement) {
			id = tree.movement?.id;
			if (tree.movement?.text) {
				textStyle = SceneTextStyle.MovedHere;
			} else if (tree.movement?.movedTo) {
				arrows.push({ from: tree.movement.id, to: tree.movement.movedTo });
				textStyle = SceneTextStyle.Trace;
			}
		}

		return {
			label,
			denotation,
			roof,
			text,
			textStyle,
			gloss,
			children,
			source,
			id,
			placement: undefined,
		};
	}
	const root = walk(tree);
	return { root, arrows };
}
