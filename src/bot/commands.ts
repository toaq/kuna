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
	{
		name: 'quiz',
		description: 'Quiz some Toaq vocabulary',
		options: [
			{
				name: 'mode',
				description: 'Which definitions to include in the quiz',
				type: stringType,
				required: false,
				choices: [
					{ name: 'Official', value: 'official' },
					{ name: 'Upvoted', value: 'upvoted' },
					{ name: 'Official and upvoted', value: 'official_and_upvoted' },
					{ name: 'All', value: 'all' },
				],
			},
		],
	},
];
