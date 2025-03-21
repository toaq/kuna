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

export type RichSceneLabelLine = { pieces: { text: string; font: string }[] };
export type RichSceneLabel = { lines: RichSceneLabelLine[] };

export function sceneLabelToString(label: string | RichSceneLabel): string {
	return typeof label === 'string'
		? label
		: label.lines
				.map(line => line.pieces.map(piece => piece.text).join(''))
				.join('\n');
}

export interface SceneNode<Denotation, Placement> {
	/**
	 * This node's label, e.g. "DP : e".
	 */
	label: string | RichSceneLabel;
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
				.join(' ');
}

/**
 * Turn a label like "𝘷P" into a list of pieces like:
 *
 *     [
 *         { text: "v", font: italicFont },
 *         { text: "P", font: regularFont },
 *     ]
 */
function patchItalics(
	label: string,
	regularFont: string,
	italicFont: string,
): { text: string; font: string }[] {
	const pieces = [];
	const patches: Record<string, string> = { 𝘢: 'a', 𝘯: 'n', 𝘷: 'v' };
	for (const character of label) {
		if (character in patches) {
			pieces.push({ text: patches[character], font: italicFont });
		} else if (
			pieces.length &&
			pieces[pieces.length - 1].font === regularFont
		) {
			pieces[pieces.length - 1].text += character;
		} else {
			pieces.push({ text: character, font: regularFont });
		}
	}
	return pieces;
}

/**
 * Create a (possibly rich) label for the given subtree.
 */
function toSceneLabel(
	tree: Tree | DTree,
	font = 'Fira Sans',
): string | RichSceneLabel {
	if (!('denotation' in tree && tree.denotation)) return tree.label;

	const typedLabel: RichSceneLabelLine = {
		pieces: [
			...patchItalics(
				tree.label,
				`bold 14px ${font}`,
				`italic bold 14px ${font}`,
			),
			{
				text: ` : ${typeToPlainText(tree.denotation.type)}`,
				font: `14px ${font}`,
			},
		],
	};

	if (!('mode' in tree && tree.mode)) return { lines: [typedLabel] };

	const modeLabel: RichSceneLabelLine = {
		pieces: [{ text: modeToString(tree.mode), font: `12px ${font}` }],
	};

	return { lines: [typedLabel, modeLabel] };
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
		const gloss =
			'word' in tree && !tree.word.covert ? tree.word.entry?.gloss : undefined;
		const roof = roofLabels.includes(tree.label);
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
			label: toSceneLabel(tree),
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
