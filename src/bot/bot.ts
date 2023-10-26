import {
	AttachmentBuilder,
	ChatInputCommandInteraction,
	Client,
	Interaction,
} from 'discord.js';
import { pngDrawTree } from '../draw-tree';
import { parse } from '../parse';
import { pngGlossSentence } from '../png-gloss';
import { dictionary } from '../dictionary';

function choose<T>(values: T[]): T {
	return values[(Math.random() * values.length) | 0];
}

export class KunaBot {
	constructor(private client: Client) {}

	public async respond(interaction: Interaction) {
		if (!interaction.isChatInputCommand()) return;
		try {
			if (interaction.commandName === 'gloss') {
				this.respondGloss(interaction);
			} else if (interaction.commandName === 'stree') {
				this.respondStree(interaction);
			} else if (interaction.commandName === 'nuotoa') {
				this.respondNuotoa(interaction);
			} else {
				await interaction.reply(
					`Error: unknown command "${interaction.commandName}"`,
				);
			}
		} catch (e) {
			await interaction.reply('Error: \n```\n' + e + '\n```');
			return;
		}
	}

	private async respondGloss(interaction: ChatInputCommandInteraction) {
		const text = interaction.options.getString('text', true);
		const png = pngGlossSentence(text, { easy: false });

		await interaction.reply({
			files: [new AttachmentBuilder(png, { name: 'gloss.png' })],
		});
	}

	private async respondStree(interaction: ChatInputCommandInteraction) {
		const text = interaction.options.getString('text', true);
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
	}

	private async respondNuotoa(interaction: ChatInputCommandInteraction) {
		const predicates = [];
		for (const entry of dictionary.values()) {
			if (entry.type === 'predicate') {
				predicates.push(entry);
			}
		}
		const lines = [];
		for (let i = 0; i < 5; i++) {
			const a = choose(predicates);
			const b = choose(predicates);
			const oaomo = /^{aeıou}/.test(b.toaq) ? "'" : '';
			const compound = a.toaq + oaomo + b.toaq;
			lines.push(`* **${compound}** (${a.gloss}-${b.gloss})`);
		}
		await interaction.reply(
			'Here are some random compounds:\n\n' + lines.join('\n'),
		);
	}
}
