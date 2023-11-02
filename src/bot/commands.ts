const stringType = 3;
const integerType = 4;

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
		name: 'english',
		description: 'Translate Toaq text into English… sorta',
		options: [
			{
				name: 'text',
				description: 'Toaq text to translate',
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
		options: [
			{
				name: 'amount',
				description: 'Amount of definitions (default 6)',
				type: integerType,
				required: false,
			},
		],
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
			{
				name: 'author',
				description: 'Quiz definitions by the given author',
				type: stringType,
				required: false,
			},
			{
				name: 'recognition',
				description: 'Amount of recognition questions (default 3)',
				type: integerType,
				required: false,
			},
			{
				name: 'production',
				description: 'Amount of production questions (default 3)',
				type: integerType,
				required: false,
			},
		],
	},
];
