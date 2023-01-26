import { Tree } from './parse';

export function latexEscape(text: string): string {
	return text.replace(/Σ/g, '$\\Sigma$');
}

export function toLatex(tree: Tree): string {
	const label = latexEscape(tree.label);
	if ('left' in tree) {
		const left = toLatex(tree.left);
		const right = toLatex(tree.right);
		return `[${label} ${left} ${right}]`;
	} else if ('children' in tree) {
		const children = tree.children.map(toLatex).join(' ');
		return `[${label} ${children}]`;
	} else {
		if (tree.word === 'functional') {
			return `[${label}]`;
		}
		const word = tree.word === 'covert' ? '$\\varnothing$' : tree.word.text;
		return `[${label} [${word}]]`;
	}
}

export function toEnvironment(tree: Tree): string {
	const latex = toLatex(tree);
	return `\\begin{forest}
${latex}
\\end{forest}`;
}

export function toDocument(tree: Tree): string {
	const latex = toLatex(tree);
	return `\\documentclass[preview,border=30pt]{standalone}
\\usepackage{amssymb}
\\usepackage{ulem}
\\usepackage{xcolor}
\\usepackage[linguistics]{forest}
\\usepackage{trimclip,graphicx}
\\usepackage{newunicodechar}
\\newunicodechar{Ꝡ}{W\\hspace{-5.82pt}\\clipbox{0pt 0pt 0pt 4.4pt}{y}}
\\newunicodechar{ꝡ}{w\\hspace{-5pt}\\clipbox{0pt 0pt 0pt 4.3pt}{y}}
\\newunicodechar{𝑣}{$v$}
\\usetikzlibrary{arrows.meta}
\\tikzset{>={Stealth[width=2mm,length=2mm]}}
\\begin{document}
${toEnvironment(tree)}
\\end{document}`;
}
