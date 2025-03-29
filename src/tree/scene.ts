import { typeToPlainText } from '../semantics/render';
import type { CompositionMode, DTree, Expr } from '../semantics/types';
import { treeChildren } from './functions';
import { type MovementID, type Tree, describeLabel } from './types';

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

export interface RichSceneLabelPiece {
	text: string;
	font: string;
	subscript?: boolean;
}

export interface RichSceneLabelLine {
	pieces: RichSceneLabelPiece[];
}

export interface RichSceneLabel {
	lines: RichSceneLabelLine[];
}

export function sceneLabelToString(label: string | RichSceneLabel): string {
	return typeof label === 'string'
		? label
		: label.lines
				.map(line => line.pieces.map(piece => piece.text).join(''))
				.join('\n');
}

export interface SceneNode<Denotation, Placement> {
	/**
	 * This node's display label, e.g. "DP : e".
	 */
	label: string | RichSceneLabel;
	/**
	 * This node's category label, e.g. "DP".
	 */
	categoryLabel: string | RichSceneLabel;
	/**
	 * This node's "full" category label, e.g. "Determiner phrase".
	 */
	fullCategoryLabel: string;
	/**
	 * This node's denotation.
	 */
	denotation?: Denotation;
	/**
	 * This node's composition mode.
	 */
	mode?: CompositionMode;
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
	childrenDx: number[];
}

/**
 * Turn a label like "𝘷Prel" into a list of pieces like:
 *
 *     [
 *         { text: "v", font: italic },
 *         { text: "P", font: regular },
 *         { text: "rel", font: subscript, subscript: true },
 *     ]
 */
function makeRichLabel(
	label: string,
	fonts: {
		regular: string;
		italic: string;
		subscript: string;
	} = {
		regular: 'bold 1em Fira Sans',
		italic: 'italic bold 1em Fira Sans',
		subscript: 'bold 0.8em/0 Fira Sans',
	},
): RichSceneLabelPiece[] {
	const pieces = [];
	const patches: Record<string, string> = { 𝘢: 'a', 𝘯: 'n', 𝘷: 'v' };
	for (const character of label) {
		if (character in patches) {
			pieces.push({ text: patches[character], font: fonts.italic });
		} else if (
			pieces.length &&
			pieces[pieces.length - 1].font === fonts.regular
		) {
			pieces[pieces.length - 1].text += character;
			const last = pieces[pieces.length - 1].text;
			if (last.endsWith('rel')) {
				pieces[pieces.length - 1].text = last.substring(0, last.length - 3);
				pieces.push({ text: 'rel', font: fonts.subscript, subscript: true });
			}
		} else {
			pieces.push({ text: character, font: fonts.regular });
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

	const compactType = typeToPlainText(tree.denotation.type)
		.replaceAll(/(Bind \S+ )+/g, 'B ')
		.replaceAll(/(Ref \S+ )+/g, 'R ');

	return {
		lines: [
			{
				pieces: makeRichLabel(tree.label),
			},
			{
				pieces: [
					{
						text: `${compactType}`,
						font: `0.8em ${font}`,
					},
				],
			},
		],
	};
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
		const mode = 'mode' in tree && tree.mode ? tree.mode : undefined;
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
			categoryLabel: {
				lines: [
					{
						pieces: makeRichLabel(tree.label),
					},
				],
			},
			fullCategoryLabel: describeLabel(tree.label),
			denotation,
			mode,
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
