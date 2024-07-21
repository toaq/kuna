import { Unimplemented } from '../core/error';
import type { StrictTree } from '../tree';
import type { DTree } from './model';

/**
 * Annotates a tree with denotations.
 */
export function denote(_tree: StrictTree): DTree {
	throw new Unimplemented();
}
