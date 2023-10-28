import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	Interaction,
} from 'discord.js';
import { pngDrawTree } from '../draw-tree';
import { parse } from '../parse';
import { pngGlossSentence } from '../png-gloss';
import { Entry, dictionary } from '../dictionary';
import toaduaDump from '../../data/toadua/dump.json';
import toaduaGlosses from '../../data/toadua/glosses.json';

interface ToaduaEntry {
	head: string;
	body: string;
	user: string;
	scope: string;
	score: number;
}

const toadua = toaduaDump as ToaduaEntry[];

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
		let amount = interaction.options.getInteger('amount', false) ?? 6;
		amount = Math.max(0, Math.min(amount, 10));
		const entries: ToaduaEntry[] = [];
		while (entries.length < amount) {
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

		const questions =
			`Who defined which word? (${authors.join(', ')})\n\n` +
			entries.map((e, i) => `${i + 1}. **${e.head}**`).join('\n');
		const answers =
			'Answers:\n\n' +
			entries.map((e, i) => `${i + 1}. **${e.head}** ← ${e.user}`).join('\n');

		this.hostQuiz(interaction, questions, answers);
	}

	private quizFilter(
		mode: string,
		author: string | null,
	): (entry: ToaduaEntry) => boolean {
		if (author) {
			return entry => entry.user === author;
		} else if (mode === 'upvoted') {
			return entry => entry.score > 0;
		} else if (mode === 'official_and_upvoted') {
			return entry => entry.user === 'official' || entry.score > 0;
		} else if (mode === 'all') {
			return () => true;
		} else {
			return entry => entry.user === 'official';
		}
	}

	private async respondQuiz(interaction: ChatInputCommandInteraction) {
		let r = interaction.options.getInteger('recognition', false) ?? 0;
		let p = interaction.options.getInteger('production', false) ?? 0;
		r = Math.max(0, Math.min(r, 10));
		p = Math.max(0, Math.min(p, 10));
		if (r + p === 0) r = p = 3;

		const mode = interaction.options.getString('mode', false) ?? 'official';
		const author = interaction.options.getString('author', false);
		const ok = this.quizFilter(mode, author);
		const candidates = toadua.filter(e => e.scope === 'en' && ok(e));
		if (candidates.length < r + p) {
			await interaction.reply('Not enough words!');
			return;
		}

		const entries: ToaduaEntry[] = [];
		while (entries.length < r + p) {
			const newEntry = choose(candidates);
			if (entries.includes(newEntry)) continue;
			entries.push(newEntry);
		}

		const questions =
			`Quizzing **${
				author ?? mode
			}** words. Translate the following between Toaq and English:\n` +
			entries.map((e, i) => `${i + 1}. ${i < r ? e.head : e.body}`).join('\n');

		const answers =
			'Answers:\n\n' +
			entries.map((e, i) => `${i + 1}. ${i < r ? e.body : e.head}`).join('\n');

		await this.hostQuiz(interaction, questions, answers);
	}

	private async hostQuiz(
		interaction: ChatInputCommandInteraction,
		questions: string,
		answers: string,
	) {
		const reveal = new ButtonBuilder()
			.setCustomId('reveal')
			.setLabel('Reveal answers')
			.setStyle(ButtonStyle.Primary);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(reveal);

		const message = await interaction.reply({
			content: questions,
			fetchReply: true,
			components: [row],
		});

		message.awaitMessageComponent({ time: 10 * 60_000 }).then(result => {
			message.channel.send(answers);
			result.update({ components: [] });
		});
	}
}
