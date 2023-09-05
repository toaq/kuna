import { DTree } from './semantics/model';
import { toLatex as exprToLatex, typeToLatex } from './semantics/render';
import { Tree } from './tree';

export function latexEscape(text: string): string {
	return '{' + text.replace(/Σ/g, '$\\Sigma$') + '}';
}

export function toLatex(tree: Tree | DTree): string {
	let label = latexEscape(tree.label);
	if ('denotation' in tree && tree.denotation !== null) {
		label =
			'{' +
			label +
			'\\ :\\ ' +
			typeToLatex(tree.denotation.type) +
			'\\\\ \\color{den}$' +
			exprToLatex(tree.denotation) +
			'$}';
	}
	if ('left' in tree) {
		const left = toLatex(tree.left);
		const right = toLatex(tree.right);
		return `[${label} ${left} ${right}]`;
	} else if ('children' in tree) {
		const children = tree.children.map(toLatex).join(' ');
		return `[${label} ${children}]`;
	} else {
		if (tree.word === 'covert') {
			return `[${label} [$\\varnothing$]]`;
		}

		const gloss = latexEscape(tree.word.entry?.gloss ?? '?');
		const col = tree.word.entry?.type === 'predicate' ? 'verb' : 'particle';
		const toaq = `\\textsf{\\color{${col}}${tree.word.text}}`;
		const eng = `\\textit{\\color{fg}${gloss}}`;
		return `[${label} [${toaq} \\\\ ${eng}]]`;
	}
}

export function toEnvironment(tree: Tree | DTree): string {
	const latex = toLatex(tree);
	return `\\begin{forest}
${latex}
\\end{forest}`;
}

export function toDocument(trees: (Tree | DTree)[]): string {
	const lightMode = false;
	return `\\documentclass[preview,border=30pt]{standalone}
\\usepackage{amssymb}
\\usepackage{ulem}
\\usepackage{xcolor}
\\usepackage[linguistics]{forest}
\\usepackage{trimclip,graphicx}
\\usepackage{newunicodechar}
%\\newunicodechar{Ꝡ}{W\\hspace{-5.82pt}\\clipbox{0pt 0pt 0pt 4.4pt}{y}}
%\\newunicodechar{ꝡ}{w\\hspace{-5pt}\\clipbox{0pt 0pt 0pt 4.3pt}{y}}
\\newunicodechar{Ꝡ}{W\\hspace{-4.9pt}\\clipbox{0pt 0pt 0pt 4pt}{y}}
\\newunicodechar{ꝡ}{w\\hspace{-4.2pt}\\clipbox{0pt 0pt 0pt 4pt}{y}}
\\newunicodechar{𝘷}{$v$}
\\usetikzlibrary{arrows.meta}
\\tikzset{>={Stealth[width=2mm,length=2mm]}}
\\begin{document}
\\if${lightMode ? 'true' : 'false'}
\\definecolor{bg}{HTML}{FFFFFF}
\\definecolor{fg}{HTML}{000000}
\\definecolor{verb}{HTML}{000000}
\\definecolor{particle}{HTML}{000000}
\\definecolor{other}{HTML}{000000}
\\definecolor{den}{HTML}{000000}
\\else
\\definecolor{bg}{HTML}{36393E}
\\definecolor{fg}{HTML}{DCDDDE}
\\definecolor{verb}{HTML}{99EEFF}
\\definecolor{particle}{HTML}{FFCC88}
\\definecolor{other}{HTML}{DD99FF}
\\definecolor{den}{HTML}{FF4466}
\\fi
\\pagecolor{bg}
\\color{fg}

${trees.map(toEnvironment).join('\n')}
\\end{document}`;
}
