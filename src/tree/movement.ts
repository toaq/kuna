import { repairTones } from '../morphology/tokenize';
import { leafText } from './functions';
import { Leaf } from './types';

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
	const text = (leafText(target) + ' ' + sourceText).trim();
	target.movement.text = repairTones(text);
	source.movement.text = undefined;
}
