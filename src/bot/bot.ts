import {
	AttachmentBuilder,
	ChatInputCommandInteraction,
	Client,
	Interaction,
} from 'discord.js';
import { pngDrawTree } from '../draw-tree';
import { parse } from '../parse';
import { pngGlossSentence } from '../png-gloss';
import { Entry, dictionary } from '../dictionary';
import toaduaDump from '../../data/toadua-dump.json';
import toaduaGlosses from '../../data/toadua-glosses.json';

interface ToaduaEntry {
	head: string;
	body: string;
	user: string;
	scope: string;
	score: number;
}

const toadua = (toaduaDump as any).results as ToaduaEntry[];

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
			} else if (interaction.commandName === 'whodunnit') {
				this.respondWhodunnit(interaction);
			} else if (interaction.commandName === 'quiz') {
				this.respondQuiz(interaction);
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

	private async respondWhodunnit(interaction: ChatInputCommandInteraction) {
		const entries: ToaduaEntry[] = [];
		while (entries.length < 6) {
			const newEntry = choose(
				toadua.filter(
					entry =>
						entry.scope === 'en' &&
						!entry.head.includes(' ') &&
						!entries.some(previous => entry.user === previous.user),
				),
			);
			entries.push(newEntry);
		}
		const authors = entries.map(e => e.user);
		authors.sort();

		const message = await interaction.reply({
			content:
				`Who defined which word? (${authors.join(', ')})\n\n` +
				entries.map((e, i) => `${i + 1}. **${e.head}**`).join('\n') +
				`\n\n(React with an emoji to reveal the answers.)`,
			fetchReply: true,
		});

		message.awaitReactions({ max: 1 }).then(collected => {
			interaction.followUp(
				'Answers:\n\n' +
					entries
						.map((e, i) => `${i + 1}. **${e.head}** ← ${e.user}`)
						.join('\n'),
			);
		});
	}

	private async respondQuiz(interaction: ChatInputCommandInteraction) {
		const n = 3;
		const entries: ToaduaEntry[] = [];

		const mode = interaction.options.getString('mode', false) ?? 'official';
		const author = interaction.options.getString('author', false);

		let ok = (entry: ToaduaEntry) => entry.user === 'official';
		if (author) {
			ok = entry => entry.user === author;
		} else if (mode === 'upvoted') {
			ok = entry => entry.score > 0;
		} else if (mode === 'official_and_upvoted') {
			ok = entry => entry.user === 'official' || entry.score > 0;
		} else if (mode === 'all') {
			ok = entry => true;
		}

		const candidates = toadua.filter(
			entry => entry.scope === 'en' && ok(entry),
		);
		if (candidates.length < 2 * n) {
			await interaction.reply('Not enough words!');
			return;
		}
		while (entries.length < 2 * n) {
			const newEntry = choose(candidates);
			if (entries.includes(newEntry)) continue;
			entries.push(newEntry);
		}

		const message = await interaction.reply({
			content:
				`Quizzing **${
					author ?? mode
				}** words. Translate the following between Toaq and English:\n` +
				entries
					.map((e, i) => `${i + 1}. ${i < n ? e.head : e.body}`)
					.join('\n') +
				`\n\n(React with an emoji to reveal the answers.)`,
			fetchReply: true,
		});

		message.awaitReactions({ max: 1 }).then(collected => {
			interaction.followUp(
				'Answers:\n\n' +
					entries
						.map((e, i) => `${i + 1}. ${i < n ? e.body : e.head}`)
						.join('\n'),
			);
		});
	}
}
