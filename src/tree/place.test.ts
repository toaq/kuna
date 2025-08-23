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
		  "categoryLabel": {
		    "lines": [
		      {
		        "pieces": [
		          {
		            "font": "bold 1em Fira Sans",
		            "text": "SAP",
		          },
		        ],
		      },
		    ],
		  },
		  "children": [
		    {
		      "categoryLabel": {
		        "lines": [
		          {
		            "pieces": [
		              {
		                "font": "bold 1em Fira Sans",
		                "text": "CP",
		              },
		            ],
		          },
		        ],
		      },
		      "children": [
		        "C",
		        {
		          "categoryLabel": {
		            "lines": [
		              {
		                "pieces": [
		                  {
		                    "font": "bold 1em Fira Sans",
		                    "text": "&P",
		                  },
		                ],
		              },
		            ],
		          },
		          "children": [
		            {
		              "categoryLabel": {
		                "lines": [
		                  {
		                    "pieces": [
		                      {
		                        "font": "bold 1em Fira Sans",
		                        "text": "TP",
		                      },
		                    ],
		                  },
		                ],
		              },
		              "children": [
		                "T",
		                {
		                  "categoryLabel": {
		                    "lines": [
		                      {
		                        "pieces": [
		                          {
		                            "font": "bold 1em Fira Sans",
		                            "text": "AspP",
		                          },
		                        ],
		                      },
		                    ],
		                  },
		                  "children": [
		                    "Asp",
		                    {
		                      "categoryLabel": {
		                        "lines": [
		                          {
		                            "pieces": [
		                              {
		                                "font": "bold 1em Fira Sans",
		                                "text": "*",
		                              },
		                              {
		                                "font": "italic bold 1em Fira Sans",
		                                "text": "v",
		                              },
		                              {
		                                "font": "bold 1em Fira Sans",
		                                "text": "P",
		                              },
		                            ],
		                          },
		                        ],
		                      },
		                      "children": [
		                        {
		                          "categoryLabel": {
		                            "lines": [
		                              {
		                                "pieces": [
		                                  {
		                                    "font": "bold 1em Fira Sans",
		                                    "text": "*Serial",
		                                  },
		                                ],
		                              },
		                            ],
		                          },
		                          "children": [
		                            "V",
		                          ],
		                          "denotation": undefined,
		                          "fullCategoryLabel": "Unfixed serial",
		                          "gloss": undefined,
		                          "id": undefined,
		                          "label": "*Serial",
		                          "mode": undefined,
		                          "placement": {
		                            "childrenDx": [
		                              0,
		                            ],
		                            "width": 140,
		                          },
		                          "roof": false,
		                          "source": "gaı",
		                          "steps": undefined,
		                          "text": undefined,
		                          "textStyle": 0,
		                        },
		                        "DP",
		                        "DP",
		                      ],
		                      "denotation": undefined,
		                      "fullCategoryLabel": "Unfixed verb phrase",
		                      "gloss": undefined,
		                      "id": undefined,
		                      "label": "*𝘷P",
		                      "mode": undefined,
		                      "placement": {
		                        "childrenDx": [
		                          -120,
		                          0,
		                          120,
		                        ],
		                        "width": 80,
		                      },
		                      "roof": false,
		                      "source": "gaı jí máq",
		                      "steps": undefined,
		                      "text": undefined,
		                      "textStyle": 0,
		                    },
		                  ],
		                  "denotation": undefined,
		                  "fullCategoryLabel": "Aspect phrase",
		                  "gloss": undefined,
		                  "id": undefined,
		                  "label": "AspP",
		                  "mode": undefined,
		                  "placement": {
		                    "childrenDx": [
		                      -50,
		                      50,
		                    ],
		                    "width": 80,
		                  },
		                  "roof": false,
		                  "source": "gaı jí máq",
		                  "steps": undefined,
		                  "text": undefined,
		                  "textStyle": 0,
		                },
		              ],
		              "denotation": undefined,
		              "fullCategoryLabel": "Tense phrase",
		              "gloss": undefined,
		              "id": undefined,
		              "label": "TP",
		              "mode": undefined,
		              "placement": {
		                "childrenDx": [
		                  -50,
		                  50,
		                ],
		                "width": 40,
		              },
		              "roof": false,
		              "source": "gaı jí máq",
		              "steps": undefined,
		              "text": undefined,
		              "textStyle": 0,
		            },
		            {
		              "categoryLabel": {
		                "lines": [
		                  {
		                    "pieces": [
		                      {
		                        "font": "bold 1em Fira Sans",
		                        "text": "&'",
		                      },
		                    ],
		                  },
		                ],
		              },
		              "children": [
		                "&",
		                {
		                  "categoryLabel": {
		                    "lines": [
		                      {
		                        "pieces": [
		                          {
		                            "font": "bold 1em Fira Sans",
		                            "text": "TP",
		                          },
		                        ],
		                      },
		                    ],
		                  },
		                  "children": [
		                    "T",
		                    {
		                      "categoryLabel": {
		                        "lines": [
		                          {
		                            "pieces": [
		                              {
		                                "font": "bold 1em Fira Sans",
		                                "text": "AspP",
		                              },
		                            ],
		                          },
		                        ],
		                      },
		                      "children": [
		                        "Asp",
		                        {
		                          "categoryLabel": {
		                            "lines": [
		                              {
		                                "pieces": [
		                                  {
		                                    "font": "bold 1em Fira Sans",
		                                    "text": "*",
		                                  },
		                                  {
		                                    "font": "italic bold 1em Fira Sans",
		                                    "text": "v",
		                                  },
		                                  {
		                                    "font": "bold 1em Fira Sans",
		                                    "text": "P",
		                                  },
		                                ],
		                              },
		                            ],
		                          },
		                          "children": [
		                            {
		                              "categoryLabel": {
		                                "lines": [
		                                  {
		                                    "pieces": [
		                                      {
		                                        "font": "bold 1em Fira Sans",
		                                        "text": "*Serial",
		                                      },
		                                    ],
		                                  },
		                                ],
		                              },
		                              "children": [
		                                "V",
		                              ],
		                              "denotation": undefined,
		                              "fullCategoryLabel": "Unfixed serial",
		                              "gloss": undefined,
		                              "id": undefined,
		                              "label": "*Serial",
		                              "mode": undefined,
		                              "placement": {
		                                "childrenDx": [
		                                  0,
		                                ],
		                                "width": 140,
		                              },
		                              "roof": false,
		                              "source": "hao",
		                              "steps": undefined,
		                              "text": undefined,
		                              "textStyle": 0,
		                            },
		                            "DP",
		                          ],
		                          "denotation": undefined,
		                          "fullCategoryLabel": "Unfixed verb phrase",
		                          "gloss": undefined,
		                          "id": undefined,
		                          "label": "*𝘷P",
		                          "mode": undefined,
		                          "placement": {
		                            "childrenDx": [
		                              -60,
		                              60,
		                            ],
		                            "width": 80,
		                          },
		                          "roof": false,
		                          "source": "hao jí",
		                          "steps": undefined,
		                          "text": undefined,
		                          "textStyle": 0,
		                        },
		                      ],
		                      "denotation": undefined,
		                      "fullCategoryLabel": "Aspect phrase",
		                      "gloss": undefined,
		                      "id": undefined,
		                      "label": "AspP",
		                      "mode": undefined,
		                      "placement": {
		                        "childrenDx": [
		                          -50,
		                          50,
		                        ],
		                        "width": 80,
		                      },
		                      "roof": false,
		                      "source": "hao jí",
		                      "steps": undefined,
		                      "text": undefined,
		                      "textStyle": 0,
		                    },
		                  ],
		                  "denotation": undefined,
		                  "fullCategoryLabel": "Tense phrase",
		                  "gloss": undefined,
		                  "id": undefined,
		                  "label": "TP",
		                  "mode": undefined,
		                  "placement": {
		                    "childrenDx": [
		                      -50,
		                      50,
		                    ],
		                    "width": 40,
		                  },
		                  "roof": false,
		                  "source": "hao jí",
		                  "steps": undefined,
		                  "text": undefined,
		                  "textStyle": 0,
		                },
		              ],
		              "denotation": undefined,
		              "fullCategoryLabel": "Conjunction bar-level",
		              "gloss": undefined,
		              "id": undefined,
		              "label": "&'",
		              "mode": undefined,
		              "placement": {
		                "childrenDx": [
		                  -50,
		                  50,
		                ],
		                "width": 40,
		              },
		              "roof": false,
		              "source": "rú hao jí",
		              "steps": undefined,
		              "text": undefined,
		              "textStyle": 0,
		            },
		          ],
		          "denotation": undefined,
		          "fullCategoryLabel": "Conjunction phrase",
		          "gloss": undefined,
		          "id": undefined,
		          "label": "&P",
		          "mode": undefined,
		          "placement": {
		            "childrenDx": [
		              -140,
		              140,
		            ],
		            "width": 40,
		          },
		          "roof": false,
		          "source": "gaı jí máq rú hao jí",
		          "steps": undefined,
		          "text": undefined,
		          "textStyle": 0,
		        },
		      ],
		      "denotation": undefined,
		      "fullCategoryLabel": "Complementizer phrase",
		      "gloss": undefined,
		      "id": undefined,
		      "label": "CP",
		      "mode": undefined,
		      "placement": {
		        "childrenDx": [
		          -50,
		          50,
		        ],
		        "width": 40,
		      },
		      "roof": false,
		      "source": "gaı jí máq rú hao jí",
		      "steps": undefined,
		      "text": undefined,
		      "textStyle": 0,
		    },
		    "SA",
		  ],
		  "denotation": undefined,
		  "fullCategoryLabel": "Speech act phrase",
		  "gloss": undefined,
		  "id": undefined,
		  "label": "SAP",
		  "mode": undefined,
		  "placement": {
		    "childrenDx": [
		      -50,
		      50,
		    ],
		    "width": 60,
		  },
		  "roof": false,
		  "source": "gaı jí máq rú hao jí",
		  "steps": undefined,
		  "text": undefined,
		  "textStyle": 0,
		}
	`);
});
