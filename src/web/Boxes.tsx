import { ReactNode, createContext, useContext } from 'react';
import { useDarkMode } from 'usehooks-ts';
import { BoxClause, BoxSentence, PostField, circled } from '../boxes';
import { Glosser } from '../gloss';
import { Tree } from '../tree';
import './Boxes.css';
import { repairTones } from '../tokenize';

interface BoxesContext {
	cpIndices: Map<Tree, number>;
	subclauses: BoxClause[];
	cpStrategy: 'flat' | 'nest' | 'split';
}

const boxesContext = createContext<BoxesContext>({
	cpIndices: new Map(),
	subclauses: [],
	cpStrategy: 'split',
});

interface BoxProps {
	color: string;
	label: string;
	children: ReactNode;
}

function Box(props: BoxProps) {
	const darkMode = useDarkMode();
	const { color, label, children } = props;
	const other = darkMode.isDarkMode ? '#444 80%' : 'white 80%';
	return (
		<div
			className="boxes-box"
			style={{
				background: `color-mix(in srgb, ${color}, ${other})`,
			}}
		>
			<div className="boxes-label">{label}</div>
			<div className="boxes-children">{children}</div>
		</div>
	);
}

function words(tree: Tree): (string | JSX.Element)[] {
	const context = useContext(boxesContext);
	if ('word' in tree) {
		if (tree.word.covert) {
			return [];
		} else {
			return [tree.word.text];
		}
	} else if ('left' in tree) {
		const cpIndex = context.cpIndices.get(tree);
		if (context.cpStrategy !== 'flat' && cpIndex !== undefined) {
			return context.cpStrategy === 'nest'
				? [<ClauseBox clause={context.subclauses[cpIndex - 1]} />]
				: [circled(cpIndex)];
		}
		return [...words(tree.left), ...words(tree.right)];
	} else {
		return tree.children.flatMap(words);
	}
}

function gluedWords(tree: Tree): (string | JSX.Element)[] {
	const glued: (string | JSX.Element)[] = [];
	for (const w of words(tree)) {
		if (
			typeof w === 'string' &&
			glued.length &&
			typeof glued[glued.length - 1] === 'string'
		) {
			glued[glued.length - 1] = repairTones(
				glued[glued.length - 1] + ' ' + w,
			).trim();
		} else {
			glued.push(w);
		}
	}
	return glued;
}

function Segment(props: { segment: string | JSX.Element }) {
	if (typeof props.segment === 'string') {
		return (
			<div className="boxes-text">
				<div className="boxes-toaq">{props.segment}</div>
				<div className="boxes-english">
					{/\p{Letter}/iu.test(props.segment)
						? new Glosser(true)
								.glossSentence(props.segment)
								.map(x => x.english)
								.join(' ')
						: '\u00a0'}
				</div>
			</div>
		);
	} else {
		return props.segment;
	}
}

function Subtree(props: { tree: Tree }) {
	// const { children } = props;
	// const ch = new Boxifier()
	const children = gluedWords(props.tree);
	return children.map((x, i) => <Segment key={i} segment={x} />);
}

function PostFieldBox(props: { postField: PostField }) {
	const { earlyAdjuncts, arguments: args, lateAdjuncts } = props.postField;
	return (
		<Box color="#ffcc00" label="Post-field">
			{earlyAdjuncts.map((a, i) => (
				<Box key={i} color="purple" label="Adjunct">
					<Subtree tree={a} />
				</Box>
			))}
			{args.map((a, i) => (
				<Box key={i} color="teal" label="Argument">
					<Subtree tree={a} />
				</Box>
			))}
			{lateAdjuncts.map((a, i) => (
				<Box key={i} color="purple" label="Adjunct">
					<Subtree tree={a} />
				</Box>
			))}
		</Box>
	);
}

function ClauseInner(props: { clause: BoxClause }) {
	const { verbalComplex, postField, conjunction } = props.clause;
	return (
		<>
			<Box color="green" label="Verbal complex">
				<Subtree tree={verbalComplex} />
			</Box>
			{postField.earlyAdjuncts.length +
			postField.arguments.length +
			postField.lateAdjuncts.length ? (
				<PostFieldBox postField={postField} />
			) : undefined}
			{conjunction && (
				<>
					<Box color="gray" label="Conjunction">
						<Subtree tree={conjunction.word} />
					</Box>
					<ClauseInner clause={conjunction.clause} />
				</>
			)}
		</>
	);
}

function ClauseBox(props: { clause: BoxClause }) {
	const { complementizer, topic, subject } = props.clause;
	return (
		<Box color="red" label="Clause">
			<Box color="orange" label="Comp.">
				<Subtree tree={complementizer} />
			</Box>
			{topic && (
				<Box color="aqua" label="Topic">
					<Subtree tree={topic} />
				</Box>
			)}
			{subject && (
				<Box color="aqua" label="Subject">
					<Subtree tree={subject} />
				</Box>
			)}
			<ClauseInner clause={props.clause} />
		</Box>
	);
}

export function Boxes(props: {
	main: BoxSentence;
	subclauses: BoxClause[];
	cpIndices: Map<Tree, number>;
	cpStrategy: 'flat' | 'nest' | 'split';
}) {
	const { main, subclauses, cpIndices, cpStrategy } = props;
	const { clause, speechAct } = main;
	const context: BoxesContext = { cpIndices, subclauses, cpStrategy };
	return (
		<boxesContext.Provider value={context}>
			<ol className="boxes-clause-list" start={1}>
				<Box color="blue" label="Sentence">
					<ClauseBox clause={clause} />
					<Box color="gray" label="Speech act">
						<Subtree tree={speechAct} />
					</Box>
				</Box>
				{cpStrategy === 'split' &&
					props.subclauses.map((clause, i) => (
						<li key={i}>
							<div className="boxes-clause-number">{circled(i + 1)}</div>
							<ClauseBox clause={clause} />
						</li>
					))}
			</ol>
		</boxesContext.Provider>
	);
}
