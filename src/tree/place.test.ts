import { expect, test } from 'vitest';
import { parse } from '../modes/parse';
import { type DrawContext, type PlacedTree, TreePlacer } from './place';
import { toScene } from './scene';

/**
 * Trim irrelevant word data from PlacedTree for the snapshot.
 */
function summarize<C extends DrawContext>(tree: PlacedTree<C>): any {
	return tree.children.length
		? { ...tree, children: tree.children.map(summarize) }
		: tree.label;
}

test('it places trees', () => {
	const measureText = (text: string) => ({ width: text.length * 20 });
	const placer = new TreePlacer({ measureText }, undefined!);
	const tree = parse('gaı jí máq rú hao jí')[0];
	const scene = toScene(tree);
	const placed = placer.placeScene(scene);

	expect(summarize(placed)).toMatchInlineSnapshot(`
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
		                              "label": "*Serial",
		                              "placement": {
		                                "distanceBetweenChildren": 0,
		                                "width": 140,
		                              },
		                              "roof": false,
		                              "source": "gaı",
		                            },
		                            "DP",
		                            "DP",
		                          ],
		                          "denotation": undefined,
		                          "label": "*𝘷P",
		                          "placement": {
		                            "distanceBetweenChildren": 130,
		                            "width": 80,
		                          },
		                          "roof": false,
		                          "source": "gaı jí máq",
		                        },
		                      ],
		                      "denotation": undefined,
		                      "label": "AspP",
		                      "placement": {
		                        "distanceBetweenChildren": 260,
		                        "width": 80,
		                      },
		                      "roof": false,
		                      "source": "gaı jí máq",
		                    },
		                  ],
		                  "denotation": undefined,
		                  "label": "TP",
		                  "placement": {
		                    "distanceBetweenChildren": 200,
		                    "width": 40,
		                  },
		                  "roof": false,
		                  "source": "gaı jí máq",
		                },
		              ],
		              "denotation": undefined,
		              "label": "ΣP",
		              "placement": {
		                "distanceBetweenChildren": 150,
		                "width": 40,
		              },
		              "roof": false,
		              "source": "gaı jí máq",
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
		                                  "label": "*Serial",
		                                  "placement": {
		                                    "distanceBetweenChildren": 0,
		                                    "width": 140,
		                                  },
		                                  "roof": false,
		                                  "source": "hao",
		                                },
		                                "DP",
		                              ],
		                              "denotation": undefined,
		                              "label": "*𝘷P",
		                              "placement": {
		                                "distanceBetweenChildren": 120,
		                                "width": 80,
		                              },
		                              "roof": false,
		                              "source": "hao jí",
		                            },
		                          ],
		                          "denotation": undefined,
		                          "label": "AspP",
		                          "placement": {
		                            "distanceBetweenChildren": 190,
		                            "width": 80,
		                          },
		                          "roof": false,
		                          "source": "hao jí",
		                        },
		                      ],
		                      "denotation": undefined,
		                      "label": "TP",
		                      "placement": {
		                        "distanceBetweenChildren": 165,
		                        "width": 40,
		                      },
		                      "roof": false,
		                      "source": "hao jí",
		                    },
		                  ],
		                  "denotation": undefined,
		                  "label": "ΣP",
		                  "placement": {
		                    "distanceBetweenChildren": 132.5,
		                    "width": 40,
		                  },
		                  "roof": false,
		                  "source": "hao jí",
		                },
		              ],
		              "denotation": undefined,
		              "label": "&'",
		              "placement": {
		                "distanceBetweenChildren": 136.25,
		                "width": 40,
		              },
		              "roof": false,
		              "source": "rú hao jí",
		            },
		          ],
		          "denotation": undefined,
		          "label": "&P",
		          "placement": {
		            "distanceBetweenChildren": 473.125,
		            "width": 40,
		          },
		          "roof": false,
		          "source": "gaı jí máq rú hao jí",
		        },
		      ],
		      "denotation": undefined,
		      "label": "CP",
		      "placement": {
		        "distanceBetweenChildren": 296.5625,
		        "width": 40,
		      },
		      "roof": false,
		      "source": "gaı jí máq rú hao jí",
		    },
		    "SA",
		  ],
		  "denotation": undefined,
		  "label": "SAP",
		  "placement": {
		    "distanceBetweenChildren": 218.28125,
		    "width": 60,
		  },
		  "roof": false,
		  "source": "gaı jí máq rú hao jí",
		}
	`);
});
