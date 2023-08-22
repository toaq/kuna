import { parse } from './parse';
import { Glosser } from './gloss';
import { inTone } from './tokenize';
import { Branch, Tree, isQuestion } from './tree';
import { Tone } from './types';

interface PostField {
	earlyAdjuncts: string[];
	arguments: string[];
	lateAdjuncts: string[];
}

interface BoxClause {
	/// If empty, means covert "ꝡa"
	complementizer: string;
	topic?: string;
	verbalComplex: string;
	postField: PostField;
}

interface BoxSentence {
	clause: BoxClause;
	/// If empty, means covert "da"
	speechAct: string;
}

function repairTones(text: string): string {
	return text.replace(/◌(.) (\S+)/g, (m, diacritic, word) => {
		const tone = diacritic.charCodeAt() === 0x301 ? Tone.T2 : Tone.T4;
		return inTone(word, tone).normalize();
	});
}

function skipFree(tree: Tree): Tree {
	if (tree.label === 'InterjectionP' && 'left' in tree) {
		return tree.left.label === 'Interjection' ? tree.right : tree.left;
	}
	return tree;
}

function words(tree: Tree): string {
	if ('word' in tree) {
		if (tree.word === 'covert' || tree.word === 'functional') {
			return '';
		} else {
			return tree.word.text;
		}
	} else if ('left' in tree) {
		return repairTones((words(tree.left) + ' ' + words(tree.right)).trim());
	} else {
		return repairTones(tree.children.map(words).join(' ').trim());
	}
}

function boxifyPostField(trees: Tree[]): PostField {
	let sawArgument = false;
	let earlyAdjuncts: string[] = [];
	let arguments_: string[] = [];
	let lateAdjuncts: string[] = [];
	for (const tree of trees) {
		if (tree.label === 'DP' || tree.label === 'CP') {
			arguments_.push(words(tree));
			sawArgument = true;
		} else if (sawArgument) {
			lateAdjuncts.push(words(tree));
		} else {
			earlyAdjuncts.push(words(tree));
		}
	}

	return {
		earlyAdjuncts,
		arguments: arguments_,
		lateAdjuncts,
	};
}

function boxifyClause(tree: Tree): BoxClause {
	let complementizer = '';
	let topic: string | undefined = undefined;
	let verbalComplexWords = [];
	let postField: PostField | undefined = undefined;
	const cp = skipFree(tree);
	if (!('left' in cp)) throw new Error('bad CP?');
	const c = cp.left;
	if (!('word' in c)) throw new Error('C without word?');
	if (c.word !== 'covert' && c.word !== 'functional') {
		complementizer = c.word.text;
	}
	for (let node = cp.right; ; ) {
		if ('children' in node) {
			if (node.label !== '*𝘷P') throw new Error('non-*𝘷P Rose');
			const serial = node.children[0];
			verbalComplexWords.push(words(serial));
			postField = boxifyPostField(node.children.slice(1));
			break;
		} else if ('left' in node) {
			switch (node.label) {
				case 'TopicP':
					topic = words(node.left);
					node = node.right;
					break;
				case "Topic'":
					topic += ' ' + words(node.left);
					node = node.right;
					break;
				case 'ΣP':
				case 'ModalP':
				case 'TP':
				case 'AspP':
				case '𝘷P':
				case "𝘷'":
					const w = words(node.left);
					w && verbalComplexWords.push(w);
					node = node.right;
					break;
				default:
					console.log(node);
					throw new Error('unimplemented: ' + node.label);
			}
		} else {
			throw new Error('unexpected leaf in clause');
		}
	}
	const verbalComplex = verbalComplexWords.join(' ').trim();
	return { complementizer, topic, verbalComplex, postField };
}

export function boxify(tree: Tree): BoxSentence {
	let speechAct: string = '';
	tree = skipFree(tree);
	if (tree.label !== 'SAP') throw new Error('Cannot boxify non-sentence');
	if (!('left' in tree)) throw new Error('bad SAP?');
	const sa = tree.right;
	if (sa.label !== 'SA') throw new Error('SAP without SA?');
	if (!('word' in sa)) throw new Error('SA without word?');
	if (sa.word !== 'covert' && sa.word !== 'functional') {
		speechAct = sa.word.text;
	}
	const cp = tree.left;
	const clause = boxifyClause(cp);
	return { clause, speechAct };
}

export function boxSentenceToMarkdown(
	text: string,
	options: {
		gloss: boolean;
		easy: boolean;
		covert: boolean;
	},
): string {
	const trees = parse(text);
	if (trees.length === 0) return 'No parse';
	if (trees.length > 1) return 'Ambiguous parse';
	const tree = trees[0];
	const boxSentence = boxify(tree);
    const cp = (tree as Branch<Tree>).left!;
	let lines: { title?: string; toaq?: string; indent: number }[] = [];
	const { clause, speechAct } = boxSentence;
	const { complementizer, topic, verbalComplex, postField } = clause;
	const { earlyAdjuncts, arguments: args, lateAdjuncts } = postField;

	if (complementizer || options.covert) {
		lines.push({ title: 'Complementizer', toaq: complementizer, indent: 0 });
	}
	topic && lines.push({ title: 'Topic', toaq: topic, indent: 0 });
	lines.push({ title: 'Verbal complex', toaq: verbalComplex, indent: 0 });
	[earlyAdjuncts, args, lateAdjuncts].forEach((a, i) => {
		const title = ['Adjunct', 'Argument', 'Adjunct'][i];
		if (a.length === 1) {
			lines.push({ title, toaq: a[0], indent: 0 });
		} else if (a.length > 1) {
			lines.push({ title: title + 's', indent: 0 });
			for (const toaq of a) {
				lines.push({ toaq, indent: 2 });
			}
		}
	});
	if (speechAct || options.covert) {
		lines.push({ title: 'Speech act', toaq: speechAct, indent: 0 });
	}

	const glosser = new Glosser(options.easy);

	const markdown = lines.map(x => {
		let line = ' '.repeat(x.indent) + '* ';
		if (x.title) line += `${x.title}: `;
		if (x.toaq !== undefined) {
			line += x.toaq ? `**${x.toaq}**` : '∅';
			if (options.gloss) {
				const underlying =
					x.toaq ||
					(x.title === 'Speech act' ? (isQuestion(cp) ? 'móq' : 'da') : 'ꝡa');
				const glossText = glosser
					.glossSentence(underlying)
					.map(g => g.english.replace(/\\/g, '\\\\'))
					.join(' ');
				line += `  \` ${glossText} \``;
			}
		}
		return line;
	});

	return '**' + text + '**\n' + markdown.join('\n');
}
