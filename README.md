# kuna

Tools for parsing Toaq Delta. Very unfinished.

For proper PNG rendering, install
[Noto Sans Math](https://fonts.google.com/noto/specimen/Noto+Sans+Math).

## Usage

To run as a web app (at <http://localhost:5173/>):

```sh
npm install
npm run web -- --port 5173
```

To run as a CLI app:

```sh
npm install
npm run cli
# e.g.
npm run cli -- tree-text --sentence "Jaı jí"
```

To run as a Discord bot:

```sh
export KUNA_CLIENT_ID=your.discord.client.id
export KUNA_TOKEN=your.discord.bot.token
npm install
npm run bot
```
