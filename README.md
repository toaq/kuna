# kuna

Tools for parsing Toaq Delta. Very unfinished.

## Usage

To run as a CLI app:

```sh
npm install
npx ts-node src/index.ts
# e.g.
npx ts-node src/index.ts stree --sentence "Jai jí"
```

To run as a Discord bot:

```sh
export KUNA_TOKEN=your.discord.bot.token
npm install
npx ts-node src/bot.ts
```

To regenerate the grammar:

```sh
npm install
npx nearleyc src/toaq.ne -o src/grammar.ts
```
