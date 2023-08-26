# kuna

Tools for parsing Toaq Delta. Very unfinished.

For proper PNG rendering, install
[Noto Math Sans](https://fonts.google.com/noto/specimen/Noto+Sans+Math).

## Usage

To run as a CLI app:

```sh
npm install
npm run cli
# e.g.
npm run cli -- tree-text --sentence "Jaı jí"
```

To run as a Discord bot:

```sh
export KUNA_TOKEN=your.discord.bot.token
npm install
npm run bot
```

To regenerate the grammar:

```sh
npm install
npm run codegen
```
