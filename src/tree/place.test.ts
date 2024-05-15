import { test, expect } from 'vitest';
import { DrawContext, PlacedTree, TreePlacer } from './place';
import { themes } from './theme';
import { parse } from '../modes/parse';

/**
 * Trim irrelevant word data from PlacedTree for the snapshot.
 */
function summarize<C extends DrawContext>(tree: PlacedTree<C>): any {
	if ('word' in tree) return tree.label;
	else return { ...tree, children: tree.children.map(summarize) };
}

test('it places trees', () => {
	const measureText = (text: string) => ({ width: text.length * 20 });
	const placer = new TreePlacer({ measureText }, undefined!);
	const tree = parse('gaı jí máq rú hao jí')[0];
	expect(summarize(placer.placeTree(tree))).toMatchInlineSnapshot(`
		{
		  "children": [
		    {
		      "children": [
		        "C",
		        {
		          "children": [
		            {
		              "children": [
		                "Σ",
		                {
		                  "children": [
		                    "T",
		                    {
		                      "children": [
		                        "Asp",
		                        {
		                          "children": [
		                            {
		                              "children": [
		                                "V",
		                              ],
		                              "denotation": undefined,
		                              "distanceBetweenChildren": 0,
		                              "label": "*Serial",
		                              "width": 140,
		                            },
		                            "DP",
		                            "DP",
		                          ],
		                          "denotation": undefined,
		                          "distanceBetweenChildren": 130,
		                          "label": "*𝘷P",
		                          "width": 80,
		                        },
		                      ],
		                      "denotation": undefined,
		                      "distanceBetweenChildren": 260,
		                      "label": "AspP",
		                      "width": 80,
		                    },
		                  ],
		                  "denotation": undefined,
		                  "distanceBetweenChildren": 200,
		                  "label": "TP",
		                  "width": 40,
		                },
		              ],
		              "denotation": undefined,
		              "distanceBetweenChildren": 150,
		              "label": "ΣP",
		              "width": 40,
		            },
		            {
		              "children": [
		                "&",
		                {
		                  "children": [
		                    "Σ",
		                    {
		                      "children": [
		                        "T",
		                        {
		                          "children": [
		                            "Asp",
		                            {
		                              "children": [
		                                {
		                                  "children": [
		                                    "V",
		                                  ],
		                                  "denotation": undefined,
		                                  "distanceBetweenChildren": 0,
		                                  "label": "*Serial",
		                                  "width": 140,
		                                },
		                                "DP",
		                              ],
		                              "denotation": undefined,
		                              "distanceBetweenChildren": 120,
		                              "label": "*𝘷P",
		                              "width": 80,
		                            },
		                          ],
		                          "denotation": undefined,
		                          "distanceBetweenChildren": 190,
		                          "label": "AspP",
		                          "width": 80,
		                        },
		                      ],
		                      "denotation": undefined,
		                      "distanceBetweenChildren": 165,
		                      "label": "TP",
		                      "width": 40,
		                    },
		                  ],
		                  "denotation": undefined,
		                  "distanceBetweenChildren": 132.5,
		                  "label": "ΣP",
		                  "width": 40,
		                },
		              ],
		              "denotation": undefined,
		              "distanceBetweenChildren": 136.25,
		              "label": "&'",
		              "width": 40,
		            },
		          ],
		          "denotation": undefined,
		          "distanceBetweenChildren": 473.125,
		          "label": "&P",
		          "width": 40,
		        },
		      ],
		      "denotation": undefined,
		      "distanceBetweenChildren": 296.5625,
		      "label": "CP",
		      "width": 40,
		    },
		    "SA",
		  ],
		  "denotation": undefined,
		  "distanceBetweenChildren": 218.28125,
		  "label": "SAP",
		  "width": 60,
		}
	`);
});
