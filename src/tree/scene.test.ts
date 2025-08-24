import { expect, test } from 'vitest';
import { parse } from '../modes/parse';
import { recover } from '../syntax/recover';
import { toScene } from './scene';

test('it turns trees into scenes', () => {
	const tree = parse('hao jí')[0];
	const denoted = recover(tree);
	expect(toScene(denoted, true, ['VP'])).toMatchInlineSnapshot(`
		{
		  "arrows": [
		    {
		      "from": 2,
		      "to": 3,
		    },
		    {
		      "from": 1,
		      "to": 2,
		    },
		    {
		      "from": 0,
		      "to": 1,
		    },
		  ],
		  "root": {
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
		          {
		            "categoryLabel": {
		              "lines": [
		                {
		                  "pieces": [
		                    {
		                      "font": "bold 1em Fira Sans",
		                      "text": "C",
		                    },
		                  ],
		                },
		              ],
		            },
		            "children": [],
		            "denotation": undefined,
		            "fullCategoryLabel": "Complementizer",
		            "gloss": undefined,
		            "id": undefined,
		            "label": "C",
		            "mode": undefined,
		            "placement": undefined,
		            "roof": false,
		            "source": "",
		            "steps": undefined,
		            "text": "∅",
		            "textStyle": 0,
		          },
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
		              {
		                "categoryLabel": {
		                  "lines": [
		                    {
		                      "pieces": [
		                        {
		                          "font": "bold 1em Fira Sans",
		                          "text": "T",
		                        },
		                      ],
		                    },
		                  ],
		                },
		                "children": [],
		                "denotation": undefined,
		                "fullCategoryLabel": "Tense",
		                "gloss": undefined,
		                "id": 3,
		                "label": "T",
		                "mode": undefined,
		                "placement": undefined,
		                "roof": false,
		                "source": "",
		                "steps": undefined,
		                "text": "hao",
		                "textStyle": 1,
		              },
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
		                  {
		                    "categoryLabel": {
		                      "lines": [
		                        {
		                          "pieces": [
		                            {
		                              "font": "bold 1em Fira Sans",
		                              "text": "Asp",
		                            },
		                          ],
		                        },
		                      ],
		                    },
		                    "children": [],
		                    "denotation": undefined,
		                    "fullCategoryLabel": "Aspect",
		                    "gloss": undefined,
		                    "id": 2,
		                    "label": "Asp",
		                    "mode": undefined,
		                    "placement": undefined,
		                    "roof": false,
		                    "source": "",
		                    "steps": undefined,
		                    "text": "∅",
		                    "textStyle": 2,
		                  },
		                  {
		                    "categoryLabel": {
		                      "lines": [
		                        {
		                          "pieces": [
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
		                                  "text": "DP",
		                                },
		                              ],
		                            },
		                          ],
		                        },
		                        "children": [],
		                        "denotation": undefined,
		                        "fullCategoryLabel": "Determiner phrase",
		                        "gloss": "1S",
		                        "id": undefined,
		                        "label": "DP",
		                        "mode": undefined,
		                        "placement": undefined,
		                        "roof": false,
		                        "source": "jí",
		                        "steps": undefined,
		                        "text": "jí",
		                        "textStyle": 0,
		                      },
		                      {
		                        "categoryLabel": {
		                          "lines": [
		                            {
		                              "pieces": [
		                                {
		                                  "font": "italic bold 1em Fira Sans",
		                                  "text": "v",
		                                },
		                                {
		                                  "font": "bold 1em Fira Sans",
		                                  "text": "'",
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
		                                      "font": "italic bold 1em Fira Sans",
		                                      "text": "v",
		                                    },
		                                  ],
		                                },
		                              ],
		                            },
		                            "children": [],
		                            "denotation": undefined,
		                            "fullCategoryLabel": "Light verb",
		                            "gloss": undefined,
		                            "id": 1,
		                            "label": "𝘷",
		                            "mode": undefined,
		                            "placement": undefined,
		                            "roof": false,
		                            "source": "",
		                            "steps": undefined,
		                            "text": "SUBJ",
		                            "textStyle": 2,
		                          },
		                          {
		                            "categoryLabel": {
		                              "lines": [
		                                {
		                                  "pieces": [
		                                    {
		                                      "font": "bold 1em Fira Sans",
		                                      "text": "VP",
		                                    },
		                                  ],
		                                },
		                              ],
		                            },
		                            "children": [],
		                            "denotation": undefined,
		                            "fullCategoryLabel": "Verb phrase",
		                            "gloss": "stuff",
		                            "id": 0,
		                            "label": "VP",
		                            "mode": undefined,
		                            "placement": undefined,
		                            "roof": true,
		                            "source": "hao",
		                            "steps": undefined,
		                            "text": "hao",
		                            "textStyle": 2,
		                          },
		                        ],
		                        "denotation": undefined,
		                        "fullCategoryLabel": "Light verb bar-level",
		                        "gloss": undefined,
		                        "id": undefined,
		                        "label": "𝘷'",
		                        "mode": undefined,
		                        "placement": undefined,
		                        "roof": false,
		                        "source": "hao",
		                        "steps": undefined,
		                        "text": undefined,
		                        "textStyle": 0,
		                      },
		                    ],
		                    "denotation": undefined,
		                    "fullCategoryLabel": "Light verb phrase",
		                    "gloss": undefined,
		                    "id": undefined,
		                    "label": "𝘷P",
		                    "mode": undefined,
		                    "placement": undefined,
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
		                "placement": undefined,
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
		            "placement": undefined,
		            "roof": false,
		            "source": "hao jí",
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
		        "placement": undefined,
		        "roof": false,
		        "source": "hao jí",
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
		                  "text": "SA",
		                },
		              ],
		            },
		          ],
		        },
		        "children": [],
		        "denotation": undefined,
		        "fullCategoryLabel": "Speech act",
		        "gloss": undefined,
		        "id": undefined,
		        "label": "SA",
		        "mode": undefined,
		        "placement": undefined,
		        "roof": false,
		        "source": "",
		        "steps": undefined,
		        "text": "∅",
		        "textStyle": 0,
		      },
		    ],
		    "denotation": undefined,
		    "fullCategoryLabel": "Speech act phrase",
		    "gloss": undefined,
		    "id": undefined,
		    "label": "SAP",
		    "mode": undefined,
		    "placement": undefined,
		    "roof": false,
		    "source": "hao jí",
		    "steps": undefined,
		    "text": undefined,
		    "textStyle": 0,
		  },
		}
	`);
});
