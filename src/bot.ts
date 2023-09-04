import { REST, Routes } from 'discord.js';
import { AttachmentBuilder } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { initializeDictionary } from './dictionary';
import { pngDrawTree } from './draw-tree';
import { parse } from './parse';
import { pngGlossSentence } from './png-gloss';

const stringType = 3;

const commands = [
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
];

const TOKEN = process.env.KUNA_TOKEN!;
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(Routes.applicationCommands(process.env.KUNA_CLIENT_ID!), {
			body: commands,
		});

		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
})();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', () => {
	console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'gloss') {
		const text = interaction.options.getString('text', true);
		const png = pngGlossSentence(text, { easy: false });

		await interaction.reply({
			files: [new AttachmentBuilder(png, { name: 'gloss.png' })],
		});
	} else if (interaction.commandName === 'stree') {
		const text = interaction.options.getString('text', true);
		try {
			const trees = parse(text);

			await interaction.reply({
				content: `Found ${trees.length} parses.`,
				files: trees.map(
					(tree, i) =>
						new AttachmentBuilder(
							pngDrawTree(tree, 'dark').toBuffer('image/png'),
							{
								name: `tree${i}.png`,
							},
						),
				),
			});
		} catch (e) {
			await interaction.reply('Error: \n```\n' + e + '\n```');
			return;
		}
	}
});

initializeDictionary();
client.login(TOKEN);
