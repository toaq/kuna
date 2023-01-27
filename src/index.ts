import { expectEOF, expectSingleResult } from 'typescript-parsec';
import { toDocument } from './latex';
import { SAP } from './parse';
import { lexer, preprocess } from './tokenize';
import * as fs from 'fs';
import { alignGlossSentence } from './gloss';

console.log(alignGlossSentence('Ꝡa chum leo fıeq jí sá nıq da.'));

const tree = expectSingleResult(
	expectEOF(
		SAP.parse(preprocess(lexer.parse('Ꝡa chum leo fıeq jí sá nıq da')!)),
	),
);

fs.writeFileSync('output.tex', toDocument(tree));
