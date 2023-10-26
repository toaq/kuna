import { Events, REST, Routes } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { commands } from './commands';
import { KunaBot } from './bot';

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

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
	],
});

const kunaBot = new KunaBot(client);

client.on(Events.ClientReady, () => {
	console.log(`Logged in as ${client.user?.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
	kunaBot.respond(interaction);
});

client.login(TOKEN);
