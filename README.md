# kuna
Tools for parsing Toaq Delta. Very unfinished.

To regenerate the grammar:
```sh
nearleyc src/toaq.ne -o src/grammar.ts
```

To run:
```sh
npm install
npx ts-node src/index.ts
# e.g.
npx ts-node src/index.ts stree --sentence "Jai jí"
```
