import { Events, REST, Routes } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { KunaBot } from './bot';
import { commands } from './commands';

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
		GatewayIntentBits.MessageContent,
	],
});

const kunaBot = new KunaBot(client);

client.on(Events.ClientReady, () => {
	console.log(`Logged in as ${client.user?.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
	kunaBot.respond(interaction);
});

client.on(Events.MessageCreate, async message => {
	kunaBot.handleMessage(message);
});

client.login(TOKEN);
