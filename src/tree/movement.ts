import { repairTones } from '../morphology/tokenize';
import { leafText } from './functions';
import { type MovementArrow, type SceneNode, SceneTextStyle } from './scene';
import type { Leaf } from './types';

export type MovementID = number;

export interface Movement {
	/**
	 * A number identifying this leaf for the movement renderer.
	 */
	id: MovementID;
	/**
	 * The id of the leaf this leaf has moved to.
	 */
	movedTo?: MovementID;
	/**
	 * New phonological content of this leaf due to movement.
	 */
	text?: string;
}

let movementId: MovementID = 0;
export function makeMovement(): Movement {
	return { id: movementId++ };
}

/**
 * Move "source" up to "target":
 *
 *          ...                    ...
 *          /                      /
 *         /      ...             /       ...
 *      target    /            target     /
 *        pu     /       =>    pu hao    /
 *            source              ↑   source
 *              hao               │    XXX
 *                                └─────┘
 */
export function moveUp(source: Leaf, target: Leaf) {
	source.movement ??= makeMovement();
	target.movement ??= makeMovement();
	const sourceText = source.movement.text ?? leafText(source);
	source.movement.movedTo = target.movement.id;
	const text = `${leafText(target)} ${sourceText}`.trim();
	target.movement.text = repairTones(text);
	source.movement.text = undefined;
}

/**
 * Move "source" up to "target":
 *
 *          ...                    ...
 *          /                      /
 *         /      ...             /       ...
 *      target    /            target     /
 *        pu     /       =>    pu hao    /
 *            source              ↑   source
 *              hao               │    XXX
 *                                └─────┘
 */
export function moveNodeUp(
	source: SceneNode<any, any>,
	target: SceneNode<any, any>,
): MovementArrow {
	source.id ??= makeMovement().id;
	target.id ??= makeMovement().id;
	const sourceText = source.text;
	source.textStyle = SceneTextStyle.Trace;
	target.textStyle = SceneTextStyle.MovedHere;
	const text = `${target.text} ${sourceText}`.trim();
	target.text = repairTones(text);
	return { from: source.id, to: target.id };
}
