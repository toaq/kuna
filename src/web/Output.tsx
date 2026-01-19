import { type ReactNode, memo } from 'react';
import type { SplitBoxes } from '../modes/boxes';
import type { Gloss } from '../morphology/gloss';

import { keyFor } from '../core/misc';
import type { GfTarget } from '../gf';
import type { ToaqToken } from '../morphology/tokenize';
import type { EarleyItem, EarleyParser } from '../parse/earley';
import type { DETree, Expr } from '../semantics/types';
import { toScene } from '../tree/scene';
import { themes } from '../tree/theme';
import { Boxes } from './Boxes';
import { EarleyTable } from './EarleyTable';
import GfResult from './GfResult';
import { Tokens } from './Tokens';
import { TreeBrowser } from './tree/TreeBrowser';

export type KunaOutput =
	| { type: 'tokens'; tokens: ToaqToken[] }
	| { type: 'gloss'; gloss: Gloss[] }
	| { type: 'english'; english: string }
	| { type: 'gf'; target: GfTarget; gf: string }
	| { type: 'boxes'; strategy: 'flat' | 'nest' | 'split'; boxes: SplitBoxes[] }
	| {
			type: 'tree';
			tree: DETree;
			showMovement: boolean;
			meaningCompact: boolean;
			roofLabels: string[];
	  }
	| { type: 'formula'; expr: Expr; renderer: (e: Expr) => ReactNode }
	| {
			type: 'earley';
			parser: EarleyParser<string, string>;
			table: EarleyItem<string, string>[][];
	  }
	| { type: 'help' }
	// For rendering errors outside of DETree:
	| { type: 'error'; error: unknown };

export interface OutputProps {
	output: KunaOutput;
	isDarkMode: boolean;
}

export const Output = memo<OutputProps>(({ output, isDarkMode }) => {
	switch (output.type) {
		case 'tokens':
			return <Tokens tokens={output.tokens} />;
		case 'gloss':
			return (
				<div className="flex flex-wrap gap-2">
					{output.gloss.map((g, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: order is stable
						<div className="gloss-item" key={i}>
							<div className="font-bold">{g.toaq}</div>
							<div className="text-sm">{g.english}</div>
						</div>
					))}
				</div>
			);
		case 'english':
			return output.english;
		case 'gf':
			return <GfResult gf={output.gf} target={output.target} />;
		case 'boxes':
			return (
				<>
					{output.boxes.map(b => (
						<Boxes
							key={keyFor(b)}
							{...b}
							cpStrategy={output.strategy}
							isDarkMode={isDarkMode}
						/>
					))}
				</>
			);
		case 'tree':
			return (
				<TreeBrowser
					scene={toScene(output.tree, output.showMovement, output.roofLabels)}
					key={new Date().toString()}
					compactDenotations={output.meaningCompact}
					theme={themes[isDarkMode ? 'dark' : 'light']}
					truncateLabels={output.roofLabels}
				/>
			);
		case 'formula':
			return <div className="w-fit">{output.renderer(output.expr)}</div>;
		case 'earley':
			return <EarleyTable parser={output.parser} table={output.table} />;
		case 'help':
			return (
				<div className="px-4 py-2 prose-sm prose-a:text-blue prose-a:dark:text-blue-300 prose-a:hover:underline max-w-prose leading-normal">
					<h2>About Kuna</h2>
					<p>
						Kuna is a parser for the constructed language{' '}
						<a
							href="https://toaq.net"
							target="_blank"
							rel="noopener noreferrer"
						>
							Toaq
						</a>
						. It can parse Toaq sentences and convert them to a variety of
						output formats, including formulas that describe the meaning of the
						sentence.
					</p>
					<p>
						To use Kuna, simply type a Toaq sentence into the textbox below and
						press Enter. Type a slash (/) to bring up a list of other available
						commands. If you don't specify a command, Kuna will repeat the last
						output format used.
					</p>
					<p>
						You can edit old inputs and resubmit them by pressing Enter, or
						delete them with the ✕ button.
					</p>
					<p>
						The current version of Kuna is called Meırıe. You can read about
						which grammar is supported in the{' '}
						<a
							href="https://github.com/toaq/kuna/releases/tag/meirie"
							target="_blank"
							rel="noopener noreferrer"
						>
							release notes
						</a>
						. The source code is available on{' '}
						<a
							href="https://github.com/toaq/kuna"
							target="_blank"
							rel="noopener noreferrer"
						>
							GitHub
						</a>
						.
					</p>
					<p>
						If you'd like to understand the syntax trees and formulas produced
						by Kuna, check out{' '}
						<a href="https://laqme.github.io/koitieq/meiaq/">Méı'aq</a>, an
						introduction to modern Toaqology.
					</p>
				</div>
			);
		case 'error': {
			console.error(output.error);
			return <div className="mx-4 my-2">{`${output.error}`}</div>;
		}
	}
});
