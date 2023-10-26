const stringType = 3;

export const commands = [
	{
		name: 'gloss',
		description: 'Glosses Toaq text',
		options: [
			{
				name: 'text',
				description: 'Toaq text to gloss',
				type: stringType,
				required: true,
			},
		],
	},
	{
		name: 'stree',
		description: 'Surface Toaq tree',
		options: [
			{
				name: 'text',
				description: 'Toaq text to convert',
				type: stringType,
				required: true,
			},
		],
	},
	{
		name: 'nuotoa',
		description: 'Make some random compounds',
		options: [],
	},
	{
		name: 'whodunnit',
		description: 'Game where we guess who defined which Toadua word',
		options: [],
	},
];
